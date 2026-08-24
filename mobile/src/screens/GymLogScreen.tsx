import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { addDays, format, isSameDay, parseISO, startOfWeek, subDays } from "date-fns";
import { Screen } from "../components/Screen";
import { Card, Button, Input, Label, Spinner, ErrorBanner } from "../components/ui";
import { StatCard } from "../components/StatCard";
import { AdSlot } from "../components/AdSlot";
import { IconFlame, IconCalendarCheck, IconTrash, IconDumbbell } from "../components/icons";
import { logsApi } from "../api/logs";
import { plansApi } from "../api/plans";
import { extractErrorMessage } from "../api/client";
import { GymLog, GymLogSummary, LogRange, WorkoutPlan } from "../types";
import { colors, radius, text } from "../theme";

const RANGES: { value: LogRange; label: string; weeks: number }[] = [
  { value: "week", label: "1W", weeks: 1 },
  { value: "month", label: "1M", weeks: 5 },
  { value: "6months", label: "6M", weeks: 26 },
  { value: "year", label: "1Y", weeks: 53 },
];

export function GymLogScreen() {
  const [logs, setLogs] = useState<GymLog[]>([]);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [summary, setSummary] = useState<GymLogSummary | null>(null);
  const [range, setRange] = useState<LogRange>("6months");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [duration, setDuration] = useState("60");
  const [calories, setCalories] = useState("");
  const [notes, setNotes] = useState("");
  const [planDayId, setPlanDayId] = useState<string>("");

  const load = useCallback(
    async (r: LogRange = range) => {
      try {
        const [l, s, p] = await Promise.all([logsApi.list(r), logsApi.summary(), plansApi.list()]);
        setLogs(l);
        setSummary(s);
        setPlans(p);
        setError(null);
      } catch (err) {
        setError(extractErrorMessage(err));
      }
    },
    [range]
  );

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load])
  );

  const changeRange = async (r: LogRange) => {
    setRange(r);
    await load(r);
  };

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const loggedDays = useMemo(() => {
    const map = new Map<string, GymLog>();
    for (const l of logs) map.set(l.date.slice(0, 10), l);
    return map;
  }, [logs]);

  const weeksShown = RANGES.find((r) => r.value === range)?.weeks ?? 26;

  const weeks = useMemo(() => {
    const start = startOfWeek(subDays(new Date(), weeksShown * 7), { weekStartsOn: 0 });
    const out: Date[][] = [];
    let cursor = start;
    for (let w = 0; w < weeksShown + 1; w++) {
      const week: Date[] = [];
      for (let d = 0; d < 7; d++) {
        week.push(cursor);
        cursor = addDays(cursor, 1);
      }
      out.push(week);
    }
    return out;
  }, [weeksShown]);

  const dayOptions = useMemo(
    () =>
      plans.flatMap((p) =>
        p.days.map((d) => ({ id: d.id!, label: `${p.name} — Day ${d.dayNumber}: ${d.title}` }))
      ),
    [plans]
  );

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await logsApi.create({
        date: new Date(`${date}T12:00:00`).toISOString(),
        durationMinutes: duration ? Number(duration) : undefined,
        caloriesBurned: calories ? Number(calories) : undefined,
        notes: notes || undefined,
        planDayId: planDayId || undefined,
      });
      setNotes("");
      setCalories("");
      setPlanDayId("");
      await load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Screen scroll={false}><Spinner /></Screen>;

  const today = new Date();

  return (
    <Screen
      title="Gym Log"
      description="Check in every time you train. Consistency is the whole game."
      onRefresh={refresh}
      refreshing={refreshing}
    >
      <ErrorBanner message={error} />

      <View style={styles.grid}>
        <StatCard label="Current streak" value={`${summary?.currentStreak ?? 0} ${summary?.currentStreak === 1 ? "day" : "days"}`} accent="orange" icon={(c) => <IconFlame size={20} color={c} />} />
        <StatCard label="Longest streak" value={`${summary?.longestStreak ?? 0} ${summary?.longestStreak === 1 ? "day" : "days"}`} accent="purple" icon={(c) => <IconFlame size={20} color={c} />} />
      </View>
      <View style={styles.grid}>
        <StatCard label="Last 30 days" value={summary?.sessionsLast30Days ?? 0} accent="green" icon={(c) => <IconCalendarCheck size={20} color={c} />} />
        <StatCard label="All time" value={summary?.totalSessions ?? 0} icon={(c) => <IconCalendarCheck size={20} color={c} />} />
      </View>

      <Card style={{ marginTop: 12 }}>
        <View style={styles.historyHead}>
          <Text style={styles.sectionTitle}>History</Text>
          <View style={styles.segment}>
            {RANGES.map((r) => (
              <Pressable
                key={r.value}
                onPress={() => changeRange(r.value)}
                style={[styles.segmentBtn, range === r.value && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, range === r.value && styles.segmentTextActive]}>{r.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {range === "week" ? (
          <View style={styles.weekRow}>
            {weeks[weeks.length - 1].map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const logged = loggedDays.has(key);
              const future = day > today;
              return (
                <View key={key} style={{ flex: 1, alignItems: "center" }}>
                  <Text style={styles.weekDayLabel}>{format(day, "EEEEE")}</Text>
                  <View
                    style={[
                      styles.weekCell,
                      future ? styles.cellFuture : logged ? styles.cellLogged : styles.cellRest,
                      isSameDay(day, today) && !logged ? styles.cellToday : null,
                    ]}
                  >
                    <Text style={[styles.weekCellText, logged && { color: colors.white }]}>{format(day, "d")}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.heatmap}>
            {weeks.map((week, wi) => (
              <View key={wi} style={{ gap: 3 }}>
                {week.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const logged = loggedDays.has(key);
                  const future = day > today;
                  return (
                    <View
                      key={key}
                      style={[
                        styles.dot,
                        future ? { backgroundColor: "transparent" } : logged ? { backgroundColor: colors.brand[500] } : { backgroundColor: colors.slate[100] },
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </Card>

      <Card style={{ marginTop: 20 }}>
        <Text style={styles.sectionTitle}>Log a session</Text>

        <View style={{ marginTop: 16, gap: 16 }}>
          <View>
            <Label>Date</Label>
            <Input value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" autoCapitalize="none" />
          </View>

          <View>
            <Label>What did you train?</Label>
            {dayOptions.length === 0 ? (
              <Text style={styles.noPlans}>No workout plans yet — create one and you'll be able to tag each session.</Text>
            ) : (
              <View style={{ gap: 8 }}>
                <Pressable
                  onPress={() => setPlanDayId("")}
                  style={[styles.option, planDayId === "" && styles.optionActive]}
                >
                  <Text style={[styles.optionText, planDayId === "" && styles.optionTextActive]}>Not following a plan</Text>
                </Pressable>
                {dayOptions.map((o) => (
                  <Pressable
                    key={o.id}
                    onPress={() => setPlanDayId(o.id)}
                    style={[styles.option, planDayId === o.id && styles.optionActive]}
                  >
                    <Text style={[styles.optionText, planDayId === o.id && styles.optionTextActive]} numberOfLines={2}>
                      {o.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Label>Duration (min)</Label>
              <Input value={duration} onChangeText={setDuration} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Label>Calories burned</Label>
              <Input value={calories} onChangeText={setCalories} keyboardType="number-pad" placeholder="optional" />
            </View>
          </View>

          <View>
            <Label>Notes</Label>
            <Input
              value={notes}
              onChangeText={setNotes}
              placeholder="Hit a PR on bench today 💪"
              multiline
              style={{ minHeight: 72, textAlignVertical: "top" }}
            />
          </View>

          <Button title="Check in" onPress={submit} loading={saving} />
        </View>
      </Card>

      <AdSlot placement="gym-log" />

      <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Recent sessions</Text>
      <Card style={{ padding: 0 }}>
        {logs.length === 0 ? (
          <Text style={styles.none}>Nothing logged in this range. Check in above!</Text>
        ) : (
          logs.map((log, i) => (
            <View key={log.id} style={[styles.logRow, i > 0 && styles.divider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.logDate}>{format(parseISO(log.date), "EEEE, d MMMM yyyy")}</Text>
                {log.planDay ? (
                  <View style={styles.planTag}>
                    <IconDumbbell size={13} color={colors.brand[700]} />
                    <Text style={styles.planTagText} numberOfLines={1}>
                      Day {log.planDay.dayNumber}: {log.planDay.title}
                    </Text>
                  </View>
                ) : null}
                <Text style={styles.logMeta}>
                  {log.durationMinutes ? `${log.durationMinutes} min` : "Session"}
                  {log.caloriesBurned != null ? ` · ${Math.round(log.caloriesBurned)} kcal` : ""}
                  {log.source === "apple_health" ? " · Apple Health" : ""}
                </Text>
                {log.notes ? <Text style={styles.logNotes}>{log.notes}</Text> : null}
              </View>
              <Pressable
                onPress={async () => {
                  await logsApi.remove(log.id);
                  await load();
                }}
                hitSlop={8}
                accessibilityLabel="Delete log"
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

const styles = StyleSheet.create({
  grid: { flexDirection: "row", gap: 12, marginBottom: 12 },
  sectionTitle: { fontSize: text.md, fontWeight: "600", color: colors.slate[900] },
  historyHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  segment: { flexDirection: "row", backgroundColor: colors.slate[100], borderRadius: radius.md, padding: 2 },
  segmentBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.sm },
  segmentActive: { backgroundColor: colors.white },
  segmentText: { fontSize: text.xs, fontWeight: "600", color: colors.slate[500] },
  segmentTextActive: { color: colors.brand[600] },
  weekRow: { flexDirection: "row", gap: 6 },
  weekDayLabel: { fontSize: 10, fontWeight: "500", color: colors.slate[400], marginBottom: 4, textTransform: "uppercase" },
  weekCell: { width: "100%", height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  weekCellText: { fontSize: text.sm, fontWeight: "600", color: colors.slate[400] },
  cellLogged: { backgroundColor: colors.brand[600] },
  cellRest: { backgroundColor: colors.slate[100] },
  cellFuture: { backgroundColor: colors.slate[50] },
  cellToday: { borderWidth: 2, borderColor: colors.brand[500] },
  heatmap: { flexDirection: "row", gap: 3, flexWrap: "wrap" },
  dot: { width: 11, height: 11, borderRadius: 3 },
  noPlans: { backgroundColor: colors.slate[50], borderRadius: radius.lg, padding: 14, fontSize: text.sm, color: colors.slate[400], lineHeight: 19 },
  option: { borderWidth: 1, borderColor: colors.slate[200], borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.white },
  optionActive: { borderColor: colors.brand[500], backgroundColor: colors.brand[50] },
  optionText: { fontSize: text.sm, color: colors.slate[700] },
  optionTextActive: { color: colors.brand[800], fontWeight: "600" },
  none: { padding: 40, textAlign: "center", fontSize: text.sm, color: colors.slate[400] },
  logRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 18, paddingVertical: 16 },
  divider: { borderTopWidth: 1, borderTopColor: colors.slate[100] },
  logDate: { fontSize: text.sm, fontWeight: "600", color: colors.slate[800] },
  planTag: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 },
  planTagText: { flex: 1, fontSize: text.xs, fontWeight: "500", color: colors.brand[700] },
  logMeta: { marginTop: 3, fontSize: text.xs, color: colors.slate[400] },
  logNotes: { marginTop: 6, fontSize: text.sm, color: colors.slate[600], lineHeight: 19 },
});
