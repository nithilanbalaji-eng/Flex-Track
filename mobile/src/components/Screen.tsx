import React from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, text } from "../theme";
import { Title, Subtitle } from "./ui";

export function Screen({
  children,
  title,
  description,
  onRefresh,
  refreshing,
  scroll = true,
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  scroll?: boolean;
}) {
  const header =
    title || description ? (
      <View style={styles.header}>
        {title ? <Title>{title}</Title> : null}
        {description ? <Subtitle>{description}</Subtitle> : null}
      </View>
    ) : null;

  if (!scroll) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.body}>
          {header}
          {children}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.brand[600]} /> : undefined
        }
      >
        {header}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.slate[50] },
  body: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  header: { marginBottom: 20 },
});
