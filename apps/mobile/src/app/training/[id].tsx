import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ErrorState, LoadingState } from "@/components/content-state";
import { useApiResource } from "@/hooks/use-api-resource";
import { useRefreshOnFocus } from "@/hooks/use-refresh-on-focus";
import {
  abandonWorkoutSession,
  completeWorkoutSet,
  getWorkoutSession,
  pauseWorkoutSession,
  resumeWorkoutSession,
  skipWorkoutItem,
} from "@/lib/training-api";
import { useSession } from "@/providers/session-provider";
import type { WorkoutSessionDetail, WorkoutSessionItem } from "@/types/member";
import { Fonts, Playbook } from "@/constants/theme";

export default function TrainingExecutionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, loading: sessionLoading } = useSession();
  const accessToken = session?.accessToken ?? "";
  const loader = useCallback(
    (signal: AbortSignal) => {
      if (!accessToken) throw new Error("請先登入後進行訓練。");
      return getWorkoutSession(accessToken, id, signal);
    },
    [accessToken, id],
  );
  const { data, error, loading, retry, refresh, replace } =
    useApiResource(loader);
  useRefreshOnFocus(refresh);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [abandonOpen, setAbandonOpen] = useState(false);
  const [abandonError, setAbandonError] = useState<string | null>(null);
  const items = useMemo(
    () => data?.sections.flatMap((section) => section.items) ?? [],
    [data],
  );
  const currentItem = items.find(
    (item) => item.globalSortOrder === data?.currentItemIndex,
  );
  const elapsedSeconds = useElapsedSeconds(data);

  async function runAction(
    key: string,
    action: () => Promise<WorkoutSessionDetail>,
  ) {
    setBusy(key);
    setMessage(null);
    try {
      const next = await action();
      replace(next);
      return next;
    } catch (actionError) {
      setMessage(
        actionError instanceof Error ? actionError.message : "操作失敗。",
      );
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function abandonTraining() {
    setAbandonError(null);
    const next = await runAction("abandon", () =>
      abandonWorkoutSession(accessToken, id),
    );
    if (next) {
      setAbandonOpen(false);
      return;
    }
    setAbandonError("無法中止訓練，請稍後再試。");
  }

  if (sessionLoading || loading) return <LoadingState label="準備訓練…" />;
  if (!session)
    return (
      <ErrorState
        message="請先登入後進行訓練。"
        onRetry={() => router.replace("/account" as Href)}
      />
    );
  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (!data) return null;

  if (data.status === "completed" || data.status === "abandoned") {
    return <TrainingSummary training={data} />;
  }

  const currentSection = data.sections.find((section) =>
    section.items.some((item) => item.id === currentItem?.id),
  );

  return (
    <SafeAreaView edges={["bottom"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.flex}>
            <Text style={styles.eyebrow}>LIVE WORKOUT</Text>
            <Text style={styles.title}>{data.planName}</Text>
          </View>
          <Text style={styles.clock}>{formatDuration(elapsedSeconds)}</Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.round(
                  (data.currentItemIndex / Math.max(data.totalItems, 1)) * 100,
                )}%`,
              },
            ]}
          />
        </View>
        <Text style={styles.progressLabel}>
          第 {Math.min(data.currentItemIndex + 1, data.totalItems)} /{" "}
          {data.totalItems} 項 · 已完成 {data.completedItems} 項
        </Text>

        <Pressable
          disabled={Boolean(busy)}
          onPress={() =>
            void runAction(data.status === "paused" ? "resume" : "pause", () =>
              data.status === "paused"
                ? resumeWorkoutSession(accessToken, id)
                : pauseWorkoutSession(accessToken, id),
            )
          }
          style={styles.pauseButton}
        >
          <Text style={styles.pauseButtonText}>
            {data.status === "paused" ? "繼續整場訓練" : "暫停整場訓練"}
          </Text>
        </Pressable>

        {data.status === "paused" ? (
          <View style={styles.pausedCard}>
            <Text style={styles.cardTitle}>訓練已暫停</Text>
            <Text style={styles.body}>繼續後才能完成組數或跳過項目。</Text>
          </View>
        ) : null}

        {currentItem ? (
          <CurrentItemCard
            key={`${currentItem.id}-${data.status}`}
            item={currentItem}
            sectionName={currentSection?.name ?? "訓練項目"}
            disabled={Boolean(busy) || data.status !== "active"}
            onComplete={() =>
              runAction(`complete-${currentItem.id}`, () =>
                completeWorkoutSet(accessToken, id, currentItem.id),
              )
            }
            onSkip={() =>
              runAction(`skip-${currentItem.id}`, () =>
                skipWorkoutItem(accessToken, id, currentItem.id),
              )
            }
          />
        ) : (
          <Text style={styles.body}>正在整理完成結果…</Text>
        )}

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <View style={styles.queue}>
          <Text style={styles.cardTitle}>訓練順序</Text>
          {data.sections.map((section) => (
            <View key={section.id} style={styles.queueSection}>
              <Text style={styles.queueSectionName}>{section.name}</Text>
              {section.items.map((item) => (
                <View key={item.id} style={styles.queueItem}>
                  <Text style={styles.queueMark}>
                    {item.status === "completed"
                      ? "✓"
                      : item.status === "skipped"
                        ? "—"
                        : item.id === currentItem?.id
                          ? "●"
                          : "○"}
                  </Text>
                  <Text style={styles.queueTitle}>{item.title}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <Pressable
          disabled={Boolean(busy)}
          onPress={() => {
            setAbandonError(null);
            setAbandonOpen(true);
          }}
          style={styles.dangerButton}
        >
          <Text style={styles.dangerText}>
            {busy === "abandon" ? "中止中…" : "中止這場訓練"}
          </Text>
        </Pressable>
      </ScrollView>
      <ConfirmDialog
        visible={abandonOpen}
        title="中止這場訓練"
        description="進度會保留為中止紀錄，之後不能再繼續。"
        confirmLabel="中止訓練"
        busy={busy === "abandon"}
        error={abandonError}
        onCancel={() => setAbandonOpen(false)}
        onConfirm={() => void abandonTraining()}
      />
    </SafeAreaView>
  );
}

function CurrentItemCard({
  item,
  sectionName,
  disabled,
  onComplete,
  onSkip,
}: {
  item: WorkoutSessionItem;
  sectionName: string;
  disabled: boolean;
  onComplete: () => Promise<WorkoutSessionDetail | null>;
  onSkip: () => Promise<WorkoutSessionDetail | null>;
}) {
  const workSeconds = item.durationSeconds ?? 0;
  const [phase, setPhase] = useState<"work" | "rest">("work");
  const [baseSeconds, setBaseSeconds] = useState(workSeconds);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [skipOpen, setSkipOpen] = useState(false);
  const [skipError, setSkipError] = useState<string | null>(null);
  const remaining = deadline
    ? Math.max(0, Math.ceil((deadline - now) / 1000))
    : baseSeconds;
  const targetSets = item.sets ?? 1;
  const currentSet = Math.min(item.completedSets + 1, targetSets);
  const requiresTimer = phase === "work" && workSeconds > 0;
  const canComplete =
    !disabled && phase === "work" && (!requiresTimer || remaining === 0);

  useEffect(() => {
    if (deadline === null) return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [deadline]);

  function toggleTimer() {
    if (deadline !== null && remaining > 0) {
      setBaseSeconds(remaining);
      setDeadline(null);
      return;
    }
    if (remaining > 0) {
      const currentTime = Date.now();
      setNow(currentTime);
      setDeadline(currentTime + remaining * 1000);
    }
  }

  function startNextSet() {
    setPhase("work");
    setBaseSeconds(workSeconds);
    setDeadline(null);
    setNow(Date.now());
  }

  async function completeSet() {
    const next = await onComplete();
    if (!next) return;
    const nextCurrent = next.sections
      .flatMap((section) => section.items)
      .find((candidate) => candidate.globalSortOrder === next.currentItemIndex);
    if (
      next.status === "active" &&
      nextCurrent?.id === item.id &&
      item.restSeconds > 0
    ) {
      const currentTime = Date.now();
      setPhase("rest");
      setBaseSeconds(item.restSeconds);
      setNow(currentTime);
      setDeadline(currentTime + item.restSeconds * 1000);
    }
  }

  async function skipItem() {
    setSkipError(null);
    const next = await onSkip();
    if (next) {
      setSkipOpen(false);
      return;
    }
    setSkipError("無法跳過這個項目，請稍後再試。");
  }

  return (
    <View style={styles.currentCard}>
      <Text style={styles.eyebrow}>{sectionName.toUpperCase()}</Text>
      <Text style={styles.currentTitle}>{item.title}</Text>
      {item.instructions ? (
        <Text style={styles.body}>{item.instructions}</Text>
      ) : null}
      <View style={styles.volumeRow}>
        <Text style={styles.volumeText}>
          第 {currentSet} / {targetSets} 組
        </Text>
        <Text style={styles.volumeText}>
          {item.reps ? `${item.reps} 次` : `${item.durationSeconds ?? 0} 秒`}
        </Text>
        <Text style={styles.volumeText}>休息 {item.restSeconds} 秒</Text>
      </View>

      {(workSeconds > 0 || phase === "rest") && (
        <View style={styles.timerCard}>
          <Text style={styles.timerLabel}>
            {phase === "rest" ? "組間休息" : "動作倒數"}
          </Text>
          <Text style={styles.timer}>{formatDuration(remaining)}</Text>
          {phase === "rest" && remaining === 0 ? (
            <Pressable onPress={startNextSet} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>開始下一組</Text>
            </Pressable>
          ) : (
            <Pressable
              disabled={disabled || remaining === 0}
              onPress={toggleTimer}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>
                {deadline !== null && remaining > 0 ? "暫停倒數" : "開始倒數"}
              </Text>
            </Pressable>
          )}
          {phase === "rest" ? (
            <Pressable onPress={startNextSet} style={styles.textButton}>
              <Text style={styles.textButtonText}>跳過休息</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {phase === "work" ? (
        <View style={styles.actionRow}>
          <Pressable
            disabled={!canComplete}
            onPress={() => void completeSet()}
            style={[
              styles.primaryButton,
              !canComplete && styles.disabledButton,
            ]}
          >
            <Text style={styles.primaryButtonText}>完成這一組</Text>
          </Pressable>
          <Pressable
            disabled={disabled}
            onPress={() => {
              setSkipError(null);
              setSkipOpen(true);
            }}
            style={styles.skipButton}
          >
            <Text style={styles.skipText}>跳過項目</Text>
          </Pressable>
        </View>
      ) : null}
      <ConfirmDialog
        visible={skipOpen}
        title="跳過這個項目"
        description="這個項目會記錄為已跳過，並移動到下一個項目。"
        confirmLabel="跳過項目"
        busy={disabled}
        error={skipError}
        destructive={false}
        onCancel={() => setSkipOpen(false)}
        onConfirm={() => void skipItem()}
      />
    </View>
  );
}

function TrainingSummary({ training }: { training: WorkoutSessionDetail }) {
  const items = training.sections.flatMap((section) => section.items);
  const skipped = items.filter((item) => item.status === "skipped").length;
  return (
    <SafeAreaView edges={["bottom"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.summaryContent}>
        <Text style={styles.eyebrow}>WORKOUT SUMMARY</Text>
        <Text style={styles.summaryTitle}>
          {training.status === "completed" ? "訓練完成" : "訓練已中止"}
        </Text>
        <Text style={styles.title}>{training.planName}</Text>
        <View style={styles.summaryGrid}>
          <SummaryStat
            label="訓練時間"
            value={formatDuration(training.elapsedSeconds ?? 0)}
          />
          <SummaryStat
            label="完成項目"
            value={`${training.completedItems}/${training.totalItems}`}
          />
          <SummaryStat label="跳過項目" value={String(skipped)} />
        </View>
        <Pressable
          onPress={() => router.replace("/training/history" as Href)}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>查看所有訓練紀錄</Text>
        </Pressable>
        <Pressable
          onPress={() => router.replace("/account" as Href)}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>回到我的 HoopKit</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryStat}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.progressLabel}>{label}</Text>
    </View>
  );
}

function useElapsedSeconds(training: WorkoutSessionDetail | null) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (training?.status !== "active") return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [training?.status]);
  if (!training) return 0;
  if (training.elapsedSeconds !== null) return training.elapsedSeconds;
  const end = training.pausedAt
    ? Date.parse(training.pausedAt)
    : now || Date.parse(training.serverNow);
  return Math.max(
    0,
    Math.floor((end - Date.parse(training.startedAt)) / 1000) -
      training.accumulatedPauseSeconds,
  );
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Playbook.canvas },
  content: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    padding: 20,
    paddingBottom: 70,
  },
  flex: { flex: 1 },
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
  eyebrow: {
    color: Playbook.orange,
    fontFamily: Fonts.mono,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  title: { color: Playbook.ink, fontFamily: Fonts.display, fontSize: 32, fontWeight: "900", marginTop: 6 },
  clock: { color: Playbook.ink, fontFamily: Fonts.mono, fontSize: 22, fontWeight: "900" },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Playbook.line,
    overflow: "hidden",
    marginTop: 22,
  },
  progressFill: { height: "100%", backgroundColor: Playbook.orange },
  progressLabel: { color: Playbook.muted, fontFamily: Fonts.mono, fontSize: 10, marginTop: 7 },
  pauseButton: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: Playbook.ink,
    borderRadius: 8,
    padding: 12,
    marginTop: 18,
  },
  pauseButtonText: { color: Playbook.inkSoft, fontWeight: "900" },
  pausedCard: {
    backgroundColor: Playbook.orangeSoft,
    borderLeftWidth: 3,
    borderLeftColor: Playbook.orange,
    padding: 16,
    gap: 5,
    marginTop: 14,
  },
  currentCard: {
    borderWidth: 1,
    borderColor: Playbook.ink,
    backgroundColor: Playbook.paper,
    padding: 20,
    gap: 13,
    marginTop: 18,
  },
  currentTitle: { color: Playbook.ink, fontFamily: Fonts.display, fontSize: 36, fontWeight: "900" },
  cardTitle: { color: Playbook.ink, fontFamily: Fonts.display, fontSize: 23, fontWeight: "900" },
  body: { color: Playbook.muted, fontSize: 14, lineHeight: 22 },
  volumeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  volumeText: {
    color: Playbook.inkSoft,
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: "800",
    backgroundColor: Playbook.surface,
    borderRadius: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  timerCard: {
    alignItems: "center",
    backgroundColor: Playbook.film,
    padding: 18,
    gap: 10,
  },
  timerLabel: { color: "#FFFFFF8F", fontFamily: Fonts.mono, fontSize: 11, fontWeight: "800" },
  timer: {
    color: Playbook.paper,
    fontFamily: Fonts.mono,
    fontSize: 48,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  actionRow: { gap: 9 },
  primaryButton: {
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: Playbook.orange,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  primaryButtonText: { color: Playbook.paper, fontWeight: "900" },
  secondaryButton: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: Playbook.ink,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  secondaryButtonText: { color: Playbook.inkSoft, fontWeight: "900" },
  textButton: { padding: 7 },
  textButtonText: { color: Playbook.muted, fontSize: 12, fontWeight: "800" },
  skipButton: { alignItems: "center", padding: 10 },
  skipText: { color: Playbook.muted, fontSize: 12, fontWeight: "800" },
  disabledButton: { opacity: 0.3 },
  message: { color: Playbook.danger, fontSize: 13, lineHeight: 20, marginTop: 12 },
  queue: {
    borderTopWidth: 1,
    borderTopColor: Playbook.ink,
    marginTop: 30,
    paddingTop: 22,
    gap: 14,
  },
  queueSection: { gap: 8 },
  queueSectionName: { color: Playbook.orange, fontFamily: Fonts.mono, fontSize: 11, fontWeight: "900" },
  queueItem: { flexDirection: "row", alignItems: "center", gap: 9 },
  queueMark: { width: 18, color: Playbook.orange, fontWeight: "900" },
  queueTitle: { color: Playbook.inkSoft, fontSize: 13 },
  dangerButton: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E3BCAF",
    borderRadius: 8,
    padding: 13,
    marginTop: 30,
  },
  dangerText: { color: Playbook.danger, fontSize: 12, fontWeight: "900" },
  summaryContent: {
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    padding: 24,
    paddingTop: 60,
    gap: 14,
  },
  summaryTitle: { color: Playbook.ink, fontFamily: Fonts.display, fontSize: 44, fontWeight: "900" },
  summaryGrid: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: Playbook.line,
    overflow: "hidden",
    marginVertical: 16,
  },
  summaryStat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 6,
  },
  summaryValue: { color: Playbook.ink, fontFamily: Fonts.display, fontSize: 24, fontWeight: "900" },
});
