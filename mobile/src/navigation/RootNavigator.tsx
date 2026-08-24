import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { colors, text } from "../theme";
import { Spinner } from "../components/ui";
import { PrivacyConsentGate } from "../components/PrivacyConsentGate";
import type { AuthStackParamList, RootStackParamList, TabsParamList } from "./types";

import {
  IconDashboard,
  IconDumbbell,
  IconSparkles,
  IconCalendarCheck,
  IconUtensils,
  IconUsers,
} from "../components/icons";

import { LoginScreen } from "../screens/LoginScreen";
import { SignupScreen } from "../screens/SignupScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { ResetPasswordScreen } from "../screens/ResetPasswordScreen";
import { PrivacyScreen } from "../screens/PrivacyScreen";
import { DashboardScreen } from "../screens/DashboardScreen";
import { PlansScreen } from "../screens/PlansScreen";
import { CoachScreen } from "../screens/CoachScreen";
import { GymLogScreen } from "../screens/GymLogScreen";
import { CaloriesScreen } from "../screens/CaloriesScreen";
import { CrewsScreen } from "../screens/CrewsScreen";
import { PlanDetailScreen } from "../screens/PlanDetailScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { PremiumScreen } from "../screens/PremiumScreen";

const Tabs = createBottomTabNavigator<TabsParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.brand[600],
    background: colors.slate[50],
    card: colors.white,
    text: colors.slate[900],
    border: colors.slate[200],
  },
};

const TAB_ICONS = {
  Home: IconDashboard,
  Plans: IconDumbbell,
  Coach: IconSparkles,
  Log: IconCalendarCheck,
  Food: IconUtensils,
  Crews: IconUsers,
} as const;

function TabsNavigator() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.brand[600],
        tabBarInactiveTintColor: colors.slate[400],
        tabBarLabelStyle: { fontSize: text.xs - 1, fontWeight: "500" },
        tabBarStyle: { borderTopColor: colors.slate[200], backgroundColor: colors.white },
        tabBarIcon: ({ color, focused }) => {
          const Ico = TAB_ICONS[route.name as keyof typeof TAB_ICONS];
          return <Ico size={22} color={color} strokeWidth={focused ? 2.4 : 2} />;
        },
      })}
    >
      <Tabs.Screen name="Home" component={DashboardScreen} />
      <Tabs.Screen name="Plans" component={PlansScreen} />
      <Tabs.Screen name="Coach" component={CoachScreen} />
      <Tabs.Screen name="Log" component={GymLogScreen} />
      <Tabs.Screen name="Food" component={CaloriesScreen} />
      <Tabs.Screen name="Crews" component={CrewsScreen} />
    </Tabs.Navigator>
  );
}

function SignedInNavigator() {
  return (
    <PrivacyConsentGate>
      <RootStack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.white },
          headerTintColor: colors.brand[600],
          headerTitleStyle: { color: colors.slate[900], fontSize: text.md, fontWeight: "600" },
          contentStyle: { backgroundColor: colors.slate[50] },
        }}
      >
        <RootStack.Screen name="Tabs" component={TabsNavigator} options={{ headerShown: false }} />
        <RootStack.Screen name="PlanDetail" component={PlanDetailScreen} options={{ title: "Workout Plan" }} />
        <RootStack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
        <RootStack.Screen name="Premium" component={PremiumScreen} options={{ title: "Premium" }} />
        <RootStack.Screen name="Privacy" component={PrivacyScreen} options={{ title: "Privacy Policy" }} />
      </RootStack.Navigator>
    </PrivacyConsentGate>
  );
}

function SignedOutNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.white } }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <AuthStack.Screen
        name="Privacy"
        component={PrivacyScreen}
        options={{ headerShown: true, title: "Privacy Policy" }}
      />
    </AuthStack.Navigator>
  );
}

/**
 * Deep links. A password reset email opens flextrack://reset-password?token=…
 * on a device with the app installed.
 */
const linking = {
  prefixes: ["flextrack://", "https://flex-track-pi.vercel.app"],
  config: {
    screens: {
      ResetPassword: "reset-password",
      Privacy: "privacy",
    },
  },
};

export function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.slate[50], justifyContent: "center" }}>
        <Spinner />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme} linking={linking}>
      {user ? <SignedInNavigator /> : <SignedOutNavigator />}
    </NavigationContainer>
  );
}
