import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  ChevronRight,
  Pin,
  Archive,
  Trash2,
  Bold,
  Italic,
  List,
  CheckSquare,
  Heading1,
} from "lucide-react-native";
import { notesRepository } from "../../services/notesRepository";
import { networkService } from "../../services/network";
import { api } from "../../services/api";
import { Header } from "../../components/Header";
import {
  AutosaveIndicator,
  SaveStatus,
} from "../../components/AutosaveIndicator";
import { colors } from "../../theme";

export const NoteEditorScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { noteId } = route.params;
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchNote();
  }, [noteId]);

  const fetchNote = async () => {
    try {
      // 1. Try loading from offline local storage first
      const localNote = await notesRepository.getNoteById(noteId);
      if (localNote) {
        setTitle(localNote.title || "");
        setContent(localNote.content || "");
        setIsPinned(Boolean(localNote.isPinned));
        setIsArchived(Boolean(localNote.archivedAt));
        return;
      }

      // 2. If not local and online, load from server
      if (networkService.online) {
        const res = await api.get(`/notes/${noteId}`);
        const n = res.data.data;
        setTitle(n.title || "");
        setContent(n.content || "");
        setIsPinned(Boolean(n.isPinned));
        setIsArchived(Boolean(n.archivedAt));
      } else {
        Alert.alert("Offline", "Note not found in local cache");
        navigation.goBack();
      }
    } catch {
      Alert.alert("Error", "Note not found");
      navigation.goBack();
    }
  };

  const triggerAutosave = (newTitle: string, newContent: string) => {
    setSaveStatus("unsaved");
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        await notesRepository.updateNote(noteId, {
          title: newTitle,
          content: newContent,
        });
        setSaveStatus(networkService.online ? "saved" : "offline-saved");
      } catch {
        setSaveStatus("error");
      }
    }, 600);
  };

  const insertText = (prefix: string, suffix = "") => {
    const updated = content + "\n" + prefix + suffix;
    setContent(updated);
    triggerAutosave(title, updated);
  };

  const togglePin = async () => {
    try {
      const nextPinned = await notesRepository.togglePin(noteId);
      setIsPinned(nextPinned);
    } catch {
      // ignore
    }
  };

  const toggleArchive = async () => {
    try {
      const nextArchived = await notesRepository.toggleArchive(noteId);
      setIsArchived(nextArchived);
      Alert.alert("Note", nextArchived ? "Note archived" : "Note unarchived");
    } catch {
      // ignore
    }
  };

  const handleTrash = () => {
    Alert.alert("Move to Trash", "Move this note to trash?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Trash",
        style: "destructive",
        onPress: async () => {
          await notesRepository.trashNote(noteId);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <Header
        title="Edit Note"
        leftAction={{
          icon: (
            <ChevronRight
              size={22}
              color={colors.light.text}
              style={{ transform: [{ rotate: "180deg" }] }}
            />
          ),
          onPress: () => navigation.goBack(),
        }}
        rightAction={{
          icon: <Trash2 size={18} color={colors.light.danger} />,
          onPress: handleTrash,
        }}
      />

      {/* Action Toolbar */}
      <View style={styles.actionToolbar}>
        <View style={styles.toolbarLeft}>
          <TouchableOpacity onPress={togglePin} style={styles.iconBtn}>
            <Pin
              size={18}
              color={
                isPinned ? colors.light.accent : colors.light.textSecondary
              }
              fill={isPinned ? colors.light.accent : "transparent"}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleArchive} style={styles.iconBtn}>
            <Archive
              size={18}
              color={
                isArchived ? colors.light.primary : colors.light.textSecondary
              }
            />
          </TouchableOpacity>
        </View>

        <AutosaveIndicator status={saveStatus} />
      </View>

      {/* Formatting bar */}
      <View style={styles.formatBar}>
        <TouchableOpacity
          onPress={() => insertText("**", "**")}
          style={styles.formatBtn}
        >
          <Bold size={16} color={colors.light.text} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => insertText("*", "*")}
          style={styles.formatBtn}
        >
          <Italic size={16} color={colors.light.text} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => insertText("# ")}
          style={styles.formatBtn}
        >
          <Heading1 size={16} color={colors.light.text} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => insertText("- ")}
          style={styles.formatBtn}
        >
          <List size={16} color={colors.light.text} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => insertText("- [ ] ")}
          style={styles.formatBtn}
        >
          <CheckSquare size={16} color={colors.light.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          value={title}
          onChangeText={(val) => {
            setTitle(val);
            triggerAutosave(val, content);
          }}
          placeholder="Note Title"
          placeholderTextColor={colors.light.textMuted}
          style={styles.titleInput}
        />

        <TextInput
          multiline
          value={content}
          onChangeText={(val) => {
            setContent(val);
            triggerAutosave(title, val);
          }}
          placeholder="Write your note..."
          placeholderTextColor={colors.light.textMuted}
          style={styles.contentInput}
          textAlignVertical="top"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  actionToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  toolbarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBtn: {
    padding: 4,
  },
  formatBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.light.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  formatBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: colors.light.surface,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  titleInput: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.light.text,
    marginBottom: 16,
  },
  contentInput: {
    minHeight: 300,
    fontSize: 15,
    lineHeight: 24,
    color: colors.light.text,
  },
});
