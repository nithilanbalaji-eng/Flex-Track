import React from "react";
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  View,
  ViewProps,
} from "react-native";
import { colors, radius, shadow, text, MIN_TOUCH } from "../theme";

/** Card surface - the equivalent of the web build's .card class. */
export function Card({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.card, style]} />;
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  title,
  variant = "primary",
  loading,
  disabled,
  style,
  icon,
  ...props
}: PressableProps & {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: React.ReactNode;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        variantStyles[variant].container,
        pressed && !isDisabled && styles.btnPressed,
        isDisabled && styles.btnDisabled,
        style as object,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.white : colors.slate[600]} />
      ) : (
        <>
          {icon}
          <Text style={[styles.btnText, variantStyles[variant].text]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Input({ style, ...props }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.slate[400]}
      style={[styles.input, style]}
      {...props}
    />
  );
}

export function Label({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.label, style]} />;
}

export function Title({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.title, style]} />;
}

export function Subtitle({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.subtitle, style]} />;
}

export function Body({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.body, style]} />;
}

export function Muted({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.muted, style]} />;
}

export function Badge({ label, tone = "brand" }: { label: string; tone?: "brand" | "green" | "slate" }) {
  const tones = {
    brand: { bg: colors.brand[50], fg: colors.brand[700] },
    green: { bg: colors.emerald[50], fg: colors.emerald[700] },
    slate: { bg: colors.slate[100], fg: colors.slate[600] },
  } as const;
  return (
    <View style={[styles.badge, { backgroundColor: tones[tone].bg }]}>
      <Text style={[styles.badgeText, { color: tones[tone].fg }]}>{label}</Text>
    </View>
  );
}

/** Inline error, matching the web build's ErrorBanner. */
export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.error} accessibilityRole="alert">
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function Spinner({ size = "large" }: { size?: "small" | "large" }) {
  return (
    <View style={styles.spinnerWrap}>
      <ActivityIndicator size={size} color={colors.brand[600]} />
    </View>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <Text style={styles.emptyBody}>{description}</Text> : null}
      {action ? <View style={{ marginTop: 20, width: "100%" }}>{action}</View> : null}
    </View>
  );
}

const variantStyles: Record<ButtonVariant, { container: object; text: object }> = {
  primary: { container: { backgroundColor: colors.brand[600] }, text: { color: colors.white } },
  secondary: {
    container: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate[300] },
    text: { color: colors.slate[700] },
  },
  danger: { container: { backgroundColor: colors.red[600] }, text: { color: colors.white } },
  ghost: { container: { backgroundColor: "transparent" }, text: { color: colors.slate[600] } },
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius["2xl"],
    borderWidth: 1,
    borderColor: colors.slate[200],
    padding: 20,
    ...shadow.card,
  },
  btn: {
    minHeight: MIN_TOUCH,
    borderRadius: radius.lg,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: text.base, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 13,
    // 16px keeps iOS from zooming the field on focus.
    fontSize: 16,
    color: colors.slate[900],
    backgroundColor: colors.white,
  },
  label: { fontSize: text.sm, fontWeight: "500", color: colors.slate[700], marginBottom: 6 },
  title: { fontSize: text.xl, fontWeight: "700", color: colors.slate[900], letterSpacing: -0.3 },
  subtitle: { fontSize: text.base, color: colors.slate[500], marginTop: 4, lineHeight: 21 },
  body: { fontSize: text.base, color: colors.slate[700], lineHeight: 21 },
  muted: { fontSize: text.sm, color: colors.slate[400] },
  badge: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  badgeText: { fontSize: text.xs, fontWeight: "600" },
  error: {
    backgroundColor: colors.red[50],
    borderWidth: 1,
    borderColor: colors.red[200],
    borderRadius: radius.lg,
    padding: 14,
  },
  errorText: { color: colors.red[700], fontSize: text.sm, lineHeight: 19 },
  spinnerWrap: { paddingVertical: 48, alignItems: "center", justifyContent: "center" },
  empty: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.slate[300],
    borderRadius: radius["2xl"],
    paddingVertical: 44,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  emptyTitle: { fontSize: text.md, fontWeight: "600", color: colors.slate[900], textAlign: "center" },
  emptyBody: { marginTop: 6, fontSize: text.sm, color: colors.slate[500], textAlign: "center", lineHeight: 19 },
});
