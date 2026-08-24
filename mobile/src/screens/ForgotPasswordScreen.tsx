import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuthScreenLayout } from "../components/AuthScreenLayout";
import { Button, ErrorBanner, Input, Label } from "../components/ui";
import { authApi } from "../api/auth";
import { extractErrorMessage } from "../api/client";
import { colors, radius, text } from "../theme";
import type { AuthStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<AuthStackParamList>;

export function ForgotPasswordScreen() {
  const navigation = useNavigation<Nav>();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthScreenLayout title="Check your email" subtitle="If we found an account, a reset link is on its way.">
        <View style={styles.success}>
          <Text style={styles.successText}>
            We've sent a link to <Text style={{ fontWeight: "700" }}>{email}</Text>. It expires in an hour and can
            only be used once.
          </Text>
          <Text style={[styles.successText, { marginTop: 8 }]}>
            Nothing arrived? Check your spam folder, and make sure that's the address you signed up with.
          </Text>
        </View>

        <View style={{ gap: 12, marginTop: 20 }}>
          <Button title="Try a different email" variant="secondary" onPress={() => setSent(false)} />
          <Button title="Back to sign in" variant="ghost" onPress={() => navigation.navigate("Login")} />
        </View>
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout title="Forgot your password?" subtitle="Enter your email and we'll send you a reset link.">
      <View style={{ gap: 16 }}>
        <ErrorBanner message={error} />
        <View>
          <Label>Email</Label>
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoFocus
            onSubmitEditing={submit}
            returnKeyType="send"
          />
        </View>
        <Button title="Send reset link" onPress={submit} loading={loading} />
      </View>

      <Text style={styles.footer}>
        Remembered it?{" "}
        <Text style={styles.link} onPress={() => navigation.navigate("Login")}>
          Back to sign in
        </Text>
      </Text>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  success: {
    backgroundColor: colors.emerald[50],
    borderWidth: 1,
    borderColor: colors.emerald[200],
    borderRadius: radius.lg,
    padding: 16,
  },
  successText: { fontSize: text.sm, color: colors.emerald[900], lineHeight: 20 },
  link: { color: colors.brand[600], fontWeight: "600" },
  footer: { marginTop: 24, textAlign: "center", fontSize: text.sm, color: colors.slate[500] },
});
