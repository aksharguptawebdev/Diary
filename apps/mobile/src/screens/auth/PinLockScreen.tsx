import React, { useState } from "react";
import { View, Text, StyleSheet, Alert, TouchableOpacity } from "react-native";
import { Lock } from "lucide-react-native";
import { getItem } from "../../services/storage";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { colors } from "../../theme";

interface PinLockScreenProps {
  onUnlock: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({ onUnlock }) => {
  const [pin, setPin] = useState("");

  const handleUnlock = async () => {
    const savedPin = await getItem("app_lock_pin");
    if (pin === savedPin) {
      onUnlock();
    } else {
      Alert.alert("Incorrect PIN", "The PIN entered is incorrect.");
      setPin("");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Lock size={28} color={colors.light.primary} />
        </View>

        <Text style={styles.title}>App Locked</Text>
        <Text style={styles.subtitle}>Enter your 4-digit PIN to continue</Text>

        <Input
          placeholder="••••"
          value={pin}
          onChangeText={setPin}
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
          autoFocus
          style={styles.pinInput}
        />

        <Button
          title="Unlock"
          onPress={handleUnlock}
          style={styles.unlockBtn}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
    padding: 24,
    borderRadius: 16,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.light.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.light.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginBottom: 20,
    textAlign: "center",
  },
  pinInput: {
    textAlign: "center",
    fontSize: 28,
    letterSpacing: 10,
    height: 52,
    marginBottom: 16,
  },
  unlockBtn: {
    width: "100%",
  },
});
