import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
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
  Trash2,
  Calendar,
  Clock,
  Plus,
} from "lucide-react-native";
import {
  formatDisplayDate,
  formatShortDate,
  getTodayDateKey,
  extractDatedLines,
  expandDateShortcuts,
} from "@notes/shared";
import { api } from "../../services/api";
import { diaryRepository } from "../../services/diaryRepository";
import { networkService } from "../../services/network";
import { Header } from "../../components/Header";
import {
  AutosaveIndicator,
  SaveStatus,
} from "../../components/AutosaveIndicator";
import { colors } from "../../theme";

export const TopicDetailScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { topicId } = route.params;
  const [topic, setTopic] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [loading, setLoading] = useState(true);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchTopic();
  }, [topicId]);

  const fetchTopic = async () => {
    try {
      const local = await diaryRepository.getTopicById(topicId);
      if (local) {
        setTopic(local);
        setTitle(local.title || "");
        setContent(local.content || "");
        setLoading(false);
        return;
      }

      if (networkService.online) {
        const res = await api.get(`/diary/topics/${topicId}`);
        const t = res.data.data;
        setTopic(t);
        setTitle(t.title || "");
        setContent(t.content || "");
      } else {
        Alert.alert("Offline", "Topic not found locally");
        navigation.goBack();
      }
    } catch {
      Alert.alert("Error", "Topic not found");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const triggerAutosave = (newTitle: string, newContent: string) => {
    setSaveStatus("unsaved");
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        await diaryRepository.updateTopic(topicId, {
          title: newTitle,
          content: newContent,
        });
        setSaveStatus(networkService.online ? "saved" : "offline-saved");
      } catch {
        setSaveStatus("error");
      }
    }, 600);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Topic Page",
      `Delete "${topic?.title}"? Your associated diary daily entries will remain completely intact.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await api.delete(`/diary/topics/${topicId}`);
            navigation.goBack();
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading topic...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <Header
        title="Topic Page"
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
          onPress: handleDelete,
        }}
      />

      {/* Autosave Status Bar */}
      <View style={styles.statusBar}>
        <Text style={styles.topicBadge}>ONGOING TOPIC</Text>
        <AutosaveIndicator status={saveStatus} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Topic Title Input */}
        <TextInput
          value={title}
          onChangeText={(val) => {
            setTitle(val);
            triggerAutosave(val, content);
          }}
          placeholder="Topic Title"
          placeholderTextColor={colors.light.textMuted}
          style={styles.titleInput}
        />

        {/* Date Attachment Bar */}
        <View style={styles.attachBar}>
          <TouchableOpacity
            style={styles.attachBtn}
            onPress={() => {
              const todayKey = getTodayDateKey();
              const tag = `@${todayKey} `;
              const updated = content ? `${content}\n${tag}` : tag;
              setContent(updated);
              triggerAutosave(title, updated);
            }}
          >
            <Plus size={14} color={colors.light.accent} />
            <Text style={styles.attachBtnText}>
              Attach Today (@{getTodayDateKey()})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Topic Content Body */}
        <TextInput
          multiline
          value={content}
          onChangeText={(val) => {
            const expanded = expandDateShortcuts(val);
            setContent(expanded);
            triggerAutosave(title, expanded);
          }}
          placeholder="Write notes... Attach dates using @YYYY-MM-DD or the button above to link lines directly to that day's Daily Journal."
          placeholderTextColor={colors.light.textMuted}
          style={styles.contentInput}
          textAlignVertical="top"
        />

        {/* Attached Dates / Lines in this Topic */}
        {extractDatedLines(content).length > 0 && (
          <View style={styles.datedLinesSection}>
            <View style={styles.sectionHeader}>
              <Clock size={16} color={colors.light.accent} />
              <Text style={styles.sectionTitle}>
                ATTACHED DATES IN THIS TOPIC (
                {extractDatedLines(content).length})
              </Text>
            </View>

            <View style={styles.entriesList}>
              {extractDatedLines(content).map((dl, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.datedLineRow}
                  onPress={() => {
                    navigation.navigate("DiaryMain", {
                      screen: "DiaryHome",
                      params: { dateKey: dl.dateKey },
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.datedLineLeft}>
                    <View style={styles.dateBadge}>
                      <Text style={styles.dateBadgeText}>
                        {formatShortDate(dl.dateKey)}
                      </Text>
                    </View>
                    <Text style={styles.datedLineText} numberOfLines={1}>
                      {dl.cleanLine || dl.line}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={colors.light.accent} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Related Diary Entries Section */}
        <View style={styles.relatedSection}>
          <View style={styles.sectionHeader}>
            <Calendar size={16} color={colors.light.textSecondary} />
            <Text style={styles.sectionTitle}>
              RELATED DIARY ENTRIES ({topic?.relatedEntries?.length || 0})
            </Text>
          </View>

          {!topic?.relatedEntries?.length ? (
            <Text style={styles.noEntriesText}>
              Not linked to any diary entries yet. Link it from any day's
              journal entry.
            </Text>
          ) : (
            <View style={styles.entriesList}>
              {topic.relatedEntries.map((e: any) => (
                <TouchableOpacity
                  key={e.id}
                  style={styles.entryRow}
                  onPress={() => {
                    // Navigate to Diary tab and open that specific date
                    navigation.navigate("DiaryMain", {
                      screen: "DiaryHome",
                      params: { dateKey: e.dateKey },
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.entryDateText}>
                    {formatDisplayDate(e.dateKey)}
                  </Text>
                  <ChevronRight size={18} color={colors.light.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.light.background,
  },
  loadingText: {
    fontSize: 14,
    color: colors.light.textSecondary,
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  topicBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.light.textMuted,
    letterSpacing: 0.5,
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
    marginBottom: 8,
  },
  attachBar: {
    flexDirection: "row",
    marginBottom: 12,
  },
  attachBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  attachBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400e",
  },
  contentInput: {
    minHeight: 260,
    fontSize: 15,
    lineHeight: 24,
    color: colors.light.text,
    marginBottom: 24,
  },
  datedLinesSection: {
    marginBottom: 24,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  datedLineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 8,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  datedLineLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  dateBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "#fef3c7",
  },
  dateBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400e",
  },
  datedLineText: {
    fontSize: 13,
    color: colors.light.text,
    flex: 1,
  },
  relatedSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.light.textSecondary,
    letterSpacing: 0.5,
  },
  noEntriesText: {
    fontSize: 12,
    fontStyle: "italic",
    color: colors.light.textMuted,
  },
  entriesList: {
    gap: 8,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  entryDateText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.light.text,
  },
});
