import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  BookOpen,
  FileText,
  Settings as SettingsIcon,
} from "lucide-react-native";
import { DiaryScreen } from "../screens/diary/DiaryScreen";
import { TopicsScreen } from "../screens/diary/TopicsScreen";
import { TopicDetailScreen } from "../screens/diary/TopicDetailScreen";
import { NotesScreen } from "../screens/notes/NotesScreen";
import { NoteEditorScreen } from "../screens/notes/NoteEditorScreen";
import { SettingsScreen } from "../screens/settings/SettingsScreen";
import { colors } from "../theme";

const Tab = createBottomTabNavigator();
const DiaryStack = createNativeStackNavigator();
const NotesStack = createNativeStackNavigator();

function DiaryStackNavigator() {
  return (
    <DiaryStack.Navigator screenOptions={{ headerShown: false }}>
      <DiaryStack.Screen name="DiaryHome" component={DiaryScreen} />
      <DiaryStack.Screen name="Topics" component={TopicsScreen} />
      <DiaryStack.Screen name="TopicDetail" component={TopicDetailScreen} />
    </DiaryStack.Navigator>
  );
}

function NotesStackNavigator() {
  return (
    <NotesStack.Navigator screenOptions={{ headerShown: false }}>
      <NotesStack.Screen name="NotesHome" component={NotesScreen} />
      <NotesStack.Screen name="NoteEditor" component={NoteEditorScreen} />
    </NotesStack.Navigator>
  );
}

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.light.text,
        tabBarInactiveTintColor: colors.light.textMuted,
        tabBarStyle: {
          backgroundColor: colors.light.surface,
          borderTopColor: colors.light.border,
          height: 56,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tab.Screen
        name="DiaryMain"
        component={DiaryStackNavigator}
        options={{
          tabBarLabel: "Diary",
          tabBarIcon: ({ color, size }) => (
            <BookOpen size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="NotesMain"
        component={NotesStackNavigator}
        options={{
          tabBarLabel: "Notes",
          tabBarIcon: ({ color, size }) => (
            <FileText size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{
          tabBarLabel: "Settings",
          tabBarIcon: ({ color, size }) => (
            <SettingsIcon size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
