import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card } from "./ui";
import { colors, radius, text } from "./../theme";

type Accent = "brand" | "green" | "orange" | "purple";

const ACCENTS: Record<Accent, { bg: string; fg: string }> = {
  brand: { bg: colors.brand[50], fg: colors.brand[600] },
  green: { bg: colors.emerald[50], fg: colors.emerald[600] },
  orange: { bg: colors.orange[50], fg: colors.orange[600] },
  purple: { bg: colors.violet[50], fg: colors.violet[600] },
};

/** Vertical layout so two fit side by side on a phone. */
export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "brand",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: (color: string) => React.ReactNode;
  accent?: Accent;
}) {
  const tone = ACCENTS[accent];
  return (
    <Card style={styles.card}>
      {icon ? <View style={[styles.icon, { backgroundColor: tone.bg }]}>{icon(tone.fg)}</View> : null}
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, padding: 16 },
  icon: { width: 36, height: 36, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  value: { fontSize: text.xl, fontWeight: "700", color: colors.slate[900] },
  label: { marginTop: 2, fontSize: text.xs + 1, fontWeight: "500", color: colors.slate[500] },
  hint: { marginTop: 4, fontSize: text.xs, color: colors.slate[400], lineHeight: 15 },
});
