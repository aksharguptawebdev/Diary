import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
} from "react-native";
import { colors } from "../theme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  isLoading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  isLoading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const getBackgroundColor = () => {
    if (disabled) return "#cbd5e1";
    switch (variant) {
      case "secondary":
        return colors.light.surfaceSecondary;
      case "danger":
        return colors.light.danger;
      case "ghost":
        return "transparent";
      case "primary":
      default:
        return colors.light.primary;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case "secondary":
        return colors.light.text;
      case "ghost":
        return colors.light.text;
      case "danger":
      case "primary":
      default:
        return colors.light.primaryText;
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        variant === "secondary" && styles.secondaryBorder,
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 8,
  },
  secondaryBorder: {
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  text: {
    fontSize: 14,
    fontWeight: "600",
  },
});
