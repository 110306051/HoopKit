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
import { CourtIndex } from "@/components/playbook-ui";
import { Fonts, Playbook } from "@/constants/theme";
import { useApiResource } from "@/hooks/use-api-resource";
import { getWorkouts } from "@/lib/content-api";

export default function WorkoutsScreen() {
  const loader = useCallback((signal: AbortSignal) => getWorkouts(signal), []);
  const { data, error, loading, retry } = useApiResource(loader);
  return (
    <View style={styles.screen}>
      <SafeAreaView edges={["bottom"]} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.intro}>
            <CourtIndex
              eyebrow="WORKOUT PLAYBOOKS"
              title="公開訓練菜單"
              description="參考球員與教練的訓練架構；登入後建立個人副本，再自由調整內容與順序。"
            />
          </View>
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={retry} />
          ) : data?.items.length ? (
            <View style={styles.list}>
              {data.items.map((workout) => {
                const imageUrl =
                  workout.cover?.sourceUrl ?? workout.cover?.thumbnailUrl;
                return (
                  <Pressable
                    key={workout.id}
                    style={styles.card}
                    onPress={() =>
                      router.push(`/workouts/${workout.slug}` as Href)
                    }
                  >
                    {imageUrl ? (
                      <Image
                        source={imageUrl}
                        contentFit="cover"
                        style={styles.cover}
                      />
                    ) : (
                      <View style={[styles.cover, styles.fallback]}>
                        <Text style={styles.mark}>PLAN</Text>
                      </View>
                    )}
                    <View style={styles.cardBody}>
                      <Text style={styles.meta}>
                        {difficultyLabel(workout.difficulty)}
                        {workout.estimatedDurationMinutes
                          ? ` · ${workout.estimatedDurationMinutes} 分鐘`
                          : ""}
                      </Text>
                      <Text style={styles.cardTitle}>{workout.name}</Text>
                      <Text numberOfLines={2} style={styles.description}>
                        {workout.description}
                      </Text>
                      <Text style={styles.source}>
                        {workout.sourcePlayer?.name ?? "HoopKit 教練團"}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <EmptyState message="請先到 Admin 發布第一份訓練菜單。" />
          )}
        </ScrollView>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Playbook.canvas },
  safe: { flex: 1 },
  content: {
    width: "100%",
    maxWidth: 800,
    alignSelf: "center",
    padding: 20,
    paddingBottom: 50,
  },
  intro: { paddingVertical: 12 },
  list: { marginTop: 22, gap: 16 },
  card: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Playbook.line,
    backgroundColor: Playbook.paper,
  },
  cover: { width: "100%", aspectRatio: 16 / 8 },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Playbook.surface,
  },
  mark: { color: Playbook.orange, fontFamily: Fonts.display, fontSize: 25, fontWeight: "900", letterSpacing: 3 },
  cardBody: { padding: 18, gap: 8 },
  meta: { color: Playbook.orange, fontFamily: Fonts.mono, fontSize: 10, fontWeight: "900" },
  cardTitle: { color: Playbook.ink, fontFamily: Fonts.display, fontSize: 25, fontWeight: "900" },
  description: { color: Playbook.muted, fontSize: 14, lineHeight: 21 },
  source: { color: Playbook.inkSoft, fontSize: 12, fontWeight: "700" },
});
