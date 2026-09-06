import { useCallback } from "react";
import { Image } from "expo-image";
import { router, type Href } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/content-state";
import { BrandLockup, SectionLabel } from "@/components/playbook-ui";
import { Fonts, Playbook } from "@/constants/theme";
import { useApiResource } from "@/hooks/use-api-resource";
import { getMoves } from "@/lib/content-api";
import { useSession } from "@/providers/session-provider";
import type { MoveSummary } from "@/types/content";

export default function HomeScreen() {
  const loader = useCallback((signal: AbortSignal) => getMoves(signal), []);
  const { data, error, loading, retry } = useApiResource(loader);
  const { account } = useSession();

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.topbar}>
            <BrandLockup />
            <Pressable
              onPress={() => router.push("/account" as Href)}
              style={styles.accountButton}
            >
              <Text style={styles.accountButtonText}>
                {account ? "我的訓練" : "登入"}
              </Text>
            </Pressable>
          </View>
          <View style={styles.hero}>
            <View style={styles.courtCircle} />
            <View style={styles.heroContent}>
              <Text style={styles.kicker}>TODAY&apos;S PLAY / 01</Text>
              <Text style={styles.heroTitle}>
                把球星動作，拆成今天就能練的招式。
              </Text>
              <Text style={styles.heroBody}>
                看懂動作要點與使用時機，再收藏或組合成自己的訓練流程。
              </Text>
              <View style={styles.heroActions}>
              <Pressable
                style={styles.primaryButton}
                onPress={() => router.push("/workouts" as Href)}
              >
                <Text style={styles.primaryButtonText}>瀏覽公開菜單</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => router.push("/account" as Href)}
              >
                <Text style={styles.secondaryButtonText}>我的空間</Text>
              </Pressable>
              </View>
            </View>
          </View>
          <View style={styles.sectionHeader}>
            <SectionLabel
              eyebrow="MOVE LIBRARY"
              title="招式探索"
              value={`${data?.total ?? 0} MOVES`}
            />
          </View>
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={retry} />
          ) : data?.items.length ? (
            <View style={styles.grid}>
              {data.items.map((move) => (
                <MoveCard key={move.id} move={move} />
              ))}
            </View>
          ) : (
            <EmptyState message="請先到 Admin 發布第一個招式。" />
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function MoveCard({ move }: { move: MoveSummary }) {
  const imageUrl = move.cover?.sourceUrl ?? move.cover?.thumbnailUrl;
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => router.push(`/moves/${move.slug}` as Href)}
    >
      {imageUrl ? (
        <Image source={imageUrl} contentFit="cover" style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverFallback]}>
          <Text style={styles.fallbackMark}>HK</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.badgeRow}>
          <Text style={styles.badge}>{difficultyLabel(move.difficulty)}</Text>
          {move.category ? (
            <Text style={styles.category}>{move.category.name}</Text>
          ) : null}
        </View>
        <Text style={styles.cardTitle}>{move.name}</Text>
        <Text numberOfLines={2} style={styles.summary}>
          {move.summary || "查看完整動作步驟與教學。"}
        </Text>
        <Text style={styles.player}>
          {move.players.map((player) => player.name).join(" · ") ||
            "HoopKit 教練團"}
        </Text>
      </View>
    </Pressable>
  );
}

function difficultyLabel(value: string) {
  return (
    (
      { beginner: "初階", intermediate: "中階", advanced: "進階" } as Record<
        string,
        string
      >
    )[value] ?? value
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Playbook.canvas },
  safe: { flex: 1 },
  content: {
    width: "100%",
    maxWidth: 800,
    alignSelf: "center",
    paddingBottom: 50,
  },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Playbook.paper,
  },
  accountButton: {
    borderWidth: 1,
    borderColor: Playbook.ink,
    borderRadius: 7,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  accountButtonText: { color: Playbook.ink, fontSize: 12, fontWeight: "800" },
  hero: {
    marginHorizontal: 18,
    marginTop: 12,
    minHeight: 360,
    overflow: "hidden",
    backgroundColor: Playbook.ink,
    padding: 26,
    justifyContent: "flex-end",
  },
  heroContent: { gap: 13, zIndex: 1 },
  courtCircle: {
    position: "absolute",
    width: 270,
    height: 270,
    borderRadius: 135,
    borderWidth: 1,
    borderColor: "#FFFFFF24",
    right: -105,
    top: -72,
  },
  kicker: {
    color: Playbook.orange,
    fontFamily: Fonts.mono,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  heroTitle: {
    color: Playbook.paper,
    fontFamily: Fonts.display,
    fontSize: 42,
    lineHeight: 45,
    fontWeight: "900",
    letterSpacing: -1,
  },
  heroBody: { color: "#FFFFFFA3", fontSize: 15, lineHeight: 23 },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 5,
  },
  primaryButton: {
    borderRadius: 7,
    backgroundColor: Playbook.orange,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: { color: Playbook.paper, fontWeight: "900" },
  secondaryButton: {
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#FFFFFF66",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryButtonText: { color: Playbook.paper, fontWeight: "800" },
  sectionHeader: {
    marginHorizontal: 20,
    marginBottom: 16,
    marginTop: 34,
    borderTopWidth: 1,
    borderTopColor: Playbook.ink,
    paddingTop: 15,
  },
  grid: { paddingHorizontal: 18, gap: 16 },
  card: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Playbook.line,
    backgroundColor: Playbook.paper,
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
  cover: { width: "100%", aspectRatio: 16 / 9 },
  coverFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Playbook.surface,
  },
  fallbackMark: { color: Playbook.orange, fontFamily: Fonts.display, fontSize: 34, fontWeight: "900" },
  cardBody: { padding: 17, gap: 8 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: {
    overflow: "hidden",
    borderRadius: 5,
    backgroundColor: Playbook.ink,
    color: Playbook.paper,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "900",
  },
  category: { color: Playbook.muted, fontSize: 11, fontWeight: "700" },
  cardTitle: { color: Playbook.ink, fontFamily: Fonts.display, fontSize: 25, fontWeight: "900" },
  summary: { color: Playbook.muted, fontSize: 14, lineHeight: 21 },
  player: { color: Playbook.inkSoft, fontSize: 12, fontWeight: "700", marginTop: 2 },
});
