import { DiaryEntry, TopicPage, TopicPageSummary } from "@notes/shared";
import {
  getLocalDiaryEntryByDate,
  upsertLocalDiaryEntry,
  getLocalTopics,
  getLocalTopicById,
  upsertLocalTopic,
  enqueueSyncAction,
  OfflineDiaryEntry,
  OfflineTopicPage,
} from "./localDatabase";
import { syncService } from "./syncService";
import { networkService } from "./network";
import { api } from "./api";

export const diaryRepository = {
  /**
   * Fetch daily entry by dateKey (YYYY-MM-DD) from local storage first.
   * If online, also checks server in background to keep data fresh.
   */
  async getEntryByDate(dateKey: string): Promise<OfflineDiaryEntry | null> {
    const localEntry = await getLocalDiaryEntryByDate(dateKey);

    if (networkService.online) {
      api
        .get(`/diary/entries/by-date/${dateKey}`)
        .then(async (res) => {
          if (res.data.data) {
            const serverEntry = res.data.data;
            const current = await getLocalDiaryEntryByDate(dateKey);
            // Don't overwrite if local changes are pending sync
            if (!current || current._syncStatus !== "pending") {
              await upsertLocalDiaryEntry({
                ...serverEntry,
                _syncStatus: "synced",
              });
            }
          }
        })
        .catch(() => {});
    }

    return localEntry;
  },

  /**
   * Save daily diary entry locally and queue sync to cloud
   */
  async saveEntry(
    dateKey: string,
    content: string,
    timezone: string = "UTC",
  ): Promise<OfflineDiaryEntry> {
    const existing = await getLocalDiaryEntryByDate(dateKey);
    const now = new Date().toISOString();
    const entryId =
      existing?.id ||
      `diary_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const entry: OfflineDiaryEntry = {
      id: entryId,
      userId: existing?.userId || "local_user",
      dateKey,
      content,
      timezone,
      topics: existing?.topics || [],
      topicUpdates: existing?.topicUpdates || [],
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      _syncStatus: "pending",
      _localUpdatedAt: Date.now(),
    };

    await upsertLocalDiaryEntry(entry);

    await enqueueSyncAction({
      action: "SAVE_DIARY_ENTRY",
      entityId: entryId,
      payload: {
        dateKey,
        content,
        timezone,
      },
    });

    await syncService.updatePendingCount();

    if (networkService.online) {
      syncService.sync().catch(() => {});
    }

    return entry;
  },

  /**
   * Get all topic pages from local storage
   */
  async getTopics(search?: string): Promise<OfflineTopicPage[]> {
    const topics = await getLocalTopics();

    if (networkService.online) {
      syncService.sync().catch(() => {});
    }

    if (!search?.trim()) return topics;
    const q = search.toLowerCase();
    return topics.filter((t) => (t.title || "").toLowerCase().includes(q));
  },

  /**
   * Get topic by ID
   */
  async getTopicById(id: string): Promise<OfflineTopicPage | null> {
    return getLocalTopicById(id);
  },

  /**
   * Create a new topic page offline and queue sync
   */
  async createTopic(title: string): Promise<OfflineTopicPage> {
    const now = new Date().toISOString();
    const tempId = `topic_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newTopic: OfflineTopicPage = {
      id: tempId,
      userId: "local_user",
      title,
      content: "",
      diaryDates: [],
      diaryEntryCount: 0,
      createdAt: now,
      updatedAt: now,
      _syncStatus: "pending",
      _localUpdatedAt: Date.now(),
    };

    await upsertLocalTopic(newTopic);

    await enqueueSyncAction({
      action: "CREATE_TOPIC",
      entityId: tempId,
      payload: { title },
    });

    await syncService.updatePendingCount();

    if (networkService.online) {
      syncService.sync().catch(() => {});
    }

    return newTopic;
  },

  /**
   * Update topic content or title
   */
  async updateTopic(
    id: string,
    updates: { title?: string; content?: string },
  ): Promise<OfflineTopicPage | null> {
    const existing = await getLocalTopicById(id);
    if (!existing) return null;

    const updated: OfflineTopicPage = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
      _syncStatus: "pending",
      _localUpdatedAt: Date.now(),
    };

    await upsertLocalTopic(updated);

    await enqueueSyncAction({
      action: "UPDATE_TOPIC",
      entityId: id,
      payload: updates,
    });

    await syncService.updatePendingCount();

    if (networkService.online) {
      syncService.sync().catch(() => {});
    }

    return updated;
  },

  /**
   * Link topic to diary entry
   */
  async linkTopic(
    entryId: string,
    params: { topicId?: string; newTopicTitle?: string },
  ): Promise<void> {
    await enqueueSyncAction({
      action: "LINK_TOPIC",
      entityId: entryId,
      payload: params,
    });

    await syncService.updatePendingCount();

    if (networkService.online) {
      syncService.sync().catch(() => {});
    }
  },
};
