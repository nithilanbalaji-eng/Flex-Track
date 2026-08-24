import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { format, parseISO } from "date-fns";
import * as WebBrowser from "expo-web-browser";
import { Screen } from "../components/Screen";
import { Card, Button, Input, Label, ErrorBanner } from "../components/ui";
import { IconSparkles, IconChevronRight, IconApple, IconLogout, IconTrash } from "../components/icons";
import { authApi } from "../api/auth";
import { healthApi } from "../api/health";
import { extractErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ActivityLevel, Equipment, Experience, Goal, HealthSync, Sex } from "../types";
import { colors, radius, text } from "../theme";

const PRIVACY_URL = "https://flex-track-pi.vercel.app/privacy";

export function SettingsScreen() {
  const { user, setUser, logout } = useAuth();
  const navigation = useNavigation<any>();
  const [syncs, setSyncs] = useState<HealthSync[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const [form, setForm] = useState({
    name: user?.name ?? "",
    age: user?.age?.toString() ?? "",
    sex: (user?.sex ?? "") as Sex | "",
    heightCm: user?.heightCm?.toString() ?? "",
    weightKg: user?.weightKg?.toString() ?? "",
    goal: (user?.goal ?? "") as Goal | "",
    activityLevel: (user?.activityLevel ?? "") as ActivityLevel | "",
    experience: (user?.experience ?? "") as Experience | "",
    equipment: (user?.equipment ?? "") as Equipment | "",
  });

  useEffect(() => {
    healthApi.synced().then(setSyncs).catch(() => undefined);
  }, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const updated = await authApi.updateProfile({
        name: form.name,
        age: form.age ? Number(form.age) : undefined,
        sex: (form.sex || undefined) as Sex | undefined,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        goal: (form.goal || undefined) as Goal | undefined,
        activityLevel: (form.activityLevel || undefined) as ActivityLevel | undefined,
        experience: (form.experience || undefined) as Experience | undefined,
        equipment: (form.equipment || undefined) as Equipment | undefined,
      });
      setUser(updated);
      setOk(true);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    const usesPassword = user?.provider === "local";
    Alert.prompt?.(
      "Delete your account?",
      usesPassword
        ? "This permanently deletes your profile, logs, calorie entries and the plans you created — including for anyone you shared them with. Enter your password to confirm."
        : "This permanently deletes your profile, logs, calorie entries and the plans you created. Type DELETE to confirm.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async (value?: string) => {
            try {
              await authApi.deleteAccount(usesPassword ? { password: value } : { confirmation: value });
              await logout();
            } catch (err) {
              Alert.alert("Couldn't delete account", extractErrorMessage(err));
            }
          },
        },
      ],
      usesPassword ? "secure-text" : "plain-text"
    );
  };

  return (
    <Screen title="Settings" description="Your profile powers calorie targets and AI plan personalisation.">
      <ErrorBanner message={error} />

      <Pressable onPress={() => navigation.navigate("Premium")}>
        <Card style={[styles.premium, user?.isPremium ? styles.premiumActive : null]}>
          <View style={[styles.premiumIcon, user?.isPremium && { backgroundColor: colors.brand[600] }]}>
            <IconSparkles size={22} color={user?.isPremium ? colors.white : colors.slate[500]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.premiumTitle}>{user?.isPremium ? "Premium" : "Flex Track Premium"}</Text>
            <Text style={styles.premiumBody}>
              {user?.isPremium
                ? user.premiumUntil
                  ? `Renews ${format(parseISO(user.premiumUntil), "d MMM yyyy")}`
                  : "Active — no ads"
                : "Remove ads for $2.99/month"}
            </Text>
          </View>
          <IconChevronRight size={20} color={colors.slate[300]} />
        </Card>
      </Pressable>

      <Card style={{ marginTop: 16 }}>
        <Text style={styles.section}>Profile</Text>
        <View style={{ gap: 16, marginTop: 16 }}>
          <View>
            <Label>Name</Label>
            <Input value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
          </View>
          <View>
            <Label>Email</Label>
            <Input value={user?.email ?? ""} editable={false} style={{ backgroundColor: colors.slate[50], color: colors.slate[500] }} />
            <Text style={styles.hint}>
              Signed in with {user?.provider === "local" ? "email & password" : user?.provider}.
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Label>Age</Label>
              <Input value={form.age} onChangeText={(v) => setForm({ ...form, age: v })} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Label>Weight (kg)</Label>
              <Input value={form.weightKg} onChangeText={(v) => setForm({ ...form, weightKg: v })} keyboardType="decimal-pad" />
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Label>Height (cm)</Label>
              <Input value={form.heightCm} onChangeText={(v) => setForm({ ...form, heightCm: v })} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Label>Sex</Label>
              <Segmented
                value={form.sex}
                options={[["male", "M"], ["female", "F"], ["other", "Other"]]}
                onChange={(v) => setForm({ ...form, sex: v as Sex })}
              />
            </View>
          </View>

          <View>
            <Label>Goal</Label>
            <Segmented
              value={form.goal}
              wrap
              options={[
                ["muscle_gain", "Muscle"],
                ["fat_loss", "Fat loss"],
                ["strength", "Strength"],
                ["endurance", "Endurance"],
                ["maintenance", "Maintain"],
              ]}
              onChange={(v) => setForm({ ...form, goal: v as Goal })}
            />
          </View>

          <View>
            <Label>Activity level</Label>
            <Segmented
              value={form.activityLevel}
              wrap
              options={[
                ["sedentary", "Sedentary"],
                ["light", "Light"],
                ["moderate", "Moderate"],
                ["active", "Active"],
                ["very_active", "Athlete"],
              ]}
              onChange={(v) => setForm({ ...form, activityLevel: v as ActivityLevel })}
            />
          </View>

          <Button title={ok ? "Saved ✓" : "Save profile"} onPress={save} loading={saving} />
        </View>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <IconApple size={18} color={colors.slate[700]} />
          <Text style={styles.section}>Apple Health</Text>
        </View>
        <Text style={styles.sectionBody}>
          {syncs.length > 0
            ? `${syncs.length} workout${syncs.length === 1 ? "" : "s"} synced. Your burned calories flow into the gym log automatically.`
            : "Connect Apple Health so your workouts and burned calories flow in automatically."}
        </Text>
        <Text style={styles.hint}>
          Health data is never used for advertising and never sold.
        </Text>
      </Card>

      <Pressable onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)} style={styles.linkRow}>
        <Text style={styles.linkText}>Privacy Policy</Text>
        <IconChevronRight size={18} color={colors.slate[300]} />
      </Pressable>

      <Button title="Sign out" variant="secondary" style={{ marginTop: 20 }} icon={<IconLogout size={16} color={colors.slate[700]} />} onPress={logout} />

      <Card style={styles.danger}>
        <Text style={styles.section}>Delete account</Text>
        <Text style={styles.sectionBody}>
          Permanently removes your account and everything in it. This can't be undone.
        </Text>
        <Button
          title="Delete my account"
          variant="danger"
          style={{ marginTop: 14 }}
          icon={<IconTrash size={16} color={colors.white} />}
          onPress={confirmDelete}
        />
      </Card>
    </Screen>
  );
}

function Segmented({
  value,
  options,
  onChange,
  wrap,
}: {
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
  wrap?: boolean;
}) {
  return (
    <View style={[styles.segmented, wrap && { flexWrap: "wrap" }]}>
      {options.map(([val, label]) => (
        <Pressable
          key={val}
          onPress={() => onChange(val)}
          style={[styles.segment, wrap ? undefined : { flex: 1 }, value === val && styles.segmentActive]}
        >
          <Text style={[styles.segmentText, value === val && { color: colors.white }]} numberOfLines={1}>
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  premium: { flexDirection: "row", alignItems: "center", gap: 12 },
  premiumActive: { borderColor: colors.brand[200], backgroundColor: colors.brand[50] },
  premiumIcon: { width: 44, height: 44, borderRadius: radius.lg, backgroundColor: colors.slate[100], alignItems: "center", justifyContent: "center" },
  premiumTitle: { fontSize: text.base, fontWeight: "600", color: colors.slate[900] },
  premiumBody: { marginTop: 2, fontSize: text.sm, color: colors.slate[500] },
  section: { fontSize: text.md, fontWeight: "600", color: colors.slate[900] },
  sectionBody: { marginTop: 6, fontSize: text.sm, color: colors.slate[500], lineHeight: 19 },
  hint: { marginTop: 6, fontSize: text.xs, color: colors.slate[400], lineHeight: 16 },
  segmented: { flexDirection: "row", gap: 6, marginTop: 2 },
  segment: { borderWidth: 1, borderColor: colors.slate[200], borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 11, alignItems: "center", backgroundColor: colors.white },
  segmentActive: { backgroundColor: colors.brand[600], borderColor: colors.brand[600] },
  segmentText: { fontSize: text.xs, fontWeight: "600", color: colors.slate[600] },
  linkRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 18, paddingHorizontal: 4, marginTop: 8 },
  linkText: { fontSize: text.sm, color: colors.slate[600] },
  danger: { marginTop: 24, borderColor: colors.red[200] },
});
