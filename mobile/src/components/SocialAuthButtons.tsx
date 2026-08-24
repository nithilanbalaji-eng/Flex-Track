import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { Button } from "./ui";
import { IconApple } from "./icons";
import { colors } from "../theme";

/**
 * Native social sign-in.
 *
 * Apple's button uses their own component because Guideline 4.8 dictates its
 * appearance. It only renders where Sign in with Apple is actually available,
 * which is iOS 13+ — never Android.
 */
export function SocialAuthButtons({
  onApple,
  onError,
  beforePress,
}: {
  onApple: (identityToken: string, fullName?: string) => void;
  onError: (message: string) => void;
  /** Returns false to block sign-in, e.g. when consent hasn't been ticked. */
  beforePress?: () => boolean;
}) {
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => setAppleAvailable(false));
  }, []);

  const handleApple = async () => {
    if (beforePress && !beforePress()) return;
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        onError("Apple didn't return a sign-in token. Please try again.");
        return;
      }
      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(" ");
      onApple(credential.identityToken, fullName || undefined);
    } catch (err) {
      // The user dismissing the sheet isn't an error worth surfacing.
      if ((err as { code?: string })?.code === "ERR_REQUEST_CANCELED") return;
      onError("Sign in with Apple failed. Please try again.");
    }
  };

  if (!appleAvailable || Platform.OS !== "ios") {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <Button
        title="Continue with Apple"
        onPress={handleApple}
        style={{ backgroundColor: colors.ink[900] }}
        icon={<IconApple size={16} color={colors.white} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
});
