import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from "react-native";
import {
  Plus,
  Search,
  ChevronRight,
  BookOpen,
  Calendar,
} from "lucide-react-native";
import { api } from "../../services/api";
import { diaryRepository } from "../../services/diaryRepository";
import { Header } from "../../components/Header";
import { SyncStatusBar } from "../../components/SyncStatusBar";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { colors } from "../../theme";

export const TopicsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [topics, setTopics] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    fetchTopics();
  }, [search]);

  const fetchTopics = async () => {
    setLoading(true);
    try {
      const items = await diaryRepository.getTopics(search);
      setTopics(items);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      const newTopic = await diaryRepository.createTopic(newTitle.trim());
      setNewTitle("");
      setCreateModalVisible(false);
      navigation.navigate("TopicDetail", { topicId: newTopic.id });
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.error || "Failed to create topic",
      );
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Topic Pages"
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
          icon: <Plus size={20} color={colors.light.text} />,
          onPress: () => setCreateModalVisible(true),
        }}
      />

      <SyncStatusBar />

      <View style={styles.searchBar}>
        <Search
          size={16}
          color={colors.light.textMuted}
          style={styles.searchIcon}
        />
        <Input
          placeholder="Search topics..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      <FlatList
        data={topics}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={fetchTopics}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <BookOpen size={36} color={colors.light.textMuted} />
            <Text style={styles.emptyTitle}>No Topic Pages</Text>
            <Text style={styles.emptySubtitle}>
              Create a topic page to record ongoing notes about a person, place
              or theme.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.topicCard}
            onPress={() =>
              navigation.navigate("TopicDetail", { topicId: item.id })
            }
            activeOpacity={0.7}
          >
            <View style={styles.topicInfo}>
              <Text style={styles.topicTitle}>{item.title}</Text>
              {item.content ? (
                <Text style={styles.topicPreview} numberOfLines={1}>
                  {item.content}
                </Text>
              ) : null}
              <View style={styles.entryCountRow}>
                <Calendar size={12} color={colors.light.textMuted} />
                <Text style={styles.entryCountText}>
                  {item.diaryEntryCount || 0} connected diary entries
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.light.textMuted} />
          </TouchableOpacity>
        )}
      />

      {/* Create Topic Modal */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalHeading}>Create Topic Page</Text>
            <Input
              label="Topic Title"
              placeholder="e.g. Priya, Book Club"
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setCreateModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Create"
                onPress={handleCreate}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: 12,
    position: "relative",
  },
  searchIcon: {
    position: "absolute",
    left: 28,
    top: 26,
    zIndex: 1,
  },
  searchInput: {
    paddingLeft: 36,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  topicCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  topicInfo: {
    flex: 1,
    marginRight: 10,
  },
  topicTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.light.text,
  },
  topicPreview: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  entryCountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  entryCountText: {
    fontSize: 11,
    color: colors.light.textMuted,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.light.text,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.light.textMuted,
    textAlign: "center",
    paddingHorizontal: 32,
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
  modalHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.light.text,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
});
