import { useCallback } from "react";
import { router, type Href } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/content-state";
import { useApiResource } from "@/hooks/use-api-resource";
import { useRefreshOnFocus } from "@/hooks/use-refresh-on-focus";
import { listWorkoutSessions } from "@/lib/training-api";
import { useSession } from "@/providers/session-provider";
import type { WorkoutSessionStatus } from "@/types/member";
import { CourtIndex } from "@/components/playbook-ui";
import { Fonts, Playbook } from "@/constants/theme";

export default function TrainingHistoryScreen() {
  const { session, loading: sessionLoading } = useSession();
  const accessToken = session?.accessToken ?? "";
  const loader = useCallback(
    (signal: AbortSignal) => {
      if (!accessToken) throw new Error("請先登入後查看訓練紀錄。");
      return listWorkoutSessions(accessToken, signal);
    },
    [accessToken],
  );
  const { data, error, loading, retry, refresh } = useApiResource(loader);
  useRefreshOnFocus(refresh);

  if (sessionLoading || loading) return <LoadingState label="載入訓練紀錄…" />;
  if (!session) return <EmptyState message="請先登入後查看訓練紀錄。" />;
  if (error) return <ErrorState message={error} onRetry={retry} />;

  return (
    <SafeAreaView edges={["bottom"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <CourtIndex
          eyebrow="TRAINING LOG"
          title="你的訓練紀錄"
          description="進行中的訓練可以繼續；完成與中止的訓練會保留當時菜單快照。"
        />
        {data?.items.length ? (
          <View style={styles.list}>
            {data.items.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => router.push(`/training/${item.id}` as Href)}
                style={styles.card}
              >
                <View style={styles.cardHeading}>
                  <Text style={styles.cardTitle}>{item.planName}</Text>
                  <Text style={styles.status}>{statusLabel(item.status)}</Text>
                </View>
                <Text style={styles.meta}>
                  {new Date(item.startedAt).toLocaleString("zh-TW")}
                </Text>
                <Text style={styles.meta}>
                  完成 {item.completedItems} / {item.totalItems} 項
                  {item.elapsedSeconds !== null
                    ? ` · ${formatDuration(item.elapsedSeconds)}`
                    : ""}
                </Text>
                <Text style={styles.link}>
                  {item.status === "active" || item.status === "paused"
                    ? "繼續訓練 →"
                    : "查看摘要 →"}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <EmptyState message="尚無訓練紀錄，先從個人菜單開始第一場訓練。" />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function statusLabel(status: WorkoutSessionStatus) {
  return {
    active: "進行中",
    paused: "已暫停",
    completed: "已完成",
    abandoned: "已中止",
  }[status];
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Playbook.canvas },
  content: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    padding: 20,
    paddingBottom: 60,
  },
  list: { gap: 12, marginTop: 24 },
  card: {
    borderWidth: 1,
    borderColor: Playbook.line,
    backgroundColor: Playbook.paper,
    padding: 16,
    gap: 7,
  },
  cardHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  cardTitle: { flex: 1, color: Playbook.ink, fontFamily: Fonts.display, fontSize: 21, fontWeight: "900" },
  status: { color: Playbook.green, fontFamily: Fonts.mono, fontSize: 10, fontWeight: "800" },
  meta: { color: Playbook.muted, fontFamily: Fonts.mono, fontSize: 11 },
  link: { color: Playbook.orange, fontSize: 12, fontWeight: "900", marginTop: 3 },
});
