import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { format, parseISO } from "date-fns";
import { Screen } from "../components/Screen";
import { Card, Button, Spinner, EmptyState, Badge } from "../components/ui";
import { StatCard } from "../components/StatCard";
import { AdSlot } from "../components/AdSlot";
import { IconFlame, IconCalendarCheck, IconDumbbell, IconUtensils, IconChevronRight, IconSettings } from "../components/icons";
import { useAuth } from "../context/AuthContext";
import { logsApi } from "../api/logs";
import { plansApi } from "../api/plans";
import { caloriesApi, DaySummary } from "../api/calories";
import { GymLog, GymLogSummary, WorkoutPlan } from "../types";
import { colors, radius, text } from "../theme";

export function DashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [summary, setSummary] = useState<GymLogSummary | null>(null);
  const [logs, setLogs] = useState<GymLog[]>([]);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [today, setToday] = useState<DaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const [s, l, p, c] = await Promise.all([
      logsApi.summary(),
      logsApi.list("month"),
      plansApi.list(),
      caloriesApi.getDay(todayStr),
    ]);
    setSummary(s);
    setLogs(l.slice(0, 5));
    setPlans(p.slice(0, 3));
    setToday(c);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load()
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }, [load])
  );

  const refresh = async () => {
    setRefreshing(true);
    await load().catch(() => undefined);
    setRefreshing(false);
  };

  if (loading) return <Screen scroll={false}><Spinner /></Screen>;

  const target = today?.target?.target ?? null;
  const pct = target ? Math.min(Math.round(((today?.totals.calories ?? 0) / target) * 100), 100) : 0;
  const needsProfile = !user?.age || !user?.weightKg || !user?.heightCm;

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <View style={styles.greetRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Hey, {user?.name?.split(" ")[0]} 👋</Text>
          <Text style={styles.sub}>Here's how your training is going.</Text>
        </View>
        <Pressable onPress={() => navigation.navigate("Settings")} style={styles.avatar} accessibilityLabel="Settings">
          <IconSettings size={20} color={colors.brand[700]} />
        </Pressable>
      </View>

      {needsProfile ? (
        <Card style={styles.prompt}>
          <Text style={styles.promptTitle}>Finish setting up your profile</Text>
          <Text style={styles.promptBody}>
            Add your age, height and weight so we can calculate calorie targets and personalise your plans.
          </Text>
          <Button title="Complete profile" style={{ marginTop: 12 }} onPress={() => navigation.navigate("Settings")} />
        </Card>
      ) : null}

      <View style={styles.grid}>
        <StatCard
          label="Current streak"
          value={`${summary?.currentStreak ?? 0} ${summary?.currentStreak === 1 ? "day" : "days"}`}
          hint={`Longest: ${summary?.longestStreak ?? 0}`}
          accent="orange"
          icon={(c) => <IconFlame size={20} color={c} />}
        />
        <StatCard
          label="Sessions (30 days)"
          value={summary?.sessionsLast30Days ?? 0}
          hint={`${summary?.totalSessions ?? 0} all time`}
          accent="green"
          icon={(c) => <IconCalendarCheck size={20} color={c} />}
        />
      </View>
      <View style={styles.grid}>
        <StatCard
          label="Calories today"
          value={Math.round(today?.totals.calories ?? 0)}
          hint={target ? `${pct}% of ${target}` : "Set your profile"}
          icon={(c) => <IconUtensils size={20} color={c} />}
        />
        <StatCard
          label="Calories burned"
          value={Math.round(summary?.totalCaloriesBurned ?? 0)}
          hint="Logged + Apple Health"
          accent="purple"
          icon={(c) => <IconDumbbell size={20} color={c} />}
        />
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Your workout plans</Text>
        <Text style={styles.sectionLink} onPress={() => navigation.navigate("Plans")}>
          View all
        </Text>
      </View>

      {plans.length === 0 ? (
        <EmptyState
          title="No workout plans yet"
          description="Build one from scratch, or let the AI coach design a plan around your goals."
          action={<Button title="Generate with AI" onPress={() => navigation.navigate("Coach")} />}
        />
      ) : (
        <View style={{ gap: 12 }}>
          {plans.map((plan) => (
            <Pressable key={plan.id} onPress={() => navigation.navigate("PlanDetail", { planId: plan.id })}>
              <Card>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planName} numberOfLines={1}>{plan.name}</Text>
                    <Text style={styles.planMeta}>
                      {plan.daysPerWeek ?? plan.days.length} days/week · by {plan.createdBy.name}
                    </Text>
                  </View>
                  <IconChevronRight size={18} color={colors.slate[300]} />
                </View>
                <View style={styles.tags}>
                  {plan.isAiGenerated ? <Badge label="AI generated" /> : null}
                  {plan.group ? <Badge label={plan.group.name} tone="green" /> : null}
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Recent sessions</Text>
        <Text style={styles.sectionLink} onPress={() => navigation.navigate("Log")}>
          Log one
        </Text>
      </View>

      <Card style={{ padding: 0 }}>
        {logs.length === 0 ? (
          <Text style={styles.none}>No sessions logged yet.</Text>
        ) : (
          logs.map((log, i) => (
            <View key={log.id} style={[styles.logRow, i > 0 && styles.logDivider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.logDate}>{format(parseISO(log.date), "EEE, d MMM")}</Text>
                <Text style={styles.logMeta}>
                  {log.planDay ? `Day ${log.planDay.dayNumber}: ${log.planDay.title}` : log.durationMinutes ? `${log.durationMinutes} min` : "Session"}
                </Text>
              </View>
              {log.caloriesBurned != null ? (
                <Text style={styles.kcal}>{Math.round(log.caloriesBurned)} kcal</Text>
              ) : null}
            </View>
          ))
        )}
      </Card>

      <AdSlot placement="dashboard" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  greetRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  greeting: { fontSize: text.xl, fontWeight: "700", color: colors.slate[900] },
  sub: { marginTop: 2, fontSize: text.sm, color: colors.slate[500] },
  avatar: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" },
  prompt: { marginBottom: 16, borderColor: colors.brand[200], backgroundColor: colors.brand[50] },
  promptTitle: { fontSize: text.base, fontWeight: "600", color: colors.brand[900] },
  promptBody: { marginTop: 4, fontSize: text.sm, color: colors.brand[800], lineHeight: 19 },
  grid: { flexDirection: "row", gap: 12, marginBottom: 12 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 12 },
  sectionTitle: { fontSize: text.md, fontWeight: "600", color: colors.slate[900] },
  sectionLink: { fontSize: text.sm, fontWeight: "500", color: colors.brand[600] },
  rowBetween: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  planName: { fontSize: text.base, fontWeight: "600", color: colors.slate[900] },
  planMeta: { marginTop: 4, fontSize: text.xs, color: colors.slate[500] },
  tags: { flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap" },
  none: { padding: 32, textAlign: "center", fontSize: text.sm, color: colors.slate[400] },
  logRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 14 },
  logDivider: { borderTopWidth: 1, borderTopColor: colors.slate[100] },
  logDate: { fontSize: text.sm, fontWeight: "600", color: colors.slate[800] },
  logMeta: { marginTop: 2, fontSize: text.xs, color: colors.slate[400] },
  kcal: { fontSize: text.xs, fontWeight: "600", color: colors.orange[600] },
});
