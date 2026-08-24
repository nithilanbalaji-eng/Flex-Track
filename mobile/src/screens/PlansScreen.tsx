import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { format, parseISO } from "date-fns";
import { Screen } from "../components/Screen";
import { Card, Button, Spinner, EmptyState, Badge, ErrorBanner } from "../components/ui";
import { AdSlot } from "../components/AdSlot";
import { MedicalDisclaimer } from "../components/MedicalDisclaimer";
import { IconChevronRight, IconSparkles } from "../components/icons";
import { plansApi } from "../api/plans";
import { extractErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { WorkoutPlan } from "../types";
import { colors, text } from "../theme";

export function PlansScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setPlans(await plansApi.list());
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, []);

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

  if (loading) return <Screen scroll={false}><Spinner /></Screen>;

  const mine = plans.filter((p) => p.createdBy.id === user?.id);
  const shared = plans.filter((p) => p.createdBy.id !== user?.id);

  return (
    <Screen
      title="Workout Plans"
      description="Plans you've built, plus everything your crew has shared with you."
      onRefresh={refresh}
      refreshing={refreshing}
    >
      <ErrorBanner message={error} />

      <Button
        title="Generate with AI"
        icon={<IconSparkles size={16} color={colors.white} />}
        style={{ marginBottom: 20 }}
        onPress={() => navigation.navigate("Coach")}
      />

      {plans.length === 0 ? (
        <EmptyState
          title="No workout plans yet"
          description="Answer a few questions and the AI coach will build one around your goals and schedule."
        />
      ) : (
        <>
          <PlanSection title="Created by you" plans={mine} onOpen={(id) => navigation.navigate("PlanDetail", { planId: id })} />
          <PlanSection title="Shared with you" plans={shared} onOpen={(id) => navigation.navigate("PlanDetail", { planId: id })} />
        </>
      )}

      <AdSlot placement="plans" />
      <MedicalDisclaimer />
    </Screen>
  );
}

function PlanSection({
  title,
  plans,
  onOpen,
}: {
  title: string;
  plans: WorkoutPlan[];
  onOpen: (id: string) => void;
}) {
  if (plans.length === 0) return null;
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ gap: 12 }}>
        {plans.map((plan) => (
          <Pressable key={plan.id} onPress={() => onOpen(plan.id)}>
            <Card>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={2}>{plan.name}</Text>
                  <Text style={styles.meta}>
                    {plan.daysPerWeek ?? plan.days.length} days/week · updated{" "}
                    {format(parseISO(plan.updatedAt), "d MMM yyyy")}
                  </Text>
                </View>
                <IconChevronRight size={18} color={colors.slate[300]} />
              </View>
              <View style={styles.tags}>
                {plan.isAiGenerated ? <Badge label="AI generated" /> : null}
                {plan.group ? <Badge label={plan.group.name} tone="green" /> : null}
                {plan.shares.length > 0 ? <Badge label={`Shared with ${plan.shares.length}`} tone="slate" /> : null}
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: text.md, fontWeight: "600", color: colors.slate[900], marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  name: { fontSize: text.base, fontWeight: "600", color: colors.slate[900] },
  meta: { marginTop: 4, fontSize: text.xs, color: colors.slate[500] },
  tags: { flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap" },
});
