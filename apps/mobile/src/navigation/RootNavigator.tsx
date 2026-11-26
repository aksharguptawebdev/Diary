import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useMobileAuth } from "../hooks/useMobileAuth";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { RegisterScreen } from "../screens/auth/RegisterScreen";
import { PinLockScreen } from "../screens/auth/PinLockScreen";
import { TabNavigator } from "./TabNavigator";
import { getItem } from "../services/storage";
import { colors } from "../theme";

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const { isAuthenticated, isLoading } = useMobileAuth();
  const [isLocked, setIsLocked] = useState(false);
  const [checkingLock, setCheckingLock] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      checkDeviceLock();
    } else {
      setCheckingLock(false);
    }
  }, [isAuthenticated]);

  const checkDeviceLock = async () => {
    const pin = await getItem("app_lock_pin");
    setIsLocked(Boolean(pin));
    setCheckingLock(false);
  };

  if (isLoading || checkingLock) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.light.primary} />
      </View>
    );
  }

  if (isAuthenticated && isLocked) {
    return <PinLockScreen onUnlock={() => setIsLocked(false)} />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="AppTabs" component={TabNavigator} />
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.light.background,
  },
});
