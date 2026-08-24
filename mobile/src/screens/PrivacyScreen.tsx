import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Button, Card } from "../components/ui";
import { colors, text } from "../theme";

const PRIVACY_URL = "https://flex-track-pi.vercel.app/privacy";

/**
 * Summarises the policy in-app and links out to the canonical hosted version,
 * so there's only ever one copy to keep accurate.
 */
export function PrivacyScreen() {
  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Card>
        <Text style={styles.heading}>The short version</Text>
        <Text style={styles.para}>
          Flex Track stores your profile, training, nutrition and any health data you choose to connect, and uses
          it to run the app for you.
        </Text>

        <Text style={styles.subheading}>Health and fitness data</Text>
        <Text style={styles.bullet}>• Never used for advertising.</Text>
        <Text style={styles.bullet}>• Never sold or shared with data brokers.</Text>
        <Text style={styles.bullet}>• Apple Health syncing is optional and can be turned off at any time.</Text>

        <Text style={styles.subheading}>Sharing</Text>
        <Text style={styles.para}>
          Crew members see plans you share with the crew, plus your name and email. Your logs, calories and
          health data stay private to you.
        </Text>

        <Text style={styles.subheading}>Your control</Text>
        <Text style={styles.para}>
          You can delete your account and everything in it from Settings at any time. It's a permanent deletion,
          not a deactivation.
        </Text>
      </Card>

      <Button
        title="Read the full Privacy Policy"
        variant="secondary"
        style={{ marginTop: 16 }}
        onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}
      />

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, backgroundColor: colors.slate[50] },
  heading: { fontSize: text.md, fontWeight: "700", color: colors.slate[900] },
  subheading: { marginTop: 20, fontSize: text.base, fontWeight: "600", color: colors.slate[800] },
  para: { marginTop: 8, fontSize: text.sm, color: colors.slate[600], lineHeight: 20 },
  bullet: { marginTop: 6, fontSize: text.sm, color: colors.slate[600], lineHeight: 20 },
});
