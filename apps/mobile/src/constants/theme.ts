/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import "@/global.css";

import { Platform } from "react-native";

export const Playbook = {
  ink: "#121212",
  inkSoft: "#30302D",
  muted: "#696964",
  mutedLight: "#8A8A84",
  canvas: "#F5F5F2",
  paper: "#FFFFFF",
  surface: "#EEEEEA",
  line: "#D7D7D0",
  lineStrong: "#A8A8A0",
  orange: "#F05A28",
  orangeSoft: "#FFF0E9",
  green: "#277A48",
  greenSoft: "#E9F4ED",
  blue: "#315EFB",
  film: "#101114",
  danger: "#9B3E22",
} as const;

export const Colors = {
  light: {
    text: Playbook.ink,
    background: Playbook.canvas,
    backgroundElement: Playbook.paper,
    backgroundSelected: Playbook.surface,
    textSecondary: Playbook.muted,
  },
  dark: {
    text: "#ffffff",
    background: "#000000",
    backgroundElement: "#212225",
    backgroundSelected: "#2E3135",
    textSecondary: "#B0B4BA",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    display: "Avenir Next Condensed",
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    display: "sans-serif-condensed",
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    display: "Bahnschrift Condensed, Arial Narrow, sans-serif",
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
