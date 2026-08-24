import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, radius, text } from "../theme";

export function Logo({ light = false, size = 18 }: { light?: boolean; size?: number }) {
  return (
    <View style={styles.row}>
      <View style={[styles.mark, { width: size * 1.8, height: size * 1.8 }]}>
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 12h2l1.5-4L9 16l2-6 1.5 4H21"
            stroke={colors.white}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
      <Text style={[styles.word, { color: light ? colors.white : colors.slate[900], fontSize: size }]}>
        Flex
        <Text style={{ color: light ? colors.brand[200] : colors.brand[600] }}>Track</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  mark: {
    backgroundColor: colors.brand[600],
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  word: { fontWeight: "800", letterSpacing: -0.5, fontSize: text.lg },
});
