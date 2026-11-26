import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import {
  Search,
  Plus,
  Pin,
  Folder as FolderIcon,
  Tag as TagIcon,
  CloudOff,
} from "lucide-react-native";
import { extractPreviewText, formatShortDate } from "@notes/shared";
import { notesRepository } from "../../services/notesRepository";
import { OfflineNote } from "../../services/localDatabase";
import { Header } from "../../components/Header";
import { Input } from "../../components/Input";
import { SyncStatusBar } from "../../components/SyncStatusBar";
import { useSync } from "../../hooks/useSync";
import { colors } from "../../theme";

export const NotesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { syncNow, isSyncing } = useSync();
  const [notes, setNotes] = useState<OfflineNote[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      const items = await notesRepository.getNotes({
        search,
        folderId: selectedFolderId,
        status: "active",
      });
      setNotes(items);
    } catch {
      // ignore
    }
  }, [search, selectedFolderId]);

  const fetchFolders = async () => {
    try {
      const f = await notesRepository.getFolders();
      setFolders(f);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotes();
    fetchFolders();
  }, [fetchNotes]);

  // Refresh notes whenever returning to this screen
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchNotes();
      fetchFolders();
    });
    return unsubscribe;
  }, [navigation, fetchNotes]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await syncNow();
      await fetchNotes();
      await fetchFolders();
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async () => {
    try {
      const newNote = await notesRepository.createNote({
        title: "Untitled Note",
        content: "",
        folderId: selectedFolderId,
        isPinned: false,
      });
      navigation.navigate("NoteEditor", { noteId: newNote.id });
    } catch {
      // ignore
    }
  };

  const pinnedNotes = notes.filter((n) => n.isPinned);
  const unpinnedNotes = notes.filter((n) => !n.isPinned);

  const renderNoteCard = ({ item }: { item: OfflineNote }) => {
    const preview = extractPreviewText(item.content, 80);
    const isPending = item._syncStatus === "pending";

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("NoteEditor", { noteId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title || "Untitled Note"}
          </Text>
          <View style={styles.headerIcons}>
            {isPending && (
              <View style={styles.pendingDot}>
                <CloudOff size={12} color="#b45309" />
              </View>
            )}
            {item.isPinned && (
              <Pin
                size={14}
                color={colors.light.accent}
                fill={colors.light.accent}
              />
            )}
          </View>
        </View>

        <Text style={styles.cardPreview} numberOfLines={2}>
          {preview || <Text style={styles.emptyPreview}>Empty note</Text>}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>
            {formatShortDate(item.updatedAt.split("T")[0])}
          </Text>

          {item.folder && (
            <View style={styles.folderBadge}>
              <FolderIcon size={10} color={colors.light.textSecondary} />
              <Text style={styles.folderBadgeText}>{item.folder.name}</Text>
            </View>
          )}

          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagBadge}>
              <TagIcon size={10} color={colors.light.textSecondary} />
              <Text style={styles.tagBadgeText}>#{item.tags[0]}</Text>
            </View>
          )}

          {isPending && <Text style={styles.pendingLabel}>Offline</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Notes"
        rightAction={{
          icon: <Plus size={22} color={colors.light.text} />,
          onPress: handleCreateNote,
        }}
      />

      <SyncStatusBar />

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Search
          size={16}
          color={colors.light.textMuted}
          style={styles.searchIcon}
        />
        <Input
          placeholder="Search notes & tags..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      {/* Folder Filter Chips */}
      {folders.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.folderChips}
          contentContainerStyle={styles.folderChipsContent}
        >
          <TouchableOpacity
            style={[
              styles.chip,
              selectedFolderId === null && styles.chipActive,
            ]}
            onPress={() => setSelectedFolderId(null)}
          >
            <Text
              style={[
                styles.chipText,
                selectedFolderId === null && styles.chipTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          {folders.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[
                styles.chip,
                selectedFolderId === f.id && styles.chipActive,
              ]}
              onPress={() =>
                setSelectedFolderId(selectedFolderId === f.id ? null : f.id)
              }
            >
              <Text
                style={[
                  styles.chipText,
                  selectedFolderId === f.id && styles.chipTextActive,
                ]}
              >
                {f.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Notes List with Pinned Section */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading || isSyncing}
            onRefresh={handleRefresh}
          />
        }
      >
        {/* Pinned section */}
        {pinnedNotes.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Pin
                size={12}
                color={colors.light.accent}
                fill={colors.light.accent}
              />
              <Text style={styles.sectionHeaderText}>
                PINNED ({pinnedNotes.length})
              </Text>
            </View>
            <View style={styles.cardList}>
              {pinnedNotes.map((item) => (
                <View key={item.id}>{renderNoteCard({ item })}</View>
              ))}
            </View>
          </View>
        )}

        {/* Regular notes section */}
        <View style={styles.section}>
          {pinnedNotes.length > 0 && (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>NOTES</Text>
            </View>
          )}

          {unpinnedNotes.length === 0 && pinnedNotes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Notes</Text>
              <Text style={styles.emptySubtitle}>
                Tap the + button to create a new standalone note. It will work
                completely offline and backup when online.
              </Text>
            </View>
          ) : (
            <View style={styles.cardList}>
              {unpinnedNotes.map((item) => (
                <View key={item.id}>{renderNoteCard({ item })}</View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateNote}
        activeOpacity={0.8}
      >
        <Plus size={24} color={colors.light.primaryText} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  searchBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    position: "relative",
  },
  searchIcon: {
    position: "absolute",
    left: 28,
    top: 22,
    zIndex: 1,
  },
  searchInput: {
    paddingLeft: 36,
  },
  folderChips: {
    maxHeight: 38,
    marginBottom: 6,
  },
  folderChipsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  chipActive: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.light.textSecondary,
  },
  chipTextActive: {
    color: colors.light.primaryText,
    fontWeight: "600",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.light.textMuted,
    letterSpacing: 0.5,
  },
  cardList: {
    gap: 10,
  },
  card: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pendingDot: {
    padding: 2,
    borderRadius: 4,
    backgroundColor: "#fef3c7",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.light.text,
    flex: 1,
    marginRight: 8,
  },
  cardPreview: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.light.textSecondary,
  },
  emptyPreview: {
    fontStyle: "italic",
    color: colors.light.textMuted,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  cardDate: {
    fontSize: 10,
    color: colors.light.textMuted,
  },
  folderBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.light.surfaceSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  folderBadgeText: {
    fontSize: 10,
    color: colors.light.textSecondary,
  },
  tagBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.light.surfaceSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagBadgeText: {
    fontSize: 10,
    color: colors.light.textSecondary,
  },
  pendingLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#b45309",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    marginLeft: "auto",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.light.text,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.light.textMuted,
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
