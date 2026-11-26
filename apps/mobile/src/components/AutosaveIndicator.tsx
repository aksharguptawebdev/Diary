import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { CloudOff } from "lucide-react-native";
import { colors } from "../theme";

export type SaveStatus =
  "idle" | "saving" | "saved" | "error" | "unsaved" | "offline-saved";

interface AutosaveIndicatorProps {
  status: SaveStatus;
}

export const AutosaveIndicator: React.FC<AutosaveIndicatorProps> = ({
  status,
}) => {
  if (status === "idle") return null;

  return (
    <View style={styles.container}>
      {status === "saving" && (
        <>
          <ActivityIndicator
            size="small"
            color={colors.light.textMuted}
            style={styles.spinner}
          />
          <Text style={styles.text}>Saving...</Text>
        </>
      )}
      {status === "saved" && (
        <Text style={[styles.text, { color: colors.light.success }]}>
          Saved & Backed up
        </Text>
      )}
      {status === "offline-saved" && (
        <View style={styles.offlineRow}>
          <CloudOff size={11} color="#b45309" />
          <Text style={[styles.text, { color: "#b45309" }]}>Saved locally</Text>
        </View>
      )}
      {status === "unsaved" && (
        <Text style={[styles.text, { color: colors.light.accent }]}>
          Unsaved
        </Text>
      )}
      {status === "error" && (
        <Text style={[styles.text, { color: colors.light.danger }]}>
          Save failed
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  offlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  spinner: {
    transform: [{ scale: 0.7 }],
  },
  text: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.light.textSecondary,
  },
});
