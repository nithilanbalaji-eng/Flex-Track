import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { format } from "date-fns";
import { Screen } from "../components/Screen";
import { Card, Button, Input, Label, Spinner, ErrorBanner } from "../components/ui";
import { AdSlot } from "../components/AdSlot";
import { IconTrash } from "../components/icons";
import { caloriesApi, DaySummary } from "../api/calories";
import { extractErrorMessage } from "../api/client";
import { CalorieEntry } from "../types";
import { colors, radius, text } from "../theme";

const MEALS: CalorieEntry["mealType"][] = ["breakfast", "lunch", "dinner", "snack"];

export function CaloriesScreen() {
  const navigation = useNavigation<any>();
  const [day, setDay] = useState<DaySummary | null>(null);
  const [date] = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [meal, setMeal] = useState<CalorieEntry["mealType"]>("lunch");
  const [food, setFood] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  const load = useCallback(async () => {
    try {
      setDay(await caloriesApi.getDay(date));
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load])
  );

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const add = async () => {
    setSaving(true);
    setError(null);
    try {
      await caloriesApi.create({
        date,
        mealType: meal,
        foodName: food.trim(),
        calories: Number(kcal),
        protein: protein ? Number(protein) : undefined,
        carbs: carbs ? Number(carbs) : undefined,
        fat: fat ? Number(fat) : undefined,
      });
      setFood("");
      setKcal("");
      setProtein("");
      setCarbs("");
      setFat("");
      await load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Screen scroll={false}><Spinner /></Screen>;

  const target = day?.target;
  const consumed = day?.totals.calories ?? 0;
  const remaining = target?.target != null ? Math.round(target.target - consumed) : null;
  const pct = target?.target ? Math.min((consumed / target.target) * 100, 100) : 0;

  return (
    <Screen
      title="Calorie Tracker"
      description={format(new Date(), "EEEE, d MMMM")}
      onRefresh={refresh}
      refreshing={refreshing}
    >
      <ErrorBanner message={error} />

      {!target?.target ? (
        <Card style={styles.warn}>
          <Text style={styles.warnTitle}>No calorie target yet</Text>
          <Text style={styles.warnBody}>
            Add your age, height and weight in Settings and we'll calculate your daily target and macros.
          </Text>
          <Button title="Add my stats" style={{ marginTop: 12 }} onPress={() => navigation.navigate("Settings")} />
        </Card>
      ) : null}

      <Card>
        <View style={styles.rowEnd}>
          <View>
            <Text style={styles.label}>Consumed today</Text>
            <Text style={styles.big}>
              {Math.round(consumed)}
              {target?.target ? <Text style={styles.of}> / {target.target} kcal</Text> : null}
            </Text>
          </View>
          {remaining !== null ? (
            <Text style={[styles.remaining, { color: remaining >= 0 ? colors.emerald[600] : colors.red[600] }]}>
              {remaining >= 0 ? `${remaining} left` : `${Math.abs(remaining)} over`}
            </Text>
          ) : null}
        </View>

        <View style={styles.bar}>
          <View
            style={[
              styles.barFill,
              { width: `${pct}%`, backgroundColor: remaining !== null && remaining < 0 ? colors.red[500] : colors.brand[500] },
            ]}
          />
        </View>

        <View style={styles.macros}>
          <Macro label="Protein" value={day?.totals.protein ?? 0} target={target?.proteinGrams ?? null} color={colors.emerald[500]} />
          <Macro label="Carbs" value={day?.totals.carbs ?? 0} target={target?.carbsGrams ?? null} color={colors.amber[500]} />
          <Macro label="Fat" value={day?.totals.fat ?? 0} target={target?.fatGrams ?? null} color={colors.violet[500]} />
        </View>
      </Card>

      <Card style={{ marginTop: 20 }}>
        <Text style={styles.sectionTitle}>Add food</Text>

        <View style={{ marginTop: 16, gap: 16 }}>
          <View>
            <Label>Meal</Label>
            <View style={styles.mealRow}>
              {MEALS.map((m) => (
                <Pressable key={m} onPress={() => setMeal(m)} style={[styles.meal, meal === m && styles.mealActive]}>
                  <Text style={[styles.mealText, meal === m && styles.mealTextActive]}>
                    {m[0].toUpperCase() + m.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View>
            <Label>Food</Label>
            <Input value={food} onChangeText={setFood} placeholder="Chicken & rice" />
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Label>Calories</Label>
              <Input value={kcal} onChangeText={setKcal} keyboardType="number-pad" placeholder="650" />
            </View>
            <View style={{ flex: 1 }}>
              <Label>Protein</Label>
              <Input value={protein} onChangeText={setProtein} keyboardType="number-pad" placeholder="g" />
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Label>Carbs</Label>
              <Input value={carbs} onChangeText={setCarbs} keyboardType="number-pad" placeholder="g" />
            </View>
            <View style={{ flex: 1 }}>
              <Label>Fat</Label>
              <Input value={fat} onChangeText={setFat} keyboardType="number-pad" placeholder="g" />
            </View>
          </View>

          <Button title="Add entry" onPress={add} loading={saving} disabled={!food.trim() || !kcal} />
        </View>
      </Card>

      <AdSlot placement="calories" />

      <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Today's food</Text>
      <Card style={{ padding: 0 }}>
        {!day?.entries.length ? (
          <Text style={styles.none}>Nothing logged yet today.</Text>
        ) : (
          day.entries.map((e, i) => (
            <View key={e.id} style={[styles.entry, i > 0 && styles.divider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.entryName}>{e.foodName}</Text>
                <Text style={styles.entryMeta}>
                  {e.mealType} · {Math.round(e.calories)} kcal
                  {e.protein ? ` · ${Math.round(e.protein)}p` : ""}
                  {e.carbs ? ` ${Math.round(e.carbs)}c` : ""}
                  {e.fat ? ` ${Math.round(e.fat)}f` : ""}
                </Text>
              </View>
              <Pressable
                onPress={async () => {
                  await caloriesApi.remove(e.id);
                  await load();
                }}
                hitSlop={8}
              >
                <IconTrash size={17} color={colors.slate[300]} />
              </Pressable>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

function Macro({ label, value, target, color }: { label: string; value: number; target: number | null; color: string }) {
  const pct = target ? Math.min((value / target) * 100, 100) : 0;
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.macroLabel}>{label}</Text>
      <View style={styles.macroBar}>
        <View style={[styles.macroFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.macroValue}>
        {Math.round(value)}
        {target ? <Text style={{ color: colors.slate[400] }}> / {target}g</Text> : "g"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  warn: { marginBottom: 16, borderColor: colors.amber[200], backgroundColor: colors.amber[50] },
  warnTitle: { fontSize: text.base, fontWeight: "600", color: colors.amber[900] },
  warnBody: { marginTop: 4, fontSize: text.sm, color: colors.amber[800], lineHeight: 19 },
  rowEnd: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  label: { fontSize: text.sm, fontWeight: "500", color: colors.slate[500] },
  big: { marginTop: 4, fontSize: 30, fontWeight: "700", color: colors.slate[900] },
  of: { fontSize: text.md, fontWeight: "500", color: colors.slate[400] },
  remaining: { fontSize: text.sm, fontWeight: "600" },
  bar: { marginTop: 16, height: 12, borderRadius: radius.full, backgroundColor: colors.slate[100], overflow: "hidden" },
  barFill: { height: "100%", borderRadius: radius.full },
  macros: { flexDirection: "row", gap: 14, marginTop: 22 },
  macroLabel: { fontSize: text.xs, fontWeight: "500", color: colors.slate[500] },
  macroBar: { marginTop: 6, height: 6, borderRadius: radius.full, backgroundColor: colors.slate[100], overflow: "hidden" },
  macroFill: { height: "100%", borderRadius: radius.full },
  macroValue: { marginTop: 6, fontSize: text.xs, fontWeight: "600", color: colors.slate[700] },
  sectionTitle: { fontSize: text.md, fontWeight: "600", color: colors.slate[900] },
  mealRow: { flexDirection: "row", gap: 8 },
  meal: { flex: 1, borderWidth: 1, borderColor: colors.slate[200], borderRadius: radius.lg, paddingVertical: 10, alignItems: "center" },
  mealActive: { borderColor: colors.brand[500], backgroundColor: colors.brand[600] },
  mealText: { fontSize: text.xs, fontWeight: "600", color: colors.slate[600] },
  mealTextActive: { color: colors.white },
  none: { padding: 36, textAlign: "center", fontSize: text.sm, color: colors.slate[400] },
  entry: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 14 },
  divider: { borderTopWidth: 1, borderTopColor: colors.slate[100] },
  entryName: { fontSize: text.sm, fontWeight: "600", color: colors.slate[800] },
  entryMeta: { marginTop: 2, fontSize: text.xs, color: colors.slate[400], textTransform: "capitalize" },
});
