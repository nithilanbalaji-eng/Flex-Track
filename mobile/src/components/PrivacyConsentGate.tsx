import React, { useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authApi } from "../api/auth";
import { extractErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors, radius, text } from "../theme";
import { Button, ErrorBanner, Title, Subtitle } from "./ui";
import { Logo } from "./Logo";

const PRIVACY_URL = "https://flex-track-pi.vercel.app/privacy";

/**
 * Blocks the app until the current privacy policy has been accepted.
 *
 * The signup checkbox covers email registrations. This catches everyone it
 * can't: Apple/Google sign-ins, accounts made before the policy existed, and
 * anyone who only ever accepted an older revision.
 */
export function PrivacyConsentGate({ children }: { children: React.ReactNode }) {
  const { user, setUser, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || !user.needsPrivacyConsent) return <>{children}</>;

  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      setUser(await authApi.acceptPrivacy());
    } catch (err) {
      setError(extractErrorMessage(err));
      setBusy(false);
    }
  };

  const isUpdate = Boolean(user.privacyAcceptedAt);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Logo />
        <View style={{ marginTop: 36, flex: 1 }}>
          <Title>{isUpdate ? "We've updated our Privacy Policy" : "Before you start"}</Title>
          <Subtitle>
            {isUpdate
              ? "Our Privacy Policy has changed since you last accepted it. Please review and accept the new version to carry on using Flex Track."
              : "Flex Track stores your training, nutrition and any health data you connect. Please read and accept our Privacy Policy to continue."}
          </Subtitle>

          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>In short</Text>
            <Text style={styles.bullet}>• Your health and fitness data is never used for ads, and never sold.</Text>
            <Text style={styles.bullet}>• Only crews you join can see plans you share with them.</Text>
            <Text style={styles.bullet}>• You can delete your account and all of its data at any time.</Text>
            <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)}>
              Read the full Privacy Policy
            </Text>
          </View>

          <View style={{ marginTop: 20 }}>
            <ErrorBanner message={error} />
          </View>
        </View>

        <View style={{ gap: 12, marginTop: 32 }}>
          <Button title="Accept and continue" onPress={accept} loading={busy} />
          <Button title="Sign out" variant="ghost" onPress={logout} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  summary: {
    marginTop: 24,
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: radius["2xl"],
    padding: 16,
  },
  summaryTitle: { fontSize: text.base, fontWeight: "600", color: colors.slate[800] },
  bullet: { marginTop: 8, fontSize: text.sm, color: colors.slate[600], lineHeight: 20 },
  link: {
    marginTop: 14,
    fontSize: text.sm,
    fontWeight: "600",
    color: colors.brand[600],
    textDecorationLine: "underline",
  },
});
