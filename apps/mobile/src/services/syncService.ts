import { api } from "./api";
import { networkService } from "./network";
import { getItem } from "./storage";
import {
  getSyncQueue,
  removeSyncAction,
  saveSyncQueue,
  getLocalNotes,
  saveLocalNotes,
  updateLocalNoteId,
  saveLocalFolders,
  getLocalDiaryEntries,
  saveLocalDiaryEntries,
  getLocalTopics,
  saveLocalTopics,
  updateLocalTopicId,
  getLastSyncTime,
  setLastSyncTime,
  SyncQueueItem,
  OfflineNote,
  OfflineDiaryEntry,
  OfflineTopicPage,
} from "./localDatabase";
import { Note, NoteFolder, TopicPage } from "@notes/shared";

export interface SyncStatusState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
}

type SyncListener = (state: SyncStatusState) => void;

class SyncService {
  private isSyncing: boolean = false;
  private pendingCount: number = 0;
  private lastSyncedAt: string | null = null;
  private listeners: Set<SyncListener> = new Set();
  private autoSyncTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    this.lastSyncedAt = await getLastSyncTime();
    const queue = await getSyncQueue();
    this.pendingCount = queue.length;

    // Listen to network changes
    networkService.addListener((isOnline) => {
      this.notifyListeners();
      if (isOnline) {
        // Trigger auto-sync when back online
        if (this.autoSyncTimer) clearTimeout(this.autoSyncTimer);
        this.autoSyncTimer = setTimeout(() => {
          this.sync();
        }, 1500);
      }
    });
  }

  public getStatus(): SyncStatusState {
    return {
      isOnline: networkService.online,
      isSyncing: this.isSyncing,
      pendingCount: this.pendingCount,
      lastSyncedAt: this.lastSyncedAt,
    };
  }

  public addListener(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const status = this.getStatus();
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (err) {
        console.warn("[SyncService] Listener error:", err);
      }
    });
  }

  public async updatePendingCount() {
    const queue = await getSyncQueue();
    this.pendingCount = queue.length;
    this.notifyListeners();
  }

  /**
   * Main sync function: drains local queue to server, then pulls down updates.
   */
  public async sync(): Promise<{ success: boolean; error?: string }> {
    if (this.isSyncing) {
      return { success: false, error: "Sync already in progress" };
    }
    if (!networkService.online) {
      return { success: false, error: "Device is offline" };
    }

    const tokensStr = await getItem("auth_tokens");
    if (!tokensStr) {
      return { success: false, error: "Not authenticated" };
    }

    this.isSyncing = true;
    this.notifyListeners();

    try {
      // 1. Drain the offline queue
      await this.drainQueue();

      // 2. Pull down fresh data from server
      await this.pullFromServer();

      // 3. Update sync timestamp
      const nowIso = new Date().toISOString();
      this.lastSyncedAt = nowIso;
      await setLastSyncTime(nowIso);

      return { success: true };
    } catch (err: any) {
      console.warn("[SyncService] Sync error:", err.message || err);
      return { success: false, error: err.message || "Sync failed" };
    } finally {
      this.isSyncing = false;
      const queue = await getSyncQueue();
      this.pendingCount = queue.length;
      this.notifyListeners();
    }
  }

  /**
   * Push queued local changes to the cloud API
   */
  private async drainQueue(): Promise<void> {
    const queue = await getSyncQueue();
    if (queue.length === 0) return;

    // Track ID substitutions for newly created notes/topics
    const idMap: Record<string, string> = {};

    for (const item of [...queue]) {
      try {
        // Resolve entity ID if it was created in a previous queue step
        const resolvedEntityId = idMap[item.entityId] || item.entityId;

        switch (item.action) {
          case "CREATE_NOTE": {
            const res = await api.post("/notes", item.payload);
            const serverNote = res.data.data;
            if (serverNote?.id) {
              idMap[item.entityId] = serverNote.id;
              await updateLocalNoteId(item.entityId, serverNote.id);
            }
            break;
          }

          case "UPDATE_NOTE": {
            await api.patch(`/notes/${resolvedEntityId}`, item.payload);
            const notes = await getLocalNotes();
            const note = notes.find((n) => n.id === resolvedEntityId);
            if (note) {
              note._syncStatus = "synced";
              await saveLocalNotes(notes);
            }
            break;
          }

          case "DELETE_NOTE": {
            await api.delete(`/notes/${resolvedEntityId}`);
            break;
          }

          case "PIN_NOTE": {
            await api.patch(`/notes/${resolvedEntityId}/pin`);
            break;
          }

          case "ARCHIVE_NOTE": {
            await api.patch(`/notes/${resolvedEntityId}/archive`);
            break;
          }

          case "RESTORE_NOTE": {
            await api.patch(`/notes/${resolvedEntityId}/restore`);
            break;
          }

          case "SAVE_DIARY_ENTRY": {
            const res = await api.post("/diary/entries", item.payload);
            const entry = res.data.data;
            if (entry) {
              const entries = await getLocalDiaryEntries();
              if (entries[item.payload.dateKey]) {
                entries[item.payload.dateKey] = {
                  ...entries[item.payload.dateKey],
                  id: entry.id,
                  _syncStatus: "synced",
                };
                await saveLocalDiaryEntries(entries);
              }
            }
            break;
          }

          case "CREATE_TOPIC": {
            const res = await api.post("/diary/topics", item.payload);
            const serverTopic = res.data.data;
            if (serverTopic?.id) {
              idMap[item.entityId] = serverTopic.id;
              await updateLocalTopicId(item.entityId, serverTopic.id);
            }
            break;
          }

          case "UPDATE_TOPIC": {
            await api.patch(`/diary/topics/${resolvedEntityId}`, item.payload);
            break;
          }

          case "LINK_TOPIC": {
            const entryId = idMap[item.entityId] || item.entityId;
            await api.post(`/diary/entries/${entryId}/topics`, item.payload);
            break;
          }

          case "UNLINK_TOPIC": {
            const entryId = idMap[item.payload.entryId] || item.payload.entryId;
            const topicId = idMap[item.payload.topicId] || item.payload.topicId;
            await api.delete(`/diary/entries/${entryId}/topics/${topicId}`);
            break;
          }

          default:
            break;
        }

        // Successfully executed, remove from queue
        await removeSyncAction(item.id);
      } catch (opErr: any) {
        console.warn(
          `[SyncService] Failed to execute action ${item.action}:`,
          opErr.message || opErr,
        );
        // If 404 or unrecoverable client error (4xx except 408/429), remove item to avoid blocking queue
        const status = opErr.response?.status;
        if (status === 404 || status === 400 || status === 422) {
          await removeSyncAction(item.id);
        } else {
          // Increment retry count
          item.retryCount = (item.retryCount || 0) + 1;
          if (item.retryCount >= 5) {
            await removeSyncAction(item.id);
          }
          // Stop queue processing on network/server errors
          break;
        }
      }
    }
  }

  /**
   * Pull all latest notes, folders, and diary topics from the server
   */
  private async pullFromServer(): Promise<void> {
    try {
      // 1. Pull Notes
      const notesRes = await api.get("/notes?status=active&limit=200");
      const serverNotes: Note[] = notesRes.data.data?.items || [];
      const localNotes = await getLocalNotes();

      // Merge: Keep locally pending notes untouched, merge new/updated server notes
      const mergedNotes: OfflineNote[] = [...localNotes];
      for (const sNote of serverNotes) {
        const localIdx = mergedNotes.findIndex((n) => n.id === sNote.id);
        if (localIdx >= 0) {
          // Only overwrite if local is NOT pending sync
          if (mergedNotes[localIdx]._syncStatus !== "pending") {
            mergedNotes[localIdx] = { ...sNote, _syncStatus: "synced" };
          }
        } else {
          mergedNotes.push({ ...sNote, _syncStatus: "synced" });
        }
      }
      await saveLocalNotes(mergedNotes);

      // 2. Pull Folders
      const foldersRes = await api.get("/folders");
      const serverFolders: NoteFolder[] = foldersRes.data.data || [];
      await saveLocalFolders(serverFolders);

      // 3. Pull Topics
      const topicsRes = await api.get("/diary/topics?limit=200");
      const serverTopics: TopicPage[] = topicsRes.data.data?.items || [];
      const localTopics = await getLocalTopics();

      const mergedTopics: OfflineTopicPage[] = [...localTopics];
      for (const sTopic of serverTopics) {
        const localIdx = mergedTopics.findIndex((t) => t.id === sTopic.id);
        if (localIdx >= 0) {
          if (mergedTopics[localIdx]._syncStatus !== "pending") {
            mergedTopics[localIdx] = { ...sTopic, _syncStatus: "synced" };
          }
        } else {
          mergedTopics.push({ ...sTopic, _syncStatus: "synced" });
        }
      }
      await saveLocalTopics(mergedTopics);
    } catch (pullErr: any) {
      console.warn("[SyncService] Pull error:", pullErr.message || pullErr);
    }
  }
}

export const syncService = new SyncService();
