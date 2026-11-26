import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Cloud, CloudOff, RefreshCw, CheckCircle2 } from "lucide-react-native";
import { useSync } from "../hooks/useSync";
import { colors } from "../theme";

export const SyncStatusBar: React.FC = () => {
  const { isOnline, isSyncing, pendingCount, syncNow } = useSync();

  // If online, not syncing, and nothing pending, don't occupy screen space
  if (isOnline && !isSyncing && pendingCount === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {!isOnline ? (
        <View style={[styles.badge, styles.offlineBadge]}>
          <CloudOff size={13} color="#b45309" />
          <Text style={[styles.text, styles.offlineText]}>
            Offline Mode — Saved to phone{" "}
            {pendingCount > 0 ? `(${pendingCount} pending)` : ""}
          </Text>
        </View>
      ) : isSyncing ? (
        <View style={[styles.badge, styles.syncingBadge]}>
          <ActivityIndicator
            size="small"
            color="#0369a1"
            style={styles.spinner}
          />
          <Text style={[styles.text, styles.syncingText]}>
            Syncing with cloud...
          </Text>
        </View>
      ) : pendingCount > 0 ? (
        <TouchableOpacity
          style={[styles.badge, styles.pendingBadge]}
          onPress={syncNow}
          activeOpacity={0.8}
        >
          <RefreshCw size={12} color="#0369a1" />
          <Text style={[styles.text, styles.pendingText]}>
            {pendingCount} change{pendingCount > 1 ? "s" : ""} waiting to backup
            • Tap to sync
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 2,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
  },
  offlineBadge: {
    backgroundColor: "#fef3c7",
  },
  offlineText: {
    color: "#92400e",
  },
  syncingBadge: {
    backgroundColor: "#e0f2fe",
  },
  syncingText: {
    color: "#0369a1",
  },
  pendingBadge: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  pendingText: {
    color: "#15803d",
  },
  text: {
    fontSize: 11,
    fontWeight: "500",
  },
  spinner: {
    transform: [{ scale: 0.65 }],
  },
});
