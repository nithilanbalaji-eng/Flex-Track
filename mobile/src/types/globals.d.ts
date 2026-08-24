/**
 * React Native exposes `global` at runtime (Hermes and JSC both provide it),
 * but nothing in this project's type setup declares it.
 *
 * It matters because react-native-iap's package exports map points the
 * "react-native" condition at its raw TypeScript source, so its files are
 * compiled as part of this project rather than being read as .d.ts - which
 * means skipLibCheck doesn't apply to them.
 */
declare var global: typeof globalThis;
