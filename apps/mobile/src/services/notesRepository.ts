import { Note, NoteFolder } from "@notes/shared";
import {
  getLocalNotes,
  getLocalNoteById,
  upsertLocalNote,
  getLocalFolders,
  enqueueSyncAction,
  OfflineNote,
} from "./localDatabase";
import { syncService } from "./syncService";
import { networkService } from "./network";

export interface NotesFilter {
  search?: string;
  folderId?: string | null;
  status?: "active" | "archived" | "trash";
}

export const notesRepository = {
  /**
   * Fetch notes from local offline storage with instant return,
   * triggering a silent background sync if online.
   */
  async getNotes(filter: NotesFilter = {}): Promise<OfflineNote[]> {
    const allNotes = await getLocalNotes();

    // Trigger background sync if online so local cache stays fresh
    if (networkService.online) {
      syncService.sync().catch(() => {});
    }

    const { search = "", folderId = null, status = "active" } = filter;

    return allNotes.filter((note) => {
      // Status filter
      if (status === "trash") {
        if (!note.deletedAt) return false;
      } else if (status === "archived") {
        if (note.deletedAt || !note.archivedAt) return false;
      } else {
        // active
        if (note.deletedAt || note.archivedAt) return false;
      }

      // Folder filter
      if (folderId !== null && note.folderId !== folderId) {
        return false;
      }

      // Search filter
      if (search.trim()) {
        const query = search.toLowerCase();
        const titleMatch = (note.title || "").toLowerCase().includes(query);
        const contentMatch = (note.content || "").toLowerCase().includes(query);
        const tagMatch = note.tags?.some((t) =>
          t.toLowerCase().includes(query),
        );
        return titleMatch || contentMatch || tagMatch;
      }

      return true;
    });
  },

  /**
   * Get a single note by ID from local storage
   */
  async getNoteById(id: string): Promise<OfflineNote | null> {
    return getLocalNoteById(id);
  },

  /**
   * Create a new note immediately in local storage, queue for sync,
   * and push to cloud if online.
   */
  async createNote(input: {
    title?: string;
    content?: string;
    folderId?: string | null;
    isPinned?: boolean;
    tags?: string[];
  }): Promise<OfflineNote> {
    const now = new Date().toISOString();
    const tempId = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newNote: OfflineNote = {
      id: tempId,
      userId: "local_user",
      title: input.title || "Untitled Note",
      content: input.content || "",
      folderId: input.folderId || null,
      tags: input.tags || [],
      isPinned: Boolean(input.isPinned),
      archivedAt: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
      _syncStatus: "pending",
      _localUpdatedAt: Date.now(),
    };

    // Save locally
    await upsertLocalNote(newNote);

    // Queue sync action
    await enqueueSyncAction({
      action: "CREATE_NOTE",
      entityId: tempId,
      payload: {
        title: newNote.title,
        content: newNote.content,
        folderId: newNote.folderId,
        isPinned: newNote.isPinned,
        tags: newNote.tags,
      },
    });

    await syncService.updatePendingCount();

    if (networkService.online) {
      syncService.sync().catch(() => {});
    }

    return newNote;
  },

  /**
   * Update note title, content, or tags locally and queue sync
   */
  async updateNote(
    id: string,
    updates: Partial<Pick<Note, "title" | "content" | "folderId" | "tags">>,
  ): Promise<OfflineNote | null> {
    const existing = await getLocalNoteById(id);
    if (!existing) return null;

    const updatedNote: OfflineNote = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
      _syncStatus: "pending",
      _localUpdatedAt: Date.now(),
    };

    await upsertLocalNote(updatedNote);

    await enqueueSyncAction({
      action: "UPDATE_NOTE",
      entityId: id,
      payload: updates,
    });

    await syncService.updatePendingCount();

    if (networkService.online) {
      syncService.sync().catch(() => {});
    }

    return updatedNote;
  },

  /**
   * Toggle pin status locally and queue sync
   */
  async togglePin(id: string): Promise<boolean> {
    const existing = await getLocalNoteById(id);
    if (!existing) return false;

    const newPinned = !existing.isPinned;
    existing.isPinned = newPinned;
    existing.updatedAt = new Date().toISOString();
    existing._syncStatus = "pending";

    await upsertLocalNote(existing);

    await enqueueSyncAction({
      action: "PIN_NOTE",
      entityId: id,
    });

    await syncService.updatePendingCount();

    if (networkService.online) {
      syncService.sync().catch(() => {});
    }

    return newPinned;
  },

  /**
   * Toggle archive status locally and queue sync
   */
  async toggleArchive(id: string): Promise<boolean> {
    const existing = await getLocalNoteById(id);
    if (!existing) return false;

    const isArchived = Boolean(existing.archivedAt);
    existing.archivedAt = isArchived ? null : new Date().toISOString();
    existing.updatedAt = new Date().toISOString();
    existing._syncStatus = "pending";

    await upsertLocalNote(existing);

    await enqueueSyncAction({
      action: "ARCHIVE_NOTE",
      entityId: id,
    });

    await syncService.updatePendingCount();

    if (networkService.online) {
      syncService.sync().catch(() => {});
    }

    return !isArchived;
  },

  /**
   * Soft-delete note to trash locally and queue sync
   */
  async trashNote(id: string): Promise<void> {
    const existing = await getLocalNoteById(id);
    if (!existing) return;

    existing.deletedAt = new Date().toISOString();
    existing.updatedAt = new Date().toISOString();
    existing._syncStatus = "pending";

    await upsertLocalNote(existing);

    await enqueueSyncAction({
      action: "DELETE_NOTE",
      entityId: id,
    });

    await syncService.updatePendingCount();

    if (networkService.online) {
      syncService.sync().catch(() => {});
    }
  },

  /**
   * Get folders from local storage
   */
  async getFolders(): Promise<NoteFolder[]> {
    return getLocalFolders();
  },
};
