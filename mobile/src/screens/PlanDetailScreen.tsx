import React, { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { Screen } from "../components/Screen";
import { Card, Button, Input, Label, Spinner, ErrorBanner, Badge } from "../components/ui";
import { DayBadge, DurationBadge } from "../components/DayBadge";
import { MedicalDisclaimer } from "../components/MedicalDisclaimer";
import { AdSlot } from "../components/AdSlot";
import { plansApi } from "../api/plans";
import { extractErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { WorkoutPlan } from "../types";
import type { RootStackParamList } from "../navigation/types";
import { colors, radius, text } from "../theme";
import { useFocusEffect } from "@react-navigation/native";

export function PlanDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "PlanDetail">>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [sharing, setSharing] = useState(false);

  const load = useCallback(async () => {
    try {
      setPlan(await plansApi.get(route.params.planId));
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, [route.params.planId]);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load])
  );

  if (loading) return <Screen scroll={false}><Spinner /></Screen>;
  if (!plan) return <Screen><ErrorBanner message={error ?? "Plan not found"} /></Screen>;

  const isOwner = plan.createdBy.id === user?.id;

  const share = async () => {
    setSharing(true);
    setError(null);
    try {
      setPlan(await plansApi.share(plan.id, shareEmail.trim()));
      setShareEmail("");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSharing(false);
    }
  };

  const remove = () =>
    Alert.alert("Delete plan?", "This removes it for everyone it's shared with.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await plansApi.remove(plan.id);
          navigation.goBack();
        },
      },
    ]);

  return (
    <Screen>
      <ErrorBanner message={error} />

      <Text style={styles.name}>{plan.name}</Text>
      {plan.description ? <Text style={styles.desc}>{plan.description}</Text> : null}
      <View style={styles.tags}>
        {plan.isAiGenerated ? <Badge label="AI generated" /> : null}
        {plan.group ? <Badge label={plan.group.name} tone="green" /> : null}
        <Badge label={`by ${plan.createdBy.name}`} tone="slate" />
      </View>

      <View style={{ gap: 14, marginTop: 20 }}>
        {plan.days.map((d) => (
          <Card key={d.id ?? d.dayNumber}>
            <View style={styles.dayHead}>
              <DayBadge dayNumber={d.dayNumber} />
              <DurationBadge minutes={d.targetMinutes} />
            </View>
            <Text style={styles.dayTitle}>{d.title}</Text>

            <View style={{ marginTop: 12 }}>
              {d.exercises.map((ex, i) => (
                <View key={ex.id ?? i} style={[styles.ex, i > 0 && styles.exDivider]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exName}>{ex.name}</Text>
                    {ex.notes ? <Text style={styles.exNotes}>{ex.notes}</Text> : null}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.exSets}>
                      {ex.sets > 0 ? `${ex.sets} × ` : ""}
                      {ex.reps}
                    </Text>
                    {ex.restSeconds ? <Text style={styles.exRest}>{ex.restSeconds}s rest</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          </Card>
        ))}
      </View>

      {isOwner ? (
        <Card style={{ marginTop: 20 }}>
          <Text style={styles.sectionTitle}>Share with a friend</Text>
          <Text style={styles.sectionBody}>They'll see this plan in their Flex Track account.</Text>
          <Input
            value={shareEmail}
            onChangeText={setShareEmail}
            placeholder="friend@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            style={{ marginTop: 14 }}
          />
          <Button title="Share plan" onPress={share} loading={sharing} disabled={!shareEmail.trim()} style={{ marginTop: 12 }} />

          {plan.shares.length > 0 ? (
            <View style={styles.shares}>
              {plan.shares.map((s) => (
                <Text key={s.id} style={styles.shareName}>{s.user.name}</Text>
              ))}
            </View>
          ) : null}
        </Card>
      ) : null}

      {isOwner ? <Button title="Delete plan" variant="danger" style={{ marginTop: 16 }} onPress={remove} /> : null}

      <AdSlot placement="plan-detail" />
      <MedicalDisclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: text["2xl"] - 2, fontWeight: "700", color: colors.slate[900], letterSpacing: -0.4 },
  desc: { marginTop: 8, fontSize: text.base, color: colors.slate[600], lineHeight: 21 },
  tags: { flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap" },
  dayHead: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  dayTitle: { marginTop: 10, fontSize: text.base, fontWeight: "600", color: colors.slate[900] },
  ex: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 11 },
  exDivider: { borderTopWidth: 1, borderTopColor: colors.slate[100] },
  exName: { fontSize: text.sm, fontWeight: "500", color: colors.slate[800] },
  exNotes: { marginTop: 3, fontSize: text.xs, color: colors.slate[400], lineHeight: 17 },
  exSets: { fontSize: text.sm, fontWeight: "500", color: colors.slate[700] },
  exRest: { marginTop: 2, fontSize: text.xs, color: colors.slate[400] },
  sectionTitle: { fontSize: text.md, fontWeight: "600", color: colors.slate[900] },
  sectionBody: { marginTop: 4, fontSize: text.sm, color: colors.slate[500] },
  shares: { marginTop: 16, borderTopWidth: 1, borderTopColor: colors.slate[100], paddingTop: 14, gap: 6 },
  shareName: { fontSize: text.sm, color: colors.slate[700] },
});
