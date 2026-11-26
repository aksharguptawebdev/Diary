import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
} from "react-native";
import {
  User,
  Shield,
  Database,
  LogOut,
  Trash2,
  ChevronRight,
  Lock,
  Cloud,
  CloudOff,
  RefreshCw,
  Server,
  CheckCircle2,
} from "lucide-react-native";
import { useMobileAuth } from "../../hooks/useMobileAuth";
import { useSync } from "../../hooks/useSync";
import { clearAllLocalData } from "../../services/localDatabase";
import { Header } from "../../components/Header";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { api } from "../../services/api";
import { getItem, setItem, removeItem } from "../../services/storage";
import { colors } from "../../theme";

export const SettingsScreen: React.FC = () => {
  const { user, logout, updateUser } = useMobileAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // App Lock State
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinInput, setPinInput] = useState("");

  // Sync State
  const {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncedAt,
    serverUrl,
    syncNow,
    updateServerUrl,
    testConnection,
  } = useSync();

  const [customUrlInput, setCustomUrlInput] = useState(serverUrl);
  const [testingConnection, setTestingConnection] = useState(false);
  const [updatingUrl, setUpdatingUrl] = useState(false);

  useEffect(() => {
    setCustomUrlInput(serverUrl);
  }, [serverUrl]);

  const handleSaveServerUrl = async () => {
    if (!customUrlInput.trim()) return;
    setUpdatingUrl(true);
    try {
      await updateServerUrl(customUrlInput.trim());
      Alert.alert("Saved", "Server URL updated successfully.");
    } catch {
      Alert.alert("Error", "Failed to save server URL.");
    } finally {
      setUpdatingUrl(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const reachable = await testConnection();
      if (reachable) {
        Alert.alert("Connected", "Successfully connected to backend server!");
      } else {
        Alert.alert(
          "Unreachable",
          `Could not connect to ${customUrlInput || "server"}. Ensure backend server is running and accessible from your phone.`,
        );
      }
    } finally {
      setTestingConnection(false);
    }
  };

  const handleManualSync = async () => {
    if (!isOnline) {
      Alert.alert(
        "Offline",
        "Cannot sync while offline. Your changes are safely stored on your phone and will backup automatically when you reconnect.",
      );
      return;
    }
    await syncNow();
    Alert.alert("Sync Complete", "Notes & Diary entries synced with cloud.");
  };

  const handleClearCache = () => {
    Alert.alert(
      "Clear Local Cache",
      "This will reset the local cache on your phone. Any notes saved to the cloud will remain untouched.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Cache",
          style: "destructive",
          onPress: async () => {
            await clearAllLocalData();
            Alert.alert(
              "Cache Cleared",
              "Local offline cache has been emptied.",
            );
          },
        },
      ],
    );
  };

  useEffect(() => {
    checkAppLock();
  }, []);

  const checkAppLock = async () => {
    const pin = await getItem("app_lock_pin");
    setAppLockEnabled(Boolean(pin));
  };

  const handleToggleAppLock = async (value: boolean) => {
    if (value) {
      setPinInput("");
      setPinModalVisible(true);
    } else {
      Alert.alert(
        "Disable App Lock",
        "Remove PIN protection for this device?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Disable",
            style: "destructive",
            onPress: async () => {
              await removeItem("app_lock_pin");
              setAppLockEnabled(false);
            },
          },
        ],
      );
    }
  };

  const handleSavePin = async () => {
    if (pinInput.length !== 4 || !/^\d{4}$/.test(pinInput)) {
      Alert.alert("Invalid PIN", "Please enter a 4-digit numeric PIN.");
      return;
    }
    await setItem("app_lock_pin", pinInput);
    setAppLockEnabled(true);
    setPinModalVisible(false);
    Alert.alert(
      "App Lock Enabled",
      "Your diary and notes are now protected with a 4-digit PIN on this device.",
    );
  };

  const handleUpdateProfile = async () => {
    setProfileLoading(true);
    try {
      const res = await api.patch("/users/profile", { name, email });
      updateUser(res.data.data);
      Alert.alert("Success", "Profile updated successfully.");
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.error || "Failed to update profile.",
      );
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert("Error", "Please fill in both current and new password.");
      return;
    }
    setPasswordLoading(true);
    try {
      await api.patch("/users/password", { currentPassword, newPassword });
      Alert.alert(
        "Success",
        "Password changed successfully. Please sign in again.",
      );
      logout();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.error || "Failed to change password.",
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete all your diary entries, topic pages, and notes. Are you absolutely sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Permanently",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete("/users/account");
              logout();
            } catch {
              Alert.alert("Error", "Failed to delete account.");
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Settings" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <User size={16} color={colors.light.textSecondary} />
            <Text style={styles.cardTitle}>PROFILE</Text>
          </View>

          <Input label="Name" value={name} onChangeText={setName} />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Button
            title="Save Profile"
            onPress={handleUpdateProfile}
            isLoading={profileLoading}
            variant="secondary"
            style={styles.saveBtn}
          />
        </View>

        {/* Security & Password Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Shield size={16} color={colors.light.textSecondary} />
            <Text style={styles.cardTitle}>SECURITY</Text>
          </View>

          <Input
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            placeholder="••••••••"
          />
          <Input
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="••••••••"
          />

          <Button
            title="Change Password"
            onPress={handleChangePassword}
            isLoading={passwordLoading}
            variant="secondary"
            style={styles.saveBtn}
          />
        </View>

        {/* App Lock Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Lock size={16} color={colors.light.textSecondary} />
            <Text style={styles.cardTitle}>DEVICE PRIVACY & LOCK</Text>
          </View>

          <View style={styles.lockRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.lockLabel}>4-Digit PIN Lock</Text>
              <Text style={styles.lockDesc}>
                Require a PIN code to open this application on this device.
              </Text>
            </View>
            <Switch
              value={appLockEnabled}
              onValueChange={handleToggleAppLock}
              trackColor={{
                false: colors.light.border,
                true: colors.light.text,
              }}
            />
          </View>
        </View>

        {/* Data & Backup Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Database size={16} color={colors.light.textSecondary} />
            <Text style={styles.cardTitle}>OFFLINE STORAGE & CLOUD BACKUP</Text>
          </View>

          {/* Network & Sync Status Banner */}
          <View
            style={[
              styles.statusBanner,
              isOnline ? styles.statusBannerOnline : styles.statusBannerOffline,
            ]}
          >
            {isOnline ? (
              <CheckCircle2 size={16} color="#15803d" />
            ) : (
              <CloudOff size={16} color="#b45309" />
            )}
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.statusBannerTitle,
                  isOnline ? styles.textOnline : styles.textOffline,
                ]}
              >
                {isOnline ? "Connected to Internet" : "Offline Mode Active"}
              </Text>
              <Text style={styles.statusBannerSubtitle}>
                {isOnline
                  ? pendingCount > 0
                    ? `${pendingCount} changes waiting to backup to cloud`
                    : "All notes & diary entries are up to date"
                  : "Notes are safely stored on your phone and will auto-backup once connected."}
              </Text>
            </View>
          </View>

          {/* Sync Stats Info */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pending offline changes:</Text>
            <Text
              style={[
                styles.infoValue,
                pendingCount > 0 && { color: "#b45309", fontWeight: "700" },
              ]}
            >
              {pendingCount} item{pendingCount === 1 ? "" : "s"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last cloud backup:</Text>
            <Text style={styles.infoValue}>
              {lastSyncedAt
                ? new Date(lastSyncedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    month: "short",
                    day: "numeric",
                  })
                : "Not yet synced"}
            </Text>
          </View>

          {/* Server Base URL Setting */}
          <View style={styles.serverSection}>
            <Text style={styles.sectionSubtitle}>Cloud Server API URL</Text>
            <Text style={styles.sectionSubtitleHint}>
              Point to your cloud backend (e.g. Render/Fly.io) or home Wi-Fi IP
              to backup notes when online:
            </Text>

            <Input
              value={customUrlInput}
              onChangeText={setCustomUrlInput}
              placeholder="https://your-api.onrender.com/api/v1"
              autoCapitalize="none"
              autoCorrect={false}
              style={{ fontSize: 13 }}
            />

            <View style={styles.rowButtons}>
              <Button
                title={testingConnection ? "Testing..." : "Test Connection"}
                onPress={handleTestConnection}
                variant="secondary"
                isLoading={testingConnection}
                style={{ flex: 1 }}
              />
              <Button
                title={updatingUrl ? "Saving..." : "Save URL"}
                onPress={handleSaveServerUrl}
                variant="primary"
                isLoading={updatingUrl}
                style={{ flex: 1 }}
              />
            </View>
          </View>

          {/* Manual Sync Button */}
          <Button
            title={isSyncing ? "Backing up notes..." : "Backup / Sync Now"}
            onPress={handleManualSync}
            isLoading={isSyncing}
            variant="secondary"
            style={[styles.saveBtn, { marginTop: 14 }]}
          />

          <TouchableOpacity
            onPress={handleClearCache}
            style={styles.clearCacheBtn}
          >
            <Text style={styles.clearCacheText}>Clear local offline cache</Text>
          </TouchableOpacity>
        </View>

        {/* Logout & Danger Actions */}
        <View style={styles.actionCard}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => logout()}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <LogOut size={16} color={colors.light.text} />
              <Text style={styles.actionText}>Log Out</Text>
            </View>
            <ChevronRight size={18} color={colors.light.textMuted} />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <Trash2 size={16} color={colors.light.danger} />
              <Text style={[styles.actionText, { color: colors.light.danger }]}>
                Delete Account
              </Text>
            </View>
            <ChevronRight size={18} color={colors.light.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* PIN Setup Modal */}
      <Modal
        visible={pinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPinModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalHeading}>Set App Lock PIN</Text>
            <Text style={styles.modalSubheading}>
              Enter a 4-digit numerical code to secure your app:
            </Text>
            <Input
              placeholder="1234"
              value={pinInput}
              onChangeText={setPinInput}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              autoFocus
              style={{ textAlign: "center", fontSize: 24, letterSpacing: 8 }}
            />
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setPinModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Save PIN"
                onPress={handleSavePin}
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
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.light.textSecondary,
    letterSpacing: 0.5,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.light.textSecondary,
  },
  lockRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lockLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.light.text,
  },
  lockDesc: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  saveBtn: {
    marginTop: 6,
  },
  actionCard: {
    borderRadius: 12,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    overflow: "hidden",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  actionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.light.text,
  },
  separator: {
    height: 1,
    backgroundColor: colors.light.borderLight,
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
    marginBottom: 6,
  },
  modalSubheading: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
  },
  statusBannerOnline: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  statusBannerOffline: {
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  statusBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  statusBannerSubtitle: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  textOnline: {
    color: "#15803d",
  },
  textOffline: {
    color: "#92400e",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.borderLight,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.light.text,
  },
  serverSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.light.borderLight,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.light.text,
    marginBottom: 2,
  },
  sectionSubtitleHint: {
    fontSize: 11,
    color: colors.light.textMuted,
    marginBottom: 10,
    lineHeight: 15,
  },
  rowButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  clearCacheBtn: {
    marginTop: 14,
    alignItems: "center",
    padding: 6,
  },
  clearCacheText: {
    fontSize: 11,
    color: colors.light.textMuted,
    textDecorationLine: "underline",
  },
});
