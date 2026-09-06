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
import { useApiResource } from "@/hooks/use-api-resource";
import { useRefreshOnFocus } from "@/hooks/use-refresh-on-focus";
import { getWorkout } from "@/lib/content-api";
import {
  cloneWorkoutTemplate,
  favoriteWorkout,
  getMemberOverview,
  unfavoriteWorkout,
} from "@/lib/member-api";
import { useSession } from "@/providers/session-provider";
import { ReportContentButton } from "@/components/report-content-button";
import { Fonts, Playbook } from "@/constants/theme";

export default function WorkoutDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { session } = useSession();
  const [busy, setBusy] = useState<"favorite" | "clone" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const loader = useCallback(
    async (signal: AbortSignal) => {
      const [workout, overview] = await Promise.all([
        getWorkout(slug, signal),
        session
          ? getMemberOverview(session.accessToken, signal)
          : Promise.resolve(null),
      ]);
      return {
        workout,
        isFavorite:
          overview?.favoriteWorkouts.some((item) => item.id === workout.id) ??
          false,
      };
    },
    [session, slug],
  );
  const { data, error, loading, retry, refresh } = useApiResource(loader);
  useRefreshOnFocus(refresh);
  const workout = data?.workout;
  if (loading)
    return (
      <Screen>
        <LoadingState label="載入訓練菜單…" />
      </Screen>
    );
  if (error)
    return (
      <Screen>
        <ErrorState message={error} onRetry={retry} />
      </Screen>
    );
  if (!workout)
    return (
      <Screen>
        <EmptyState message="找不到這份訓練菜單。" />
      </Screen>
    );

  async function memberAction(action: "favorite" | "clone") {
    if (!session) {
      router.push("/account" as Href);
      return;
    }
    setBusy(action);
    setMessage(null);
    try {
      if (action === "favorite") {
        if (data!.isFavorite) {
          await unfavoriteWorkout(session.accessToken, workout!.id);
          setMessage("已取消收藏這份公開菜單。");
        } else {
          await favoriteWorkout(session.accessToken, workout!.id);
          setMessage("已收藏這份公開菜單。");
        }
        refresh();
      } else {
        const plan = await cloneWorkoutTemplate(
          session.accessToken,
          workout!.id,
        );
        router.push(`/my-plans/${plan.id}` as Href);
      }
    } catch (actionError) {
      setMessage(
        actionError instanceof Error ? actionError.message : "操作失敗。",
      );
    } finally {
      setBusy(null);
    }
  }

  const imageUrl = workout.cover?.sourceUrl ?? workout.cover?.thumbnailUrl;
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        {imageUrl ? (
          <Image source={imageUrl} style={styles.cover} contentFit="cover" />
        ) : (
          <View style={[styles.cover, styles.fallback]}>
            <Text style={styles.mark}>WORKOUT</Text>
          </View>
        )}
        <View style={styles.heading}>
          <Text style={styles.meta}>
            {difficultyLabel(workout.difficulty)}
            {workout.estimatedDurationMinutes
              ? ` · ${workout.estimatedDurationMinutes} 分鐘`
              : ""}
          </Text>
          <Text style={styles.title}>{workout.name}</Text>
          <Text style={styles.description}>{workout.description}</Text>
          <Text style={styles.source}>
            來源：{workout.sourcePlayer?.name ?? "HoopKit 教練團"}
          </Text>
          <View style={styles.actions}>
            <Pressable
              disabled={Boolean(busy)}
              onPress={() => void memberAction("clone")}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>
                {busy === "clone"
                  ? "建立中…"
                  : session
                    ? "加入我的訓練菜單"
                    : "登入後建立個人版本"}
              </Text>
            </Pressable>
            <Pressable
              disabled={Boolean(busy)}
              onPress={() => void memberAction("favorite")}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>
                {busy === "favorite"
                  ? "更新中…"
                  : data.isFavorite
                    ? "取消收藏"
                    : "收藏"}
              </Text>
            </Pressable>
          </View>
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
        {workout.warmupNotes ? (
          <View style={styles.warmup}>
            <Text style={styles.warmupLabel}>熱身提醒</Text>
            <Text style={styles.body}>{workout.warmupNotes}</Text>
          </View>
        ) : null}
        <View style={styles.sections}>
          {workout.sections.map((section, sectionIndex) => (
            <View key={section.id} style={styles.section}>
              <Text style={styles.sectionIndex}>
                {String(sectionIndex + 1).padStart(2, "0")}
              </Text>
              <Text style={styles.sectionTitle}>{section.name}</Text>
              {section.description ? (
                <Text style={styles.sectionDescription}>
                  {section.description}
                </Text>
              ) : null}
              <View style={styles.items}>
                {section.items.map((item) => (
                  <View key={item.id} style={styles.item}>
                    <View style={styles.itemHeading}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <Text style={styles.volume}>{formatVolume(item)}</Text>
                    </View>
                    {item.instructions ? (
                      <Text style={styles.body}>{item.instructions}</Text>
                    ) : null}
                    {item.move ? (
                      <Pressable
                        onPress={() =>
                          router.push(`/moves/${item.move!.slug}` as Href)
                        }
                      >
                        <Text style={styles.moveLink}>
                          查看招式：{item.move.name} →
                        </Text>
                      </Pressable>
                    ) : null}
                    {item.restSeconds ? (
                      <Text style={styles.rest}>
                        休息 {item.restSeconds} 秒
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
        <ReportContentButton
          targetType="workout_template"
          targetId={workout.id}
        />
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
function formatVolume(item: {
  sets: number | null;
  reps: number | null;
  durationSeconds: number | null;
}) {
  const work = item.reps
    ? `${item.reps} 次`
    : `${item.durationSeconds ?? 0} 秒`;
  return item.sets ? `${item.sets} 組 × ${work}` : work;
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
  cover: { width: "100%", aspectRatio: 16 / 9 },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Playbook.surface,
  },
  mark: {
    color: Playbook.orange,
    fontFamily: Fonts.display,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 3,
  },
  heading: {
    padding: 22,
    gap: 10,
    backgroundColor: Playbook.paper,
    borderBottomWidth: 1,
    borderBottomColor: Playbook.line,
  },
  meta: {
    color: Playbook.orange,
    fontFamily: Fonts.mono,
    fontSize: 10,
    fontWeight: "900",
  },
  title: {
    color: Playbook.ink,
    fontFamily: Fonts.display,
    fontSize: 39,
    lineHeight: 42,
    fontWeight: "900",
  },
  description: { color: Playbook.muted, fontSize: 15, lineHeight: 23 },
  source: { color: Playbook.inkSoft, fontWeight: "700", fontSize: 13 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 7 },
  primaryButton: {
    flexGrow: 1,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: Playbook.ink,
    padding: 14,
  },
  primaryButtonText: { color: Playbook.paper, fontWeight: "900" },
  secondaryButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Playbook.ink,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  secondaryButtonText: { color: Playbook.ink, fontWeight: "900" },
  message: {
    color: Playbook.orange,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  warmup: {
    marginHorizontal: 20,
    backgroundColor: Playbook.orangeSoft,
    borderLeftWidth: 3,
    borderLeftColor: Playbook.orange,
    padding: 18,
    gap: 8,
  },
  warmupLabel: {
    color: Playbook.ink,
    fontFamily: Fonts.mono,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  body: { color: Playbook.muted, fontSize: 14, lineHeight: 21 },
  sections: { padding: 20, gap: 28 },
  section: { gap: 8 },
  sectionIndex: {
    color: Playbook.orange,
    fontFamily: Fonts.mono,
    fontSize: 11,
    fontWeight: "900",
  },
  sectionTitle: {
    color: Playbook.ink,
    fontFamily: Fonts.display,
    fontSize: 29,
    fontWeight: "900",
    borderTopWidth: 1,
    borderTopColor: Playbook.ink,
    paddingTop: 10,
  },
  sectionDescription: { color: Playbook.muted, fontSize: 13 },
  items: { marginTop: 8, gap: 12 },
  item: {
    borderWidth: 1,
    borderColor: Playbook.line,
    backgroundColor: Playbook.paper,
    padding: 16,
    gap: 8,
  },
  itemHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  itemTitle: { flex: 1, color: Playbook.ink, fontSize: 16, fontWeight: "800" },
  volume: {
    color: Playbook.inkSoft,
    fontFamily: Fonts.mono,
    fontSize: 11,
    fontWeight: "900",
  },
  moveLink: {
    color: Playbook.orange,
    textDecorationLine: "underline",
    fontWeight: "800",
    fontSize: 13,
  },
  rest: { color: Playbook.muted, fontSize: 11, fontWeight: "700" },
});
