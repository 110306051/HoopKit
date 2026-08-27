import { useCallback, useState } from "react";
import { Image } from "expo-image";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/content-state";
import { MuxHighlightPlayer } from "@/components/mux-highlight-player";
import { useApiResource } from "@/hooks/use-api-resource";
import { useRefreshOnFocus } from "@/hooks/use-refresh-on-focus";
import { getMove } from "@/lib/content-api";
import {
  favoriteMove,
  getMemberOverview,
  unfavoriteMove,
} from "@/lib/member-api";
import { useSession } from "@/providers/session-provider";

export default function MoveDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { session } = useSession();
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const loader = useCallback(
    async (signal: AbortSignal) => {
      const [move, overview] = await Promise.all([
        getMove(slug, signal),
        session
          ? getMemberOverview(session.accessToken, signal)
          : Promise.resolve(null),
      ]);
      return {
        move,
        isFavorite:
          overview?.favoriteMoves.some((item) => item.id === move.id) ?? false,
      };
    },
    [session, slug],
  );
  const { data, error, loading, retry, refresh } = useApiResource(loader);
  useRefreshOnFocus(refresh);
  const move = data?.move;

  if (loading)
    return (
      <Screen>
        <LoadingState label="載入招式內容…" />
      </Screen>
    );
  if (error)
    return (
      <Screen>
        <ErrorState message={error} onRetry={retry} />
      </Screen>
    );
  if (!move)
    return (
      <Screen>
        <EmptyState message="找不到這個招式。" />
      </Screen>
    );
  const imageUrl = move.cover?.sourceUrl ?? move.cover?.thumbnailUrl;

  async function saveMove() {
    if (!session) {
      router.push("/account" as Href);
      return;
    }
    setSaving(true);
    try {
      if (data!.isFavorite) {
        await unfavoriteMove(session.accessToken, move!.id);
        setActionMessage("已取消收藏。");
      } else {
        await favoriteMove(session.accessToken, move!.id);
        setActionMessage("已加入收藏，可在「我的 HoopKit」查看。");
      }
      refresh();
    } catch (actionError) {
      setActionMessage(
        actionError instanceof Error ? actionError.message : "收藏失敗。",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        {imageUrl ? (
          <Image
            source={imageUrl}
            contentFit="cover"
            style={styles.heroImage}
          />
        ) : (
          <View style={[styles.heroImage, styles.fallback]}>
            <Text style={styles.fallbackText}>HOOPKIT MOVE</Text>
          </View>
        )}
        <View style={styles.heading}>
          <View style={styles.badges}>
            <Pill text={difficultyLabel(move.difficulty)} dark />
            {move.category ? <Pill text={move.category.name} /> : null}
          </View>
          <Text style={styles.title}>{move.name}</Text>
          <Text style={styles.summary}>{move.summary}</Text>
          {move.players.length ? (
            <Text style={styles.player}>
              示範球員：{move.players.map((player) => player.name).join(" · ")}
            </Text>
          ) : null}
          <Pressable
            disabled={saving}
            onPress={saveMove}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              {saving
                ? "更新中…"
                : session
                  ? data.isFavorite
                    ? "取消收藏"
                    : "收藏這個招式"
                  : "登入後收藏"}
            </Text>
          </Pressable>
          {actionMessage ? (
            <Text style={styles.actionMessage}>{actionMessage}</Text>
          ) : null}
        </View>
        {move.clips.length ? (
          <Section title="Highlight 片段" subtitle="觀察節奏、重心與出手空間。">
            <View style={styles.stack}>
              {move.clips.map((clip) => (
                <MuxHighlightPlayer key={clip.id} clip={clip} />
              ))}
            </View>
          </Section>
        ) : null}
        <Section title="動作步驟" subtitle="依序練習，再逐步提高速度。">
          {move.steps.length ? (
            <View style={styles.stack}>
              {move.steps.map((step, index) => (
                <View key={step.id} style={styles.step}>
                  <Text style={styles.stepNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </Text>
                  <View style={styles.stepCopy}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text style={styles.body}>{step.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.muted}>目前尚未加入動作步驟。</Text>
          )}
        </Section>
        <View style={styles.infoGrid}>
          <InfoCard label="怎麼使用" text={move.howToUse} />
          <InfoCard label="使用時機" text={move.whenToUse} />
        </View>
        <ListSection title="教練提示" values={move.coachingCues} />
        <ListSection title="常見錯誤" values={move.commonMistakes} />
        {move.tags.length ? (
          <View style={styles.tagRow}>
            {move.tags.map((tag) => (
              <Pill key={tag.id} text={`# ${tag.name}`} />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.screen}>
      <SafeAreaView edges={["bottom"]} style={styles.safe}>
        {children}
      </SafeAreaView>
    </View>
  );
}
function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}
function InfoCard({ label, text }: { label: string; text: string }) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.body}>{text || "目前尚未補充說明。"}</Text>
    </View>
  );
}
function ListSection({ title, values }: { title: string; values: string[] }) {
  if (!values.length) return null;
  return (
    <Section title={title}>
      <View style={styles.stack}>
        {values.map((value, index) => (
          <View key={`${value}-${index}`} style={styles.listRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.body}>{value}</Text>
          </View>
        ))}
      </View>
    </Section>
  );
}
function Pill({ text, dark = false }: { text: string; dark?: boolean }) {
  return <Text style={[styles.pill, dark && styles.pillDark]}>{text}</Text>;
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
  heroImage: { width: "100%", aspectRatio: 16 / 10 },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eeeeee",
  },
  fallbackText: {
    color: "#111111",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 2,
  },
  heading: { padding: 22, gap: 11 },
  badges: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill: {
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: "#eeeeee",
    color: "#333333",
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "800",
  },
  pillDark: { backgroundColor: "#111111", color: "#ffffff" },
  title: {
    color: "#111111",
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  summary: { color: "#555555", fontSize: 16, lineHeight: 25 },
  player: { color: "#333333", fontSize: 13, fontWeight: "700" },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#111111",
    borderRadius: 12,
    padding: 14,
    marginTop: 5,
  },
  primaryButtonText: { color: "#ffffff", fontWeight: "900" },
  actionMessage: { color: "#555555", fontSize: 12, textAlign: "center" },
  section: { paddingHorizontal: 20, paddingTop: 28 },
  sectionTitle: { color: "#111111", fontSize: 23, fontWeight: "900" },
  sectionSubtitle: { color: "#777777", marginTop: 5, fontSize: 13 },
  sectionContent: { marginTop: 14 },
  stack: { gap: 12 },
  step: {
    flexDirection: "row",
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#dddddd",
    backgroundColor: "#ffffff",
    padding: 16,
  },
  stepNumber: { color: "#111111", fontSize: 17, fontWeight: "900" },
  stepCopy: { flex: 1, gap: 5 },
  stepTitle: { color: "#111111", fontSize: 16, fontWeight: "800" },
  body: { flex: 1, color: "#555555", fontSize: 14, lineHeight: 22 },
  muted: { color: "#777777" },
  infoGrid: { paddingHorizontal: 20, paddingTop: 28, gap: 12 },
  infoCard: { borderRadius: 16, padding: 18, backgroundColor: "#f2f2f2" },
  infoLabel: {
    color: "#111111",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 8,
  },
  listRow: {
    flexDirection: "row",
    gap: 9,
    borderRadius: 14,
    backgroundColor: "#f5f5f5",
    padding: 15,
  },
  bullet: { color: "#111111", fontSize: 20, lineHeight: 20 },
  tagRow: {
    paddingHorizontal: 20,
    paddingTop: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
