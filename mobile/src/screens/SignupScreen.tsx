import React, { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuthScreenLayout } from "../components/AuthScreenLayout";
import { SocialAuthButtons } from "../components/SocialAuthButtons";
import { Button, ErrorBanner, Input, Label } from "../components/ui";
import { IconCheck } from "../components/icons";
import { useAuth } from "../context/AuthContext";
import { extractErrorMessage } from "../api/client";
import { colors, radius, text } from "../theme";
import type { AuthStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<AuthStackParamList>;
const PRIVACY_URL = "https://flex-track-pi.vercel.app/privacy";

export function SignupScreen() {
  const navigation = useNavigation<Nav>();
  const { signup, loginWithApple } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /** Social sign-up creates an account too, so consent is required first. */
  const requireConsent = () => {
    if (!accepted) {
      setError("Please accept the Privacy Policy to continue.");
      return false;
    }
    return true;
  };

  const submit = async () => {
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!requireConsent()) return;

    setLoading(true);
    try {
      await signup(name.trim(), email.trim(), password);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenLayout title="Create your account" subtitle="Start planning workouts with your crew in under a minute.">
      <SocialAuthButtons
        beforePress={requireConsent}
        onApple={(token, n) =>
          loginWithApple(token, n, true).catch((e) => setError(extractErrorMessage(e)))
        }
        onError={setError}
      />

      <View style={styles.divider}>
        <View style={styles.rule} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.rule} />
      </View>

      <View style={{ gap: 16 }}>
        <ErrorBanner message={error} />

        <View>
          <Label>Full name</Label>
          <Input value={name} onChangeText={setName} placeholder="Alex Rivera" autoComplete="name" />
        </View>

        <View>
          <Label>Email</Label>
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </View>

        <View>
          <Label>Password</Label>
          <Input
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secureTextEntry
            autoComplete="new-password"
          />
        </View>

        <Pressable style={styles.consent} onPress={() => setAccepted((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: accepted }}>
          <View style={[styles.box, accepted && styles.boxChecked]}>
            {accepted ? <IconCheck size={14} color={colors.white} strokeWidth={3} /> : null}
          </View>
          <Text style={styles.consentText}>
            I've read and accept the{" "}
            <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)}>
              Privacy Policy
            </Text>
            .
          </Text>
        </Pressable>

        <Button title="Create account" onPress={submit} loading={loading} disabled={!accepted} />
      </View>

      <Text style={styles.footer}>
        Already have an account?{" "}
        <Text style={styles.link} onPress={() => navigation.navigate("Login")}>
          Log in
        </Text>
      </Text>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 24 },
  rule: { flex: 1, height: 1, backgroundColor: colors.slate[200] },
  dividerText: { fontSize: text.xs, fontWeight: "500", color: colors.slate[400] },
  consent: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    backgroundColor: colors.slate[50],
    borderRadius: radius.lg,
    padding: 14,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.slate[300],
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  boxChecked: { backgroundColor: colors.brand[600], borderColor: colors.brand[600] },
  consentText: { flex: 1, fontSize: text.sm, color: colors.slate[600], lineHeight: 20 },
  link: { color: colors.brand[600], fontWeight: "600" },
  footer: { marginTop: 24, textAlign: "center", fontSize: text.sm, color: colors.slate[500] },
});
