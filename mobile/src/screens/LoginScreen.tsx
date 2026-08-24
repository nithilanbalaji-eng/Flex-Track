import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuthScreenLayout } from "../components/AuthScreenLayout";
import { SocialAuthButtons } from "../components/SocialAuthButtons";
import { Button, ErrorBanner, Input, Label } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { extractErrorMessage } from "../api/client";
import { colors, text } from "../theme";
import type { AuthStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<AuthStackParamList>;

export function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { login, loginWithApple } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenLayout title="Welcome back" subtitle="Log in to keep the streak going.">
      <SocialAuthButtons
        onApple={(token, name) => loginWithApple(token, name).catch((e) => setError(extractErrorMessage(e)))}
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
          <Label>Email</Label>
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />
        </View>

        <View>
          <View style={styles.labelRow}>
            <Label>Password</Label>
            <Text style={styles.link} onPress={() => navigation.navigate("ForgotPassword")}>
              Forgot?
            </Text>
          </View>
          <Input
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            onSubmitEditing={submit}
            returnKeyType="go"
          />
        </View>

        <Button title="Log in" onPress={submit} loading={loading} />
      </View>

      <Text style={styles.footer}>
        New to Flex Track?{" "}
        <Text style={styles.link} onPress={() => navigation.navigate("Signup")}>
          Create an account
        </Text>
      </Text>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 24 },
  rule: { flex: 1, height: 1, backgroundColor: colors.slate[200] },
  dividerText: { fontSize: text.xs, fontWeight: "500", color: colors.slate[400] },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  link: { color: colors.brand[600], fontWeight: "600", fontSize: text.sm },
  footer: { marginTop: 24, textAlign: "center", fontSize: text.sm, color: colors.slate[500] },
});
