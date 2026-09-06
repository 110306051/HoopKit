import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Fonts, Playbook } from "@/constants/theme";

export function MobileLegalDocument({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <SafeAreaView edges={["bottom"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>HOOPKIT / LEGAL</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.updated}>最後更新：2026-09-06</Text>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function MobileLegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Playbook.canvas },
  content: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    padding: 22,
    paddingBottom: 60,
  },
  eyebrow: {
    color: Playbook.orange,
    fontFamily: Fonts.mono,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  title: {
    color: Playbook.ink,
    fontFamily: Fonts.display,
    fontSize: 34,
    fontWeight: "900",
    marginTop: 8,
  },
  updated: {
    color: Playbook.muted,
    fontSize: 12,
    marginTop: 8,
    marginBottom: 18,
  },
  section: {
    borderTopWidth: 1,
    borderTopColor: Playbook.lineStrong,
    paddingTop: 14,
    marginTop: 16,
    gap: 7,
  },
  sectionTitle: {
    color: Playbook.ink,
    fontFamily: Fonts.display,
    fontSize: 22,
    fontWeight: "900",
  },
  body: { color: Playbook.muted, fontSize: 14, lineHeight: 23 },
});
