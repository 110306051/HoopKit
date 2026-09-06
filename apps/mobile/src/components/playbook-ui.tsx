import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Fonts, Playbook } from "@/constants/theme";

export function BrandLockup({ inverse = false }: { inverse?: boolean }) {
  return (
    <View style={styles.brandRow}>
      <View style={[styles.brandMark, inverse && styles.brandMarkInverse]}>
        <Text style={[styles.brandLetter, inverse && styles.brandLetterInverse]}>
          H<Text style={styles.brandDot}>.</Text>
        </Text>
      </View>
      <View>
        <Text style={[styles.brandName, inverse && styles.inverseText]}>HOOPKIT</Text>
        <Text style={[styles.brandCaption, inverse && styles.inverseMuted]}>PLAYER PLAYBOOK</Text>
      </View>
    </View>
  );
}

export function CourtIndex({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  aside?: ReactNode;
}) {
  return (
    <View style={styles.index}>
      <View style={styles.indexLine}>
        <View style={styles.indexAccent} />
        <View style={styles.ticks}>
          {[0, 1, 2, 3, 4, 5].map((tick) => (
            <View key={tick} style={styles.tick} />
          ))}
        </View>
      </View>
      <View style={styles.indexHeading}>
        <View style={styles.indexCopy}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
        {aside}
      </View>
    </View>
  );
}

export function SectionLabel({
  eyebrow,
  title,
  value,
}: {
  eyebrow: string;
  title: string;
  value?: string;
}) {
  return (
    <View style={styles.sectionLabel}>
      <View>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {value ? <Text style={styles.sectionValue}>{value}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 7,
    backgroundColor: Playbook.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkInverse: { backgroundColor: Playbook.paper },
  brandLetter: { color: Playbook.paper, fontSize: 17, fontWeight: "900" },
  brandLetterInverse: { color: Playbook.ink },
  brandDot: { color: Playbook.orange },
  brandName: {
    color: Playbook.ink,
    fontFamily: Fonts.display,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  brandCaption: {
    color: Playbook.mutedLight,
    fontFamily: Fonts.mono,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.1,
  },
  inverseText: { color: Playbook.paper },
  inverseMuted: { color: "#FFFFFF73" },
  index: { gap: 16 },
  indexLine: {
    height: 9,
    borderTopWidth: 1,
    borderTopColor: Playbook.ink,
    flexDirection: "row",
  },
  indexAccent: { width: 48, height: 3, backgroundColor: Playbook.orange },
  ticks: { flexDirection: "row", gap: 13, marginLeft: 8 },
  tick: { width: 1, height: 7, backgroundColor: Playbook.ink },
  indexHeading: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 14,
  },
  indexCopy: { flex: 1 },
  eyebrow: {
    color: Playbook.orange,
    fontFamily: Fonts.mono,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.35,
  },
  title: {
    color: Playbook.ink,
    fontFamily: Fonts.display,
    fontSize: 39,
    lineHeight: 42,
    fontWeight: "900",
    letterSpacing: -0.6,
    marginTop: 5,
  },
  description: {
    color: Playbook.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 9,
  },
  sectionLabel: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    color: Playbook.ink,
    fontFamily: Fonts.display,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 3,
  },
  sectionValue: {
    color: Playbook.muted,
    fontFamily: Fonts.mono,
    fontSize: 10,
    paddingBottom: 4,
  },
});
