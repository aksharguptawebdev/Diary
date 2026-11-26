import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Plus,
  X,
  Layers,
  Calendar,
} from "lucide-react-native";
import {
  formatDisplayDate,
  shiftDateKey,
  getTodayDateKey,
  TopicPageSummary,
} from "@notes/shared";
import { api } from "../../services/api";
import { diaryRepository } from "../../services/diaryRepository";
import { networkService } from "../../services/network";
import { Header } from "../../components/Header";
import {
  AutosaveIndicator,
  SaveStatus,
} from "../../components/AutosaveIndicator";
import { SyncStatusBar } from "../../components/SyncStatusBar";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { colors } from "../../theme";

export const DiaryScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const initialDate = route.params?.dateKey || getTodayDateKey();
  const [dateKey, setDateKey] = useState<string>(initialDate);
  const [content, setContent] = useState("");
  const [topics, setTopics] = useState<TopicPageSummary[]>([]);
  const [topicUpdates, setTopicUpdates] = useState<any[]>([]);
  const [entryId, setEntryId] = useState<string | null>(null);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [modalVisible, setModalVisible] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [modalTab, setModalTab] = useState<"create" | "link">("create");
  const [allTopics, setAllTopics] = useState<any[]>([]);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContent = useRef<string>("");

  useEffect(() => {
    if (route.params?.dateKey) {
      setDateKey(route.params.dateKey);
    }
  }, [route.params?.dateKey]);

  useEffect(() => {
    fetchEntry(dateKey);
  }, [dateKey]);

  const fetchEntry = async (dKey: string) => {
    try {
      const local = await diaryRepository.getEntryByDate(dKey);
      if (local) {
        setEntryId(local.id);
        setContent(local.content || "");
        setTopics(local.topics || []);
        setTopicUpdates(local.topicUpdates || []);
        lastSavedContent.current = local.content || "";
      } else {
        setEntryId(null);
        setContent("");
        setTopics([]);
        setTopicUpdates([]);
        lastSavedContent.current = "";
      }
      setSaveStatus("idle");
    } catch {
      // not found / error
    }
  };

  const fetchAllTopics = async () => {
    try {
      const items = await diaryRepository.getTopics();
      setAllTopics(items);
    } catch {
      // ignore
    }
  };

  const handleContentChange = (text: string) => {
    setContent(text);

    if (text !== lastSavedContent.current) {
      setSaveStatus("unsaved");
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      debounceTimerRef.current = setTimeout(async () => {
        setSaveStatus("saving");
        try {
          const res = await diaryRepository.saveEntry(dateKey, text, "UTC");
          setEntryId(res.id);
          lastSavedContent.current = text;
          setSaveStatus(networkService.online ? "saved" : "offline-saved");
        } catch {
          setSaveStatus("error");
        }
      }, 600);
    }
  };

  const handleCreateAndLinkTopic = async () => {
    if (!newTopicTitle.trim()) return;

    try {
      let currentEntryId = entryId;
      if (!currentEntryId) {
        const res = await api.post("/diary/entries", {
          dateKey,
          content,
          timezone: "UTC",
        });
        currentEntryId = res.data.data.id;
        setEntryId(currentEntryId);
      }

      await api.post(`/diary/entries/${currentEntryId}/topics`, {
        newTopicTitle: newTopicTitle.trim(),
      });

      setNewTopicTitle("");
      setModalVisible(false);
      fetchEntry(dateKey);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.error || "Failed to create topic",
      );
    }
  };

  const handleLinkExistingTopic = async (topicId: string) => {
    try {
      let currentEntryId = entryId;
      if (!currentEntryId) {
        const res = await api.post("/diary/entries", {
          dateKey,
          content,
          timezone: "UTC",
        });
        currentEntryId = res.data.data.id;
        setEntryId(currentEntryId);
      }

      await api.post(`/diary/entries/${currentEntryId}/topics`, {
        topicPageId: topicId,
      });

      setModalVisible(false);
      fetchEntry(dateKey);
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.error || "Failed to link topic");
    }
  };

  const handleUnlink = (topicId: string) => {
    Alert.alert(
      "Remove Topic",
      "Remove this topic from today's entry? (The topic page will remain safe in Topics)",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            if (entryId) {
              await api.delete(`/diary/entries/${entryId}/topics/${topicId}`);
              fetchEntry(dateKey);
            }
          },
        },
      ],
    );
  };

  const todayKey = getTodayDateKey();
  const isToday = dateKey === todayKey;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <Header
        title={isToday ? "Today's Journal" : "Daily Journal"}
        subtitle={formatDisplayDate(dateKey)}
        rightAction={{
          icon: <Layers size={20} color={colors.light.text} />,
          onPress: () => navigation.navigate("Topics"),
        }}
      />

      <SyncStatusBar />

      {/* Date Navigator Bar */}
      <View style={styles.navBar}>
        <View style={styles.navButtons}>
          <TouchableOpacity
            onPress={() => setDateKey(shiftDateKey(dateKey, -1))}
            style={styles.dateNavBtn}
          >
            <ChevronLeft size={18} color={colors.light.text} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setDateKey(shiftDateKey(dateKey, 1))}
            style={styles.dateNavBtn}
          >
            <ChevronRight size={18} color={colors.light.text} />
          </TouchableOpacity>

          {!isToday && (
            <TouchableOpacity
              onPress={() => setDateKey(todayKey)}
              style={styles.todayBtn}
            >
              <Text style={styles.todayText}>Today</Text>
            </TouchableOpacity>
          )}
        </View>

        <AutosaveIndicator status={saveStatus} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Daily Entry Textarea */}
        <TextInput
          multiline
          placeholder="Write about your day, experiences, thoughts..."
          placeholderTextColor={colors.light.textMuted}
          value={content}
          onChangeText={handleContentChange}
          style={styles.editor}
          textAlignVertical="top"
        />

        {/* Topic Updates (Topic -> Date) */}
        {topicUpdates.length > 0 && (
          <View style={styles.topicUpdatesCard}>
            <View style={styles.topicUpdatesHeader}>
              <Layers size={16} color="#b45309" />
              <Text style={styles.topicUpdatesTitle}>
                TOPIC UPDATES FOR THIS DAY ({topicUpdates.length})
              </Text>
            </View>

            {topicUpdates.map((u) => (
              <View key={u.topicId} style={styles.updateCard}>
                <View style={styles.updateTitleRow}>
                  <Text style={styles.updateTopicTitle}>{u.topicTitle}</Text>
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate("TopicDetail", { topicId: u.topicId })
                    }
                  >
                    <Text style={styles.viewTopicLink}>View Topic →</Text>
                  </TouchableOpacity>
                </View>
                {u.lines.map((l: string, i: number) => (
                  <Text key={i} style={styles.updateLineText}>
                    • {l}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Related Topics Section */}
        <View style={styles.topicsSection}>
          <View style={styles.topicsHeader}>
            <View style={styles.topicHeaderTitle}>
              <BookOpen size={16} color={colors.light.textSecondary} />
              <Text style={styles.topicsSectionTitle}>RELATED TOPICS</Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                fetchAllTopics();
                setModalVisible(true);
              }}
              style={styles.addTopicBtn}
            >
              <Plus size={14} color={colors.light.text} />
              <Text style={styles.addTopicText}>Add Topic</Text>
            </TouchableOpacity>
          </View>

          {topics.length === 0 ? (
            <Text style={styles.noTopicsText}>
              No topics linked yet. Connect a topic to track a person or memory
              across multiple days.
            </Text>
          ) : (
            <View style={styles.topicList}>
              {topics.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={styles.topicRow}
                  onPress={() =>
                    navigation.navigate("TopicDetail", { topicId: t.id })
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.topicRowContent}>
                    <Text style={styles.topicTitle}>{t.title}</Text>
                    {t.preview ? (
                      <Text style={styles.topicPreview} numberOfLines={1}>
                        — {t.preview}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.topicActions}>
                    <TouchableOpacity
                      onPress={() => handleUnlink(t.id)}
                      style={styles.unlinkBtn}
                    >
                      <X size={14} color={colors.light.textMuted} />
                    </TouchableOpacity>
                    <ChevronRight size={18} color={colors.light.textMuted} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Topic Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Related Topic</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color={colors.light.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Modal Tabs */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                onPress={() => setModalTab("create")}
                style={[
                  styles.modalTab,
                  modalTab === "create" && styles.modalTabActive,
                ]}
              >
                <Text
                  style={[
                    styles.modalTabText,
                    modalTab === "create" && styles.modalTabTextActive,
                  ]}
                >
                  Create New
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setModalTab("link")}
                style={[
                  styles.modalTab,
                  modalTab === "link" && styles.modalTabActive,
                ]}
              >
                <Text
                  style={[
                    styles.modalTabText,
                    modalTab === "link" && styles.modalTabTextActive,
                  ]}
                >
                  Link Existing
                </Text>
              </TouchableOpacity>
            </View>

            {modalTab === "create" ? (
              <View style={styles.modalBody}>
                <Input
                  label="Topic Title"
                  placeholder="e.g. Priya, Book Club, Tokyo Trip"
                  value={newTopicTitle}
                  onChangeText={setNewTopicTitle}
                />
                <Button
                  title="Create & Link"
                  onPress={handleCreateAndLinkTopic}
                  style={styles.modalBtn}
                />
              </View>
            ) : (
              <ScrollView style={styles.modalList}>
                {allTopics.length === 0 ? (
                  <Text style={styles.emptyListText}>No existing topics</Text>
                ) : (
                  allTopics.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.existingTopicItem}
                      onPress={() => handleLinkExistingTopic(item.id)}
                    >
                      <Text style={styles.existingTopicTitle}>
                        {item.title}
                      </Text>
                      <Plus size={16} color={colors.light.textSecondary} />
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  navButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateNavBtn: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  todayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.light.surfaceSecondary,
  },
  todayText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.light.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  editor: {
    minHeight: 280,
    fontSize: 16,
    lineHeight: 24,
    color: colors.light.text,
    marginBottom: 20,
  },
  topicsSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  topicsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  topicHeaderTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  topicsSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.light.textSecondary,
    letterSpacing: 0.5,
  },
  addTopicBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.light.surfaceSecondary,
  },
  addTopicText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.light.text,
  },
  noTopicsText: {
    fontSize: 12,
    fontStyle: "italic",
    color: colors.light.textMuted,
    marginTop: 4,
  },
  topicList: {
    gap: 8,
  },
  topicRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  topicRowContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  topicTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.light.text,
  },
  topicPreview: {
    flex: 1,
    fontSize: 12,
    color: colors.light.textMuted,
  },
  topicActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  unlinkBtn: {
    padding: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.light.surface,
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.light.text,
  },
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    marginBottom: 16,
  },
  modalTab: {
    flex: 1,
    paddingBottom: 8,
    alignItems: "center",
  },
  modalTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.light.primary,
  },
  modalTabText: {
    fontSize: 13,
    color: colors.light.textMuted,
  },
  modalTabTextActive: {
    fontWeight: "600",
    color: colors.light.text,
  },
  modalBody: {
    width: "100%",
  },
  modalBtn: {
    marginTop: 8,
  },
  modalList: {
    maxHeight: 220,
  },
  existingTopicItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.borderLight,
  },
  existingTopicTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.light.text,
  },
  emptyListText: {
    textAlign: "center",
    paddingVertical: 20,
    fontSize: 12,
    color: colors.light.textMuted,
  },
  topicUpdatesCard: {
    marginBottom: 20,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  topicUpdatesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  topicUpdatesTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400e",
    letterSpacing: 0.5,
  },
  updateCard: {
    backgroundColor: colors.light.surface,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fde68a",
    marginBottom: 8,
  },
  updateTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  updateTopicTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.light.text,
  },
  viewTopicLink: {
    fontSize: 11,
    fontWeight: "600",
    color: "#b45309",
  },
  updateLineText: {
    fontSize: 13,
    color: colors.light.textSecondary,
    lineHeight: 18,
    marginLeft: 4,
  },
});
