import React, { useCallback, useState } from "react";
import { Alert, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Screen } from "../components/Screen";
import { Card, Button, Input, Spinner, EmptyState, Badge, ErrorBanner, Label } from "../components/ui";
import { AdSlot } from "../components/AdSlot";
import { IconPlus, IconUsers, IconChevronRight } from "../components/icons";
import { groupsApi } from "../api/groups";
import { extractErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Crew } from "../types";
import { colors, radius, text } from "../theme";

type Mode = "none" | "create" | "join";

export function CrewsScreen() {
  const { user } = useAuth();
  const [crews, setCrews] = useState<Crew[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("none");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setCrews(await groupsApi.list());
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

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      await groupsApi.create(name.trim());
      setName("");
      setMode("none");
      await load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      await groupsApi.join(code.trim().toUpperCase());
      setCode("");
      setMode("none");
      await load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const leave = (crew: Crew) =>
    Alert.alert("Leave crew?", `You'll lose access to plans shared with ${crew.name}.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          await groupsApi.leave(crew.id);
          await load();
        },
      },
    ]);

  /** Native share sheet - the whole point of being an app. */
  const invite = (crew: Crew) =>
    Share.share({
      message: `Join my crew "${crew.name}" on Flex Track — invite code ${crew.inviteCode}`,
    }).catch(() => undefined);

  if (loading) return <Screen scroll={false}><Spinner /></Screen>;

  return (
    <Screen
      title="Crews"
      description="The people you train with. Share plans, keep each other honest."
      onRefresh={refresh}
      refreshing={refreshing}
    >
      <ErrorBanner message={error} />

      {mode === "none" ? (
        <View style={styles.actions}>
          <Pressable style={{ flex: 1 }} onPress={() => setMode("create")}>
            <Card style={styles.action}>
              <View style={[styles.actionIcon, { backgroundColor: colors.brand[50] }]}>
                <IconPlus size={20} color={colors.brand[600]} />
              </View>
              <Text style={styles.actionTitle}>Create a crew</Text>
              <Text style={styles.actionBody}>Start one and invite your friends</Text>
            </Card>
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => setMode("join")}>
            <Card style={styles.action}>
              <View style={[styles.actionIcon, { backgroundColor: colors.emerald[50] }]}>
                <IconUsers size={20} color={colors.emerald[600]} />
              </View>
              <Text style={styles.actionTitle}>Join a crew</Text>
              <Text style={styles.actionBody}>Enter an invite code you were sent</Text>
            </Card>
          </Pressable>
        </View>
      ) : null}

      {mode === "create" ? (
        <Card style={{ marginBottom: 20 }}>
          <Text style={styles.formTitle}>Name your crew</Text>
          <Text style={styles.formBody}>You'll get an invite code to send to your training partners.</Text>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="Downtown Gym Crew"
            autoFocus
            style={{ marginTop: 16 }}
          />
          <View style={styles.formButtons}>
            <Button title="Create crew" onPress={create} loading={busy} style={{ flex: 1 }} />
            <Button title="Cancel" variant="secondary" onPress={() => setMode("none")} />
          </View>
        </Card>
      ) : null}

      {mode === "join" ? (
        <Card style={{ marginBottom: 20 }}>
          <Text style={styles.formTitle}>Enter invite code</Text>
          <Text style={styles.formBody}>Ask whoever created the crew to send you their code.</Text>
          <Input
            value={code}
            onChangeText={setCode}
            placeholder="ABC1234"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={10}
            autoFocus
            style={[styles.codeInput]}
          />
          <View style={styles.formButtons}>
            <Button title="Join crew" onPress={join} loading={busy} style={{ flex: 1 }} />
            <Button title="Cancel" variant="secondary" onPress={() => setMode("none")} />
          </View>
        </Card>
      ) : null}

      {crews.length === 0 ? (
        <EmptyState
          title="You're not in a crew yet"
          description="Training with people makes you show up. Create a crew and send the code to your gym friends."
        />
      ) : (
        <View style={{ gap: 16 }}>
          {crews.map((crew) => (
            <Card key={crew.id}>
              <View style={styles.crewHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.crewName} numberOfLines={1}>{crew.name}</Text>
                  <Text style={styles.crewMeta}>
                    {crew.members.length} {crew.members.length === 1 ? "member" : "members"}
                    {crew.myRole === "owner" ? " · you started it" : ""}
                  </Text>
                </View>
                <Text style={styles.leave} onPress={() => leave(crew)}>Leave</Text>
              </View>

              <Pressable style={styles.invite} onPress={() => invite(crew)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inviteLabel}>Invite code</Text>
                  <Text style={styles.inviteCode}>{crew.inviteCode}</Text>
                </View>
                <View style={styles.inviteCta}>
                  <Text style={styles.inviteCtaText}>Invite</Text>
                  <IconChevronRight size={16} color={colors.brand[600]} />
                </View>
              </Pressable>

              <View style={styles.members}>
                {crew.members.map((m) => (
                  <View key={m.id} style={styles.member}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberInitial}>{m.user.name[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {m.user.name}
                        {m.user.id === user?.id ? " (you)" : ""}
                      </Text>
                      <Text style={styles.memberEmail} numberOfLines={1}>{m.user.email}</Text>
                    </View>
                    {m.role === "owner" ? <Badge label="Owner" /> : null}
                  </View>
                ))}
              </View>
            </Card>
          ))}
        </View>
      )}

      <AdSlot placement="crews" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 12, marginBottom: 24 },
  action: { padding: 16, minHeight: 150 },
  actionIcon: { width: 40, height: 40, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  actionTitle: { fontSize: text.base, fontWeight: "600", color: colors.slate[900] },
  actionBody: { marginTop: 4, fontSize: text.xs, color: colors.slate[500], lineHeight: 16 },
  formTitle: { fontSize: text.base, fontWeight: "600", color: colors.slate[900] },
  formBody: { marginTop: 4, fontSize: text.sm, color: colors.slate[500], lineHeight: 19 },
  formButtons: { flexDirection: "row", gap: 8, marginTop: 12 },
  codeInput: { marginTop: 16, textAlign: "center", fontSize: 20, letterSpacing: 6, fontWeight: "600" },
  crewHead: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  crewName: { fontSize: text.base, fontWeight: "600", color: colors.slate[900] },
  crewMeta: { marginTop: 2, fontSize: text.xs, color: colors.slate[400] },
  leave: { fontSize: text.xs, fontWeight: "500", color: colors.slate[400] },
  invite: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.slate[300],
    borderRadius: radius.xl,
    backgroundColor: colors.slate[50],
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inviteLabel: { fontSize: text.xs, color: colors.slate[400] },
  inviteCode: { fontSize: text.md, fontWeight: "700", letterSpacing: 3, color: colors.slate[800] },
  inviteCta: { flexDirection: "row", alignItems: "center", gap: 2 },
  inviteCtaText: { fontSize: text.xs, fontWeight: "700", color: colors.brand[600] },
  members: { marginTop: 16, borderTopWidth: 1, borderTopColor: colors.slate[100], paddingTop: 16, gap: 12 },
  member: { flexDirection: "row", alignItems: "center", gap: 12 },
  memberAvatar: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" },
  memberInitial: { fontSize: text.sm, fontWeight: "600", color: colors.brand[700] },
  memberName: { fontSize: text.sm, fontWeight: "500", color: colors.slate[700] },
  memberEmail: { fontSize: text.xs, color: colors.slate[400] },
});
