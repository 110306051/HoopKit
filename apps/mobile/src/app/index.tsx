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
            <Text style={styles.brand}>HOOPKIT</Text>
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
            <Text style={styles.kicker}>BASKETBALL TRAINING LIBRARY</Text>
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
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.eyebrow}>MOVE LIBRARY</Text>
              <Text style={styles.sectionTitle}>招式探索</Text>
            </View>
            <Text style={styles.count}>{data?.total ?? 0} 招</Text>
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
  screen: { flex: 1, backgroundColor: "#ffffff" },
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
    paddingVertical: 16,
  },
  brand: {
    color: "#111111",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  accountButton: {
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  accountButtonText: { color: "#111111", fontSize: 12, fontWeight: "800" },
  hero: {
    marginHorizontal: 18,
    marginTop: 8,
    borderRadius: 22,
    backgroundColor: "#f2f2f2",
    padding: 24,
    gap: 13,
  },
  kicker: {
    color: "#666666",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  heroTitle: {
    color: "#111111",
    fontSize: 32,
    lineHeight: 39,
    fontWeight: "900",
    letterSpacing: -1,
  },
  heroBody: { color: "#555555", fontSize: 15, lineHeight: 23 },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 5,
  },
  primaryButton: {
    borderRadius: 11,
    backgroundColor: "#111111",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: { color: "#ffffff", fontWeight: "800" },
  secondaryButton: {
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#999999",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryButtonText: { color: "#222222", fontWeight: "800" },
  sectionHeader: {
    marginHorizontal: 20,
    marginBottom: 16,
    marginTop: 34,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  eyebrow: {
    color: "#777777",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  sectionTitle: {
    color: "#111111",
    fontSize: 27,
    fontWeight: "900",
    marginTop: 5,
  },
  count: { color: "#777777", fontSize: 12 },
  grid: { paddingHorizontal: 18, gap: 16 },
  card: {
    overflow: "hidden",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#dddddd",
    backgroundColor: "#ffffff",
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
  cover: { width: "100%", aspectRatio: 16 / 9 },
  coverFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eeeeee",
  },
  fallbackMark: { color: "#111111", fontSize: 34, fontWeight: "900" },
  cardBody: { padding: 17, gap: 8 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: {
    overflow: "hidden",
    borderRadius: 7,
    backgroundColor: "#111111",
    color: "#ffffff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "900",
  },
  category: { color: "#777777", fontSize: 11, fontWeight: "700" },
  cardTitle: { color: "#111111", fontSize: 21, fontWeight: "900" },
  summary: { color: "#555555", fontSize: 14, lineHeight: 21 },
  player: { color: "#333333", fontSize: 12, fontWeight: "700", marginTop: 2 },
});
