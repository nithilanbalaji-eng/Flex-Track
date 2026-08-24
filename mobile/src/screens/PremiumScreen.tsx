import React, { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { format, parseISO } from "date-fns";
import { Screen } from "../components/Screen";
import { Card, Button, Spinner, ErrorBanner } from "../components/ui";
import { IconSparkles, IconCheck } from "../components/icons";
import { subscriptionApi } from "../api/subscription";
import { extractErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { usePurchases } from "../hooks/usePurchases";
import { SubscriptionStatus } from "../types";
import { colors, radius, text } from "../theme";

const BENEFITS = [
  { title: "No ads, anywhere", body: "Every placement disappears the moment you subscribe." },
  { title: "Unlimited AI plans", body: "Regenerate and refine your programme as often as you like." },
  { title: "Full training history", body: "Keep your entire log instead of the last 12 months." },
  { title: "Support development", body: "Flex Track is built by one person. Subscriptions keep it running." },
];

export function PremiumScreen() {
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reloadStatus = useCallback(async () => {
    setStatus(await subscriptionApi.status());
    await refreshUser();
  }, [refreshUser]);

  const store = usePurchases(reloadStatus);

  useEffect(() => {
    subscriptionApi
      .status()
      .then(setStatus)
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const restore = async () => {
    setBusy(true);
    const result = await store.restore();
    setBusy(false);
    Alert.alert(result.restored ? "Restored" : "Nothing to restore", result.message);
  };

  if (loading) return <Screen scroll={false}><Spinner /></Screen>;

  // ---------- Subscribed ----------
  if (status?.isPremium) {
    return (
      <Screen title="Flex Track Premium" description="Thanks for supporting the app.">
        <ErrorBanner message={error} />
        <Card style={{ borderColor: colors.brand[200], backgroundColor: colors.brand[50] }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={styles.icon}>
              <IconSparkles size={22} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activeTitle}>Premium is active</Text>
              {status.premiumUntil ? (
                <Text style={styles.activeBody}>
                  {status.store === "apple" ? "Renews" : "Active until"}{" "}
                  {format(parseISO(status.premiumUntil), "d MMMM yyyy")}
                </Text>
              ) : null}
            </View>
          </View>
        </Card>

        {status.store === "apple" ? (
          <>
            <Button title="Manage subscription" variant="secondary" style={{ marginTop: 16 }} onPress={store.manage} />
            <Text style={styles.manageNote}>
              Subscriptions are managed by Apple. Cancelling opens Settings › your name › Subscriptions.
            </Text>
          </>
        ) : (
          <Button
            title="Cancel subscription"
            variant="secondary"
            style={{ marginTop: 16 }}
            loading={busy}
            onPress={async () => {
              setBusy(true);
              try {
                setStatus(await subscriptionApi.cancel());
                await refreshUser();
              } catch (err) {
                setError(extractErrorMessage(err));
              } finally {
                setBusy(false);
              }
            }}
          />
        )}
      </Screen>
    );
  }

  // ---------- Paywall ----------
  const priceLabel = store.priceLabel ?? `$${status?.priceUsd?.toFixed(2) ?? "2.99"}`;

  return (
    <Screen title="Flex Track Premium" description="Remove ads and support the app.">
      <ErrorBanner message={error ?? store.error} />

      <View style={styles.hero}>
        <IconSparkles size={26} color={colors.white} />
        <Text style={styles.price}>
          {priceLabel}
          <Text style={styles.period}>/month</Text>
        </Text>
        <Text style={styles.cancelAny}>Cancel any time.</Text>
      </View>

      <View style={{ gap: 12, marginTop: 20 }}>
        {BENEFITS.map((b) => (
          <Card key={b.title} style={styles.benefit}>
            <View style={styles.tick}>
              <IconCheck size={12} color={colors.emerald[600]} strokeWidth={3.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.benefitTitle}>{b.title}</Text>
              <Text style={styles.benefitBody}>{b.body}</Text>
            </View>
          </Card>
        ))}
      </View>

      {store.loading ? (
        <View style={{ marginTop: 24 }}>
          <Spinner size="small" />
        </View>
      ) : store.available ? (
        <>
          <Button
            title={`Subscribe — ${priceLabel}/mo`}
            style={{ marginTop: 24 }}
            onPress={store.purchase}
            loading={store.purchasing}
          />
          <Button title="Restore purchases" variant="ghost" style={{ marginTop: 8 }} onPress={restore} loading={busy} />
        </>
      ) : (
        <Card style={styles.unavailable}>
          <Text style={styles.unavailableTitle}>Subscriptions aren't available here yet</Text>
          <Text style={styles.unavailableBody}>{store.unavailableReason}</Text>
        </Card>
      )}

      {__DEV__ ? (
        <Button
          title="Dev: activate without paying"
          variant="secondary"
          style={{ marginTop: 12 }}
          onPress={async () => {
            setBusy(true);
            try {
              setStatus(await subscriptionApi.devActivate());
              await refreshUser();
            } catch (err) {
              setError(extractErrorMessage(err));
            } finally {
              setBusy(false);
            }
          }}
          loading={busy}
        />
      ) : null}

      <Text style={styles.smallprint}>
        Payment is charged to your Apple ID at confirmation. The subscription renews automatically unless
        cancelled at least 24 hours before the end of the period. Manage or cancel in your Apple ID settings.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.brand[700], borderRadius: radius["2xl"], padding: 24 },
  price: { marginTop: 16, fontSize: 34, fontWeight: "700", color: colors.white },
  period: { fontSize: text.md, fontWeight: "500", color: "rgba(255,255,255,0.6)" },
  cancelAny: { marginTop: 4, fontSize: text.sm, color: "rgba(255,255,255,0.7)" },
  benefit: { flexDirection: "row", gap: 12, alignItems: "flex-start", paddingVertical: 16 },
  tick: { width: 20, height: 20, borderRadius: radius.full, backgroundColor: colors.emerald[100], alignItems: "center", justifyContent: "center", marginTop: 2 },
  benefitTitle: { fontSize: text.sm, fontWeight: "600", color: colors.slate[900] },
  benefitBody: { marginTop: 2, fontSize: text.sm, color: colors.slate[500], lineHeight: 19 },
  icon: { width: 44, height: 44, borderRadius: radius.lg, backgroundColor: colors.brand[600], alignItems: "center", justifyContent: "center" },
  activeTitle: { fontSize: text.base, fontWeight: "600", color: colors.brand[900] },
  activeBody: { marginTop: 2, fontSize: text.sm, color: colors.brand[700] },
  manageNote: { marginTop: 10, fontSize: text.xs, color: colors.slate[400], lineHeight: 16, textAlign: "center" },
  unavailable: { marginTop: 24, borderColor: colors.amber[200], backgroundColor: colors.amber[50] },
  unavailableTitle: { fontSize: text.sm, fontWeight: "600", color: colors.amber[900] },
  unavailableBody: { marginTop: 4, fontSize: text.sm, color: colors.amber[800], lineHeight: 19 },
  smallprint: { marginTop: 20, fontSize: text.xs, color: colors.slate[400], lineHeight: 16, textAlign: "center" },
});
