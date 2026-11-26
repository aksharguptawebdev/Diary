import AsyncStorage from "@react-native-async-storage/async-storage";
import { Note, NoteFolder, DiaryEntry, TopicPage } from "@notes/shared";

export interface OfflineNote extends Note {
  _syncStatus?: "synced" | "pending";
  _localUpdatedAt?: number;
}

export interface OfflineDiaryEntry extends DiaryEntry {
  _syncStatus?: "synced" | "pending";
  _localUpdatedAt?: number;
}

export interface OfflineTopicPage extends TopicPage {
  _syncStatus?: "synced" | "pending";
  _localUpdatedAt?: number;
}

export type SyncActionType =
  | "CREATE_NOTE"
  | "UPDATE_NOTE"
  | "DELETE_NOTE"
  | "PIN_NOTE"
  | "ARCHIVE_NOTE"
  | "RESTORE_NOTE"
  | "SAVE_DIARY_ENTRY"
  | "DELETE_DIARY_ENTRY"
  | "CREATE_TOPIC"
  | "UPDATE_TOPIC"
  | "DELETE_TOPIC"
  | "LINK_TOPIC"
  | "UNLINK_TOPIC"
  | "CREATE_FOLDER"
  | "DELETE_FOLDER";

export interface SyncQueueItem {
  id: string;
  action: SyncActionType;
  entityId: string;
  payload?: any;
  timestamp: number;
  retryCount?: number;
}

const KEYS = {
  NOTES: "@offline_notes",
  FOLDERS: "@offline_folders",
  DIARY_ENTRIES: "@offline_diary_entries",
  TOPICS: "@offline_topics",
  SYNC_QUEUE: "@offline_sync_queue",
  LAST_SYNC: "@offline_last_sync_timestamp",
  CUSTOM_SERVER_URL: "@offline_custom_server_url",
};

// Safe JSON helper
async function getJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[LocalDB] Error reading key ${key}:`, err);
    return fallback;
  }
}

async function setJson<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`[LocalDB] Error saving key ${key}:`, err);
  }
}

/* ==================== NOTES ==================== */

export async function getLocalNotes(): Promise<OfflineNote[]> {
  return getJson<OfflineNote[]>(KEYS.NOTES, []);
}

export async function saveLocalNotes(notes: OfflineNote[]): Promise<void> {
  await setJson(KEYS.NOTES, notes);
}

export async function getLocalNoteById(
  id: string,
): Promise<OfflineNote | null> {
  const notes = await getLocalNotes();
  return notes.find((n) => n.id === id) || null;
}

export async function upsertLocalNote(note: OfflineNote): Promise<void> {
  const notes = await getLocalNotes();
  const index = notes.findIndex((n) => n.id === note.id);
  if (index >= 0) {
    notes[index] = { ...notes[index], ...note };
  } else {
    notes.unshift(note);
  }
  await saveLocalNotes(notes);
}

export async function removeLocalNote(id: string): Promise<void> {
  const notes = await getLocalNotes();
  const filtered = notes.filter((n) => n.id !== id);
  await saveLocalNotes(filtered);
}

export async function updateLocalNoteId(
  oldId: string,
  newId: string,
): Promise<void> {
  const notes = await getLocalNotes();
  const note = notes.find((n) => n.id === oldId);
  if (note) {
    note.id = newId;
    note._syncStatus = "synced";
    await saveLocalNotes(notes);
  }
}

/* ==================== FOLDERS ==================== */

export async function getLocalFolders(): Promise<NoteFolder[]> {
  return getJson<NoteFolder[]>(KEYS.FOLDERS, []);
}

export async function saveLocalFolders(folders: NoteFolder[]): Promise<void> {
  await setJson(KEYS.FOLDERS, folders);
}

export async function upsertLocalFolder(folder: NoteFolder): Promise<void> {
  const folders = await getLocalFolders();
  const idx = folders.findIndex((f) => f.id === folder.id);
  if (idx >= 0) {
    folders[idx] = folder;
  } else {
    folders.push(folder);
  }
  await saveLocalFolders(folders);
}

/* ==================== DIARY ENTRIES ==================== */

export async function getLocalDiaryEntries(): Promise<
  Record<string, OfflineDiaryEntry>
> {
  return getJson<Record<string, OfflineDiaryEntry>>(KEYS.DIARY_ENTRIES, {});
}

export async function saveLocalDiaryEntries(
  entries: Record<string, OfflineDiaryEntry>,
): Promise<void> {
  await setJson(KEYS.DIARY_ENTRIES, entries);
}

export async function getLocalDiaryEntryByDate(
  dateKey: string,
): Promise<OfflineDiaryEntry | null> {
  const entries = await getLocalDiaryEntries();
  return entries[dateKey] || null;
}

export async function upsertLocalDiaryEntry(
  entry: OfflineDiaryEntry,
): Promise<void> {
  const entries = await getLocalDiaryEntries();
  entries[entry.dateKey] = {
    ...(entries[entry.dateKey] || {}),
    ...entry,
    _localUpdatedAt: Date.now(),
  };
  await saveLocalDiaryEntries(entries);
}

/* ==================== TOPICS ==================== */

export async function getLocalTopics(): Promise<OfflineTopicPage[]> {
  return getJson<OfflineTopicPage[]>(KEYS.TOPICS, []);
}

export async function saveLocalTopics(
  topics: OfflineTopicPage[],
): Promise<void> {
  await setJson(KEYS.TOPICS, topics);
}

export async function getLocalTopicById(
  id: string,
): Promise<OfflineTopicPage | null> {
  const topics = await getLocalTopics();
  return topics.find((t) => t.id === id) || null;
}

export async function upsertLocalTopic(topic: OfflineTopicPage): Promise<void> {
  const topics = await getLocalTopics();
  const idx = topics.findIndex((t) => t.id === topic.id);
  if (idx >= 0) {
    topics[idx] = { ...topics[idx], ...topic };
  } else {
    topics.push(topic);
  }
  await saveLocalTopics(topics);
}

export async function updateLocalTopicId(
  oldId: string,
  newId: string,
): Promise<void> {
  const topics = await getLocalTopics();
  const t = topics.find((item) => item.id === oldId);
  if (t) {
    t.id = newId;
    t._syncStatus = "synced";
    await saveLocalTopics(topics);
  }
}

/* ==================== SYNC QUEUE ==================== */

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  return getJson<SyncQueueItem[]>(KEYS.SYNC_QUEUE, []);
}

export async function saveSyncQueue(queue: SyncQueueItem[]): Promise<void> {
  await setJson(KEYS.SYNC_QUEUE, queue);
}

export async function enqueueSyncAction(
  action: Omit<SyncQueueItem, "id" | "timestamp">,
): Promise<void> {
  const queue = await getSyncQueue();
  const item: SyncQueueItem = {
    ...action,
    id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    timestamp: Date.now(),
    retryCount: 0,
  };

  // If there's already a pending UPDATE action for this entity, merge or replace it
  if (action.action === "UPDATE_NOTE" || action.action === "UPDATE_TOPIC") {
    const existingIndex = queue.findIndex(
      (q) => q.entityId === action.entityId && q.action === action.action,
    );
    if (existingIndex >= 0) {
      queue[existingIndex] = {
        ...queue[existingIndex],
        payload: { ...queue[existingIndex].payload, ...action.payload },
        timestamp: Date.now(),
      };
      await saveSyncQueue(queue);
      return;
    }
  }

  queue.push(item);
  await saveSyncQueue(queue);
}

export async function removeSyncAction(id: string): Promise<void> {
  const queue = await getSyncQueue();
  const filtered = queue.filter((item) => item.id !== id);
  await saveSyncQueue(filtered);
}

export async function clearAllLocalData(): Promise<void> {
  const keys = [
    KEYS.NOTES,
    KEYS.FOLDERS,
    KEYS.DIARY_ENTRIES,
    KEYS.TOPICS,
    KEYS.SYNC_QUEUE,
    KEYS.LAST_SYNC,
  ];
  await Promise.all(
    keys.map((k) => AsyncStorage.removeItem(k).catch(() => {})),
  );
}

/* ==================== LAST SYNC METADATA ==================== */

export async function getLastSyncTime(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.LAST_SYNC);
  } catch {
    return null;
  }
}

export async function setLastSyncTime(isoDate: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.LAST_SYNC, isoDate);
  } catch {
    // ignore
  }
}

/* ==================== CUSTOM SERVER URL ==================== */

export async function getStoredServerUrl(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.CUSTOM_SERVER_URL);
  } catch {
    return null;
  }
}

export async function setStoredServerUrl(url: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.CUSTOM_SERVER_URL, url.trim());
  } catch {
    // ignore
  }
}
