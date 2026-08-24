import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuthScreenLayout } from "../components/AuthScreenLayout";
import { Button, ErrorBanner, Input, Label } from "../components/ui";
import { authApi } from "../api/auth";
import { extractErrorMessage, setToken } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors, text } from "../theme";
import type { AuthStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<AuthStackParamList>;

/** Reached from the emailed link via the flextrack:// deep link. */
export function ResetPasswordScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<AuthStackParamList, "ResetPassword">>();
  const token = route.params?.token ?? "";
  const { refreshUser } = useAuth();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const { token: jwt } = await authApi.resetPassword(token, password);
      await setToken(jwt);
      await refreshUser();
    } catch (err) {
      setError(extractErrorMessage(err));
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthScreenLayout title="Link not valid" subtitle="This reset link is missing its token.">
        <Text style={styles.body}>
          Make sure you opened the most recent link from your email, and that it wasn't cut short by your mail
          app.
        </Text>
        <Button
          title="Request a new link"
          onPress={() => navigation.navigate("ForgotPassword")}
          style={{ marginTop: 20 }}
        />
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout title="Choose a new password" subtitle="Pick something you don't use anywhere else.">
      <View style={{ gap: 16 }}>
        <ErrorBanner message={error} />
        <View>
          <Label>New password</Label>
          <Input
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secureTextEntry
            autoFocus
            autoComplete="new-password"
          />
        </View>
        <View>
          <Label>Confirm new password</Label>
          <Input
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Type it again"
            secureTextEntry
            onSubmitEditing={submit}
            returnKeyType="go"
          />
        </View>
        <Button title="Set new password" onPress={submit} loading={loading} />
      </View>

      <Text style={styles.footer}>
        <Text style={styles.link} onPress={() => navigation.navigate("Login")}>
          Back to sign in
        </Text>
      </Text>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: text.sm, color: colors.slate[500], lineHeight: 20 },
  link: { color: colors.brand[600], fontWeight: "600" },
  footer: { marginTop: 24, textAlign: "center", fontSize: text.sm, color: colors.slate[500] },
});
