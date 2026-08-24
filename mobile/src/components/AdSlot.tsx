import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui";
import { colors, radius, text } from "../theme";

/**
 * Ad placement.
 *
 * Premium subscribers render nothing at all, so there's no empty gap where an
 * ad used to be. `showAds` is computed server-side, so it can't be flipped
 * from the device.
 *
 * Swapping in a real AdMob banner means replacing the body below; the gating
 * and layout around it stay as they are.
 */
export function AdSlot({ placement }: { placement: string }) {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  if (!user || user.showAds === false) return null;

  return (
    <View style={styles.wrap} testID={`ad-${placement}`}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>AD</Text>
      </View>
      <Text style={styles.title}>Training without interruptions</Text>
      <Text style={styles.body}>Go Premium to remove ads and support the app.</Text>
      <Button
        title="Remove ads — $2.99/mo"
        style={{ marginTop: 14 }}
        onPress={() => navigation.navigate("Premium")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginVertical: 20,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: radius["2xl"],
    backgroundColor: colors.white,
    padding: 18,
  },
  badge: {
    position: "absolute",
    right: 12,
    top: 12,
    backgroundColor: colors.slate[200],
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 10, fontWeight: "700", color: colors.slate[500] },
  title: { fontSize: text.base, fontWeight: "600", color: colors.slate[900], paddingRight: 40 },
  body: { marginTop: 4, fontSize: text.sm, color: colors.slate[500], lineHeight: 19 },
});
