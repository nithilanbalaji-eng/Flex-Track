import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, text } from "../theme";

/** Labels a workout day as "Day 1" rather than a bare number. */
export function DayBadge({ dayNumber }: { dayNumber: number }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>DAY {dayNumber}</Text>
    </View>
  );
}

export function DurationBadge({ minutes }: { minutes?: number | null }) {
  if (!minutes) return null;
  return (
    <View style={styles.duration}>
      <Text style={styles.durationText}>{minutes} min</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { backgroundColor: colors.brand[600], borderRadius: radius.md, paddingHorizontal: 9, paddingVertical: 4 },
  text: { color: colors.white, fontSize: text.xs, fontWeight: "700", letterSpacing: 0.5 },
  duration: { backgroundColor: colors.slate[100], borderRadius: radius.md, paddingHorizontal: 8, paddingVertical: 4 },
  durationText: { color: colors.slate[600], fontSize: text.xs, fontWeight: "500" },
});
