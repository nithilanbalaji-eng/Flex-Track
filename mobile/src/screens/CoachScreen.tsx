import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Screen } from "../components/Screen";
import { Card, Button, Input, Label, ErrorBanner } from "../components/ui";
import { DayBadge, DurationBadge } from "../components/DayBadge";
import { MedicalDisclaimer } from "../components/MedicalDisclaimer";
import { IconSparkles } from "../components/icons";
import { aiApi, Questionnaire } from "../api/ai";
import { extractErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ActivityLevel, Equipment, Experience, GeneratedPlan, Goal, Sex } from "../types";
import { colors, radius, text } from "../theme";

const STEPS = ["About you", "Your goal", "Your training", "Your schedule", "Review"];
const DURATIONS = [30, 45, 60, 75, 90];
const DEFAULT_MINUTES = 60;

export function CoachScreen() {
  const { user, refreshUser } = useAuth();
  const navigation = useNavigation<any>();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Partial<Questionnaire>>({
    age: user?.age ?? undefined,
    sex: user?.sex ?? undefined,
    heightCm: user?.heightCm ?? undefined,
    weightKg: user?.weightKg ?? undefined,
    goal: user?.goal ?? undefined,
    experience: user?.experience ?? undefined,
    equipment: user?.equipment ?? undefined,
    activityLevel: user?.activityLevel ?? undefined,
    daysPerWeek: 4,
    saveProfile: true,
  });
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Questionnaire>(k: K, v: Questionnaire[K]) => setForm((p) => ({ ...p, [k]: v }));

  const days = form.daysPerWeek ?? 4;
  const minutesFor = (i: number) => form.dayMinutes?.[i] ?? DEFAULT_MINUTES;
  const setMinutesFor = (i: number, v: number) =>
    set("dayMinutes", Array.from({ length: days }, (_, idx) => (idx === i ? v : minutesFor(idx))));
  const setAllMinutes = (v: number) => set("dayMinutes", Array.from({ length: days }, () => v));

  const stepValid = () => {
    if (step === 0) return Boolean(form.age && form.sex && form.heightCm && form.weightKg);
    if (step === 1) return Boolean(form.goal && form.activityLevel);
    if (step === 2) return Boolean(form.experience && form.equipment && form.daysPerWeek);
    return true;
  };

  const generate = async () => {
    setError(null);
    setGenerating(true);
    try {
      const payload: Questionnaire = {
        ...(form as Questionnaire),
        dayMinutes: Array.from({ length: days }, (_, i) => minutesFor(i)),
      };
      setPlan(await aiApi.generatePlan(payload));
      if (form.saveProfile) await refreshUser();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      const saved = await aiApi.savePlan(plan);
      navigation.navigate("PlanDetail", { planId: saved.id });
    } catch (err) {
      setError(extractErrorMessage(err));
      setSaving(false);
    }
  };

  // ---------- Generated plan view ----------
  if (plan) {
    return (
      <Screen
        title="Your personalised plan"
        description={
          plan.source === "claude"
            ? "Designed by Flex Track's AI coach from your answers."
            : "Built by Flex Track's coaching engine from your answers."
        }
      >
        <ErrorBanner message={error} />

        <Card style={{ borderColor: colors.brand[200], backgroundColor: colors.brand[50] }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={styles.sparkle}>
              <IconSparkles size={20} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.planTitle}>{plan.name}</Text>
              <Text style={styles.planDesc}>{plan.description}</Text>
            </View>
          </View>
          <View style={styles.notes}>
            <Text style={styles.notesText}>
              <Text style={{ fontWeight: "700" }}>Coach's notes: </Text>
              {plan.coachNotes}
            </Text>
          </View>
        </Card>

        <View style={{ gap: 14, marginTop: 20 }}>
          {plan.days.map((d) => (
            <Card key={d.dayNumber}>
              <View style={styles.dayHead}>
                <DayBadge dayNumber={d.dayNumber} />
                <DurationBadge minutes={d.targetMinutes} />
                {d.estimatedMinutes != null ? (
                  <Text style={styles.est}>≈{d.estimatedMinutes} min planned</Text>
                ) : null}
              </View>
              <Text style={styles.dayTitle}>{d.title}</Text>

              <View style={{ marginTop: 12, gap: 10 }}>
                {d.exercises.map((ex, i) => (
                  <View key={i} style={[styles.ex, i > 0 && styles.exDivider]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.exName}>{ex.name}</Text>
                      {ex.notes ? <Text style={styles.exNotes}>{ex.notes}</Text> : null}
                    </View>
                    <Text style={styles.exSets}>
                      {ex.sets > 0 ? `${ex.sets} × ` : ""}
                      {ex.reps}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          ))}
        </View>

        <View style={{ gap: 12, marginTop: 20 }}>
          <Button title="Save to my plans" onPress={save} loading={saving} />
          <Button title="Start over" variant="secondary" onPress={() => setPlan(null)} />
        </View>

        <MedicalDisclaimer />
      </Screen>
    );
  }

  // ---------- Wizard ----------
  return (
    <Screen title="AI Coach" description="Answer a few questions and we'll design a programme around your body, goals and schedule.">
      <View style={styles.steps}>
        {STEPS.map((_, i) => (
          <React.Fragment key={i}>
            <View style={[styles.stepDot, i <= step && styles.stepDotActive]}>
              <Text style={[styles.stepNum, i <= step && { color: colors.white }]}>{i + 1}</Text>
            </View>
            {i < STEPS.length - 1 ? <View style={[styles.stepLine, i < step && { backgroundColor: colors.brand[600] }]} /> : null}
          </React.Fragment>
        ))}
      </View>

      <Card>
        <ErrorBanner message={error} />

        {step === 0 ? (
          <View style={{ gap: 16 }}>
            <Text style={styles.q}>Tell us about you</Text>
            <View>
              <Label>Age</Label>
              <Input value={form.age?.toString() ?? ""} onChangeText={(v) => set("age", Number(v) || undefined!)} keyboardType="number-pad" />
            </View>
            <View>
              <Label>Weight (kg)</Label>
              <Input value={form.weightKg?.toString() ?? ""} onChangeText={(v) => set("weightKg", Number(v) || undefined!)} keyboardType="decimal-pad" />
            </View>
            <View>
              <Label>Height (cm)</Label>
              <Input value={form.heightCm?.toString() ?? ""} onChangeText={(v) => set("heightCm", Number(v) || undefined!)} keyboardType="number-pad" />
            </View>
            <View>
              <Label>Sex</Label>
              <Choices<Sex>
                value={form.sex}
                onSelect={(v) => set("sex", v)}
                options={[
                  { value: "male", label: "Male" },
                  { value: "female", label: "Female" },
                  { value: "other", label: "Other" },
                ]}
                columns
              />
              <Text style={styles.hint}>Used only to estimate your metabolic rate.</Text>
            </View>
          </View>
        ) : null}

        {step === 1 ? (
          <View style={{ gap: 20 }}>
            <View>
              <Text style={styles.q}>What's your main goal?</Text>
              <Choices<Goal>
                value={form.goal}
                onSelect={(v) => set("goal", v)}
                options={[
                  { value: "muscle_gain", label: "Build muscle", sub: "Hypertrophy focus, moderate reps" },
                  { value: "fat_loss", label: "Lose fat", sub: "Higher reps, shorter rest" },
                  { value: "strength", label: "Get stronger", sub: "Heavy compounds, long rest" },
                  { value: "endurance", label: "Build endurance", sub: "High reps, conditioning" },
                  { value: "maintenance", label: "Stay in shape", sub: "Balanced training" },
                ]}
              />
            </View>
            <View>
              <Text style={styles.q}>How active is your day-to-day life?</Text>
              <Choices<ActivityLevel>
                value={form.activityLevel}
                onSelect={(v) => set("activityLevel", v)}
                options={[
                  { value: "sedentary", label: "Sedentary", sub: "Desk job, little movement" },
                  { value: "light", label: "Lightly active", sub: "Light exercise 1-3 days/week" },
                  { value: "moderate", label: "Moderately active", sub: "Exercise 3-5 days/week" },
                  { value: "active", label: "Very active", sub: "Hard exercise 6-7 days/week" },
                  { value: "very_active", label: "Athlete", sub: "Twice a day, or a physical job" },
                ]}
              />
            </View>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={{ gap: 20 }}>
            <View>
              <Text style={styles.q}>How much lifting experience do you have?</Text>
              <Choices<Experience>
                value={form.experience}
                onSelect={(v) => set("experience", v)}
                options={[
                  { value: "beginner", label: "Beginner", sub: "Under 1 year" },
                  { value: "intermediate", label: "Intermediate", sub: "1-3 years" },
                  { value: "advanced", label: "Advanced", sub: "3+ years" },
                ]}
              />
            </View>
            <View>
              <Text style={styles.q}>What equipment do you have?</Text>
              <Choices<Equipment>
                value={form.equipment}
                onSelect={(v) => set("equipment", v)}
                options={[
                  { value: "full_gym", label: "Full gym", sub: "Barbells, machines, cables" },
                  { value: "home_basic", label: "Home setup", sub: "Dumbbells, bands" },
                  { value: "bodyweight_only", label: "Bodyweight", sub: "No equipment" },
                ]}
              />
            </View>
            <View>
              <Label>How many days per week can you train?</Label>
              <View style={styles.dayPicker}>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <Pressable key={n} onPress={() => set("daysPerWeek", n)} style={[styles.dayBtn, days === n && styles.dayBtnActive]}>
                    <Text style={[styles.dayBtnText, days === n && { color: colors.white }]}>{n}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View>
              <Label>Any injuries or limitations? (optional)</Label>
              <Input
                value={form.injuries ?? ""}
                onChangeText={(v) => set("injuries", v)}
                placeholder="e.g. bad left shoulder, avoid overhead pressing"
                multiline
                style={{ minHeight: 72, textAlignVertical: "top" }}
              />
            </View>
          </View>
        ) : null}

        {step === 3 ? (
          <View style={{ gap: 16 }}>
            <View>
              <Text style={styles.q}>How long can you train each day?</Text>
              <Text style={styles.hint}>
                Some days you've got an hour and a half, some days half an hour. Set each one and your coach
                will size that session to fit.
              </Text>
            </View>

            <View style={styles.sameRow}>
              <Text style={styles.sameLabel}>Same every day:</Text>
              {DURATIONS.map((m) => (
                <Pressable key={m} onPress={() => setAllMinutes(m)} style={styles.samePill}>
                  <Text style={styles.samePillText}>{m}m</Text>
                </Pressable>
              ))}
            </View>

            {Array.from({ length: days }, (_, i) => (
              <View key={i} style={styles.dayCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.dayCardTitle}>Day {i + 1}</Text>
                  <Text style={styles.dayCardMins}>{minutesFor(i)} min</Text>
                </View>
                <View style={styles.durationRow}>
                  {DURATIONS.map((m) => (
                    <Pressable
                      key={m}
                      onPress={() => setMinutesFor(i, m)}
                      style={[styles.durationBtn, minutesFor(i) === m && styles.durationBtnActive]}
                    >
                      <Text style={[styles.durationText, minutesFor(i) === m && { color: colors.white }]}>{m}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {step === 4 ? (
          <View style={{ gap: 12 }}>
            <Text style={styles.q}>Ready to build your plan</Text>
            <Review label="Age" value={form.age} />
            <Review label="Weight" value={form.weightKg ? `${form.weightKg} kg` : undefined} />
            <Review label="Height" value={form.heightCm ? `${form.heightCm} cm` : undefined} />
            <Review label="Goal" value={form.goal?.replace("_", " ")} />
            <Review label="Experience" value={form.experience} />
            <Review label="Equipment" value={form.equipment?.replace("_", " ")} />
            <Review label="Days per week" value={form.daysPerWeek} />
            <Review label="Session lengths" value={Array.from({ length: days }, (_, i) => `${minutesFor(i)}m`).join(" · ")} />
            <Review label="Limitations" value={form.injuries || "None"} />
          </View>
        ) : null}

        <View style={styles.nav}>
          <Button title="Back" variant="secondary" disabled={step === 0} onPress={() => setStep((s) => Math.max(0, s - 1))} />
          {step < STEPS.length - 1 ? (
            <Button title="Continue" disabled={!stepValid()} onPress={() => setStep((s) => s + 1)} style={{ flex: 1 }} />
          ) : (
            <Button
              title="Generate my plan"
              loading={generating}
              onPress={generate}
              style={{ flex: 1 }}
              icon={<IconSparkles size={16} color={colors.white} />}
            />
          )}
        </View>
      </Card>

      <MedicalDisclaimer />
    </Screen>
  );
}

function Choices<T extends string>({
  value,
  onSelect,
  options,
  columns,
}: {
  value: T | undefined;
  onSelect: (v: T) => void;
  options: { value: T; label: string; sub?: string }[];
  columns?: boolean;
}) {
  return (
    <View style={[{ gap: 10, marginTop: 10 }, columns && { flexDirection: "row" }]}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onSelect(o.value)}
            style={[styles.choice, columns && { flex: 1, alignItems: "center" }, active && styles.choiceActive]}
          >
            <Text style={[styles.choiceLabel, active && { color: colors.brand[800] }]}>{o.label}</Text>
            {o.sub ? <Text style={styles.choiceSub}>{o.sub}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function Review({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <View style={styles.review}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value ?? "—"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  stepDot: { width: 30, height: 30, borderRadius: radius.full, backgroundColor: colors.slate[200], alignItems: "center", justifyContent: "center" },
  stepDotActive: { backgroundColor: colors.brand[600] },
  stepNum: { fontSize: text.xs, fontWeight: "700", color: colors.slate[500] },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.slate[200] },
  q: { fontSize: text.md, fontWeight: "600", color: colors.slate[900], marginBottom: 2 },
  hint: { marginTop: 6, fontSize: text.sm, color: colors.slate[500], lineHeight: 19 },
  choice: { borderWidth: 1, borderColor: colors.slate[200], borderRadius: radius.xl, padding: 14, backgroundColor: colors.white },
  choiceActive: { borderColor: colors.brand[500], backgroundColor: colors.brand[50] },
  choiceLabel: { fontSize: text.base, fontWeight: "600", color: colors.slate[800] },
  choiceSub: { marginTop: 3, fontSize: text.sm, color: colors.slate[500] },
  dayPicker: { flexDirection: "row", gap: 8, marginTop: 10 },
  dayBtn: { flex: 1, height: 44, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.slate[200], alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  dayBtnActive: { backgroundColor: colors.brand[600], borderColor: colors.brand[600] },
  dayBtnText: { fontSize: text.base, fontWeight: "600", color: colors.slate[600] },
  sameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", backgroundColor: colors.slate[50], borderRadius: radius.lg, padding: 12 },
  sameLabel: { fontSize: text.xs, fontWeight: "500", color: colors.slate[500] },
  samePill: { borderWidth: 1, borderColor: colors.slate[200], borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.white },
  samePillText: { fontSize: text.xs, fontWeight: "600", color: colors.slate[600] },
  dayCard: { borderWidth: 1, borderColor: colors.slate[200], borderRadius: radius.xl, padding: 12 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  dayCardTitle: { fontSize: text.sm, fontWeight: "600", color: colors.slate[800] },
  dayCardMins: { fontSize: text.sm, fontWeight: "600", color: colors.brand[600] },
  durationRow: { flexDirection: "row", gap: 6 },
  durationBtn: { flex: 1, height: 40, borderRadius: radius.md, borderWidth: 1, borderColor: colors.slate[200], alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  durationBtnActive: { backgroundColor: colors.brand[600], borderColor: colors.brand[600] },
  durationText: { fontSize: text.sm, fontWeight: "600", color: colors.slate[600] },
  review: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.slate[100], paddingBottom: 8 },
  reviewLabel: { fontSize: text.sm, color: colors.slate[500] },
  reviewValue: { fontSize: text.sm, fontWeight: "500", color: colors.slate[800], textTransform: "capitalize", flexShrink: 1, textAlign: "right" },
  nav: { flexDirection: "row", gap: 10, marginTop: 24, borderTopWidth: 1, borderTopColor: colors.slate[100], paddingTop: 20 },
  sparkle: { width: 38, height: 38, borderRadius: radius.lg, backgroundColor: colors.brand[600], alignItems: "center", justifyContent: "center" },
  planTitle: { fontSize: text.md, fontWeight: "700", color: colors.slate[900] },
  planDesc: { marginTop: 4, fontSize: text.sm, color: colors.slate[600], lineHeight: 19 },
  notes: { marginTop: 14, backgroundColor: "rgba(255,255,255,0.7)", borderRadius: radius.lg, padding: 12 },
  notesText: { fontSize: text.sm, color: colors.slate[600], lineHeight: 20 },
  dayHead: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  est: { fontSize: text.xs, color: colors.slate[400] },
  dayTitle: { marginTop: 10, fontSize: text.base, fontWeight: "600", color: colors.slate[900] },
  ex: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingTop: 10 },
  exDivider: { borderTopWidth: 1, borderTopColor: colors.slate[100] },
  exName: { fontSize: text.sm, fontWeight: "500", color: colors.slate[800] },
  exNotes: { marginTop: 3, fontSize: text.xs, color: colors.slate[400], lineHeight: 17 },
  exSets: { fontSize: text.sm, color: colors.slate[600], fontWeight: "500" },
});
