import React from "react";
import { KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, text } from "../theme";
import { Logo } from "./Logo";
import { Title, Subtitle } from "./ui";

const PRIVACY_URL = "https://flex-track-pi.vercel.app/privacy";

/** Branded hero + form container shared by every signed-out screen. */
export function AuthScreenLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <SafeAreaView style={styles.hero} edges={["top"]}>
            <Logo light />
            <Text style={styles.heroTitle}>Train together.{"\n"}Track everything.</Text>
            <Text style={styles.heroBody}>
              Shared plans, streaks, calories and an AI coach — all in one place.
            </Text>
          </SafeAreaView>

          <View style={styles.body}>
            <Title>{title}</Title>
            <Subtitle>{subtitle}</Subtitle>
            <View style={{ marginTop: 28 }}>{children}</View>

            <Text style={styles.privacy} onPress={() => Linking.openURL(PRIVACY_URL)}>
              Privacy Policy
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  hero: { backgroundColor: colors.brand[700], paddingHorizontal: 24, paddingTop: 24, paddingBottom: 36 },
  heroTitle: { marginTop: 24, color: colors.white, fontSize: 26, fontWeight: "700", lineHeight: 33 },
  heroBody: { marginTop: 8, color: "rgba(255,255,255,0.72)", fontSize: text.base, lineHeight: 21 },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 24 },
  privacy: {
    marginTop: 36,
    textAlign: "center",
    fontSize: text.xs,
    color: colors.slate[300],
    textDecorationLine: "underline",
  },
});
