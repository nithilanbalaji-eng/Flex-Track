import React from "react";
import { StyleSheet, Text } from "react-native";
import { colors, text } from "../theme";

/**
 * Kept deliberately faint: present for anyone who looks, without competing with
 * the content. Apple scrutinises fitness apps for medical claims, so this stays
 * on any screen that prescribes training.
 */
export function MedicalDisclaimer() {
  return (
    <Text style={styles.text}>
      We're not medical professionals. Always consult a doctor before starting a new exercise programme.
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    marginTop: 28,
    marginBottom: 8,
    paddingHorizontal: 8,
    textAlign: "center",
    fontSize: text.xs,
    lineHeight: 16,
    color: colors.slate[300],
  },
});
