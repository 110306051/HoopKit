import { useCallback, useState } from "react";
import { router, useLocalSearchParams, type Href } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ErrorState, LoadingState } from "@/components/content-state";
import { useApiResource } from "@/hooks/use-api-resource";
import { useRefreshOnFocus } from "@/hooks/use-refresh-on-focus";
import {
  createPlanItem,
  createPlanSection,
  deletePersonalPlan,
  deletePlanItem,
  deletePlanSection,
  getMemberOverview,
  getPersonalPlan,
  reorderPlanItems,
  reorderPlanSections,
  updatePersonalPlan,
  updatePlanItem,
  updatePlanSection,
} from "@/lib/member-api";
import { useSession } from "@/providers/session-provider";
import {
  getActiveWorkoutSession,
  startWorkoutSession,
} from "@/lib/training-api";
import type {
  MemberOverview,
  PersonalPlanDetail,
  PersonalPlanItem,
  PersonalPlanSection,
} from "@/types/member";

type EditorData = { plan: PersonalPlanDetail; overview: MemberOverview };

export default function PersonalPlanEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, loading: sessionLoading } = useSession();
  const accessToken = session?.accessToken ?? "";
  const loader = useCallback(
    async (signal: AbortSignal): Promise<EditorData> => {
      if (!accessToken) throw new Error("請先登入後再編輯個人菜單。");
      const [plan, overview] = await Promise.all([
        getPersonalPlan(accessToken, id, signal),
        getMemberOverview(accessToken, signal),
      ]);
      return { plan, overview };
    },
    [accessToken, id],
  );
  const { data, error, loading, retry, refresh } = useApiResource(loader);
  useRefreshOnFocus(refresh);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deletePlanOpen, setDeletePlanOpen] = useState(false);
  const [deletePlanError, setDeletePlanError] = useState<string | null>(null);

  if (sessionLoading) return <LoadingState label="讀取登入狀態…" />;
  if (!session) {
    return (
      <View style={styles.centered}>
        <Text style={styles.pageTitle}>請先登入</Text>
        <Text style={styles.muted}>個人訓練菜單只會顯示給帳號本人。</Text>
        <Pressable
          onPress={() => router.replace("/account" as Href)}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>前往登入</Text>
        </Pressable>
      </View>
    );
  }
  if (loading) return <LoadingState label="載入個人菜單…" />;
  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (!data) return null;

  async function runMutation(
    key: string,
    action: () => Promise<unknown>,
    success: string,
  ) {
    setBusy(key);
    setNotice(null);
    try {
      await action();
      setNotice(success);
      refresh();
      return true;
    } catch (mutationError) {
      setNotice(
        mutationError instanceof Error ? mutationError.message : "操作失敗。",
      );
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function moveSection(index: number, direction: -1 | 1) {
    if (!data) return;
    const target = index + direction;
    if (target < 0 || target >= data.plan.sections.length) return;
    const ordered = [...data.plan.sections];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    await runMutation(
      "section-order",
      () =>
        reorderPlanSections(
          accessToken,
          id,
          ordered.map((section) => section.id),
        ),
      "區段順序已更新。",
    );
  }

  async function startTraining() {
    setBusy("start-training");
    setNotice(null);
    try {
      const training = await startWorkoutSession(accessToken, id);
      router.push(`/training/${training.id}` as Href);
    } catch (startError) {
      const active = await getActiveWorkoutSession(accessToken).catch(
        () => null,
      );
      if (active) {
        setNotice("你已有進行中的訓練，已為你開啟該場訓練。");
        router.push(`/training/${active.id}` as Href);
      } else {
        setNotice(
          startError instanceof Error ? startError.message : "無法開始訓練。",
        );
      }
    } finally {
      setBusy(null);
    }
  }

  async function removePlan() {
    setBusy("delete-plan");
    setDeletePlanError(null);
    try {
      await deletePersonalPlan(accessToken, id);
      setDeletePlanOpen(false);
      router.replace("/account" as Href);
    } catch (deleteError) {
      setDeletePlanError(
        deleteError instanceof Error ? deleteError.message : "刪除失敗。",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <PlanHeader
          plan={data.plan}
          disabled={Boolean(busy)}
          onSave={(name, description) =>
            runMutation(
              "plan",
              () => updatePersonalPlan(accessToken, id, { name, description }),
              "菜單資料已儲存。",
            )
          }
        />
        <View style={styles.guideCard}>
          <Text style={styles.cardTitle}>建議編輯順序</Text>
          <Text style={styles.guideText}>1. 先建立熱身、主要訓練等區段</Text>
          <Text style={styles.guideText}>2. 加入自訂項目或收藏招式</Text>
          <Text style={styles.guideText}>
            3. 設定組數／次數後，再用箭頭排序
          </Text>
        </View>
        <Pressable
          disabled={
            Boolean(busy) ||
            !data.plan.sections.some((section) => section.items.length > 0)
          }
          onPress={() => void startTraining()}
          style={styles.startButton}
        >
          <Text style={styles.primaryButtonText}>
            {busy === "start-training" ? "準備訓練中…" : "開始這份訓練"}
          </Text>
        </Pressable>
        {busy ? (
          <View style={styles.savingRow}>
            <ActivityIndicator color="#111111" size="small" />
            <Text style={styles.muted}>正在儲存變更…</Text>
          </View>
        ) : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.eyebrow}>STRUCTURE</Text>
            <Text style={styles.sectionTitle}>訓練區段與順序</Text>
          </View>
          <Text style={styles.count}>{data.plan.sections.length} 區段</Text>
        </View>
        <View style={styles.sectionStack}>
          {data.plan.sections.map((section, index) => (
            <SectionEditor
              key={section.id}
              section={section}
              sectionIndex={index}
              sectionCount={data.plan.sections.length}
              favoriteMoves={data.overview.favoriteMoves}
              disabled={Boolean(busy)}
              onMove={(direction) => moveSection(index, direction)}
              onRename={(name) =>
                runMutation(
                  `section-${section.id}`,
                  () => updatePlanSection(accessToken, id, section.id, name),
                  "區段名稱已更新。",
                )
              }
              onDelete={() =>
                runMutation(
                  `section-${section.id}`,
                  () => deletePlanSection(accessToken, id, section.id),
                  "區段已刪除。",
                )
              }
              onAddItem={(input) =>
                runMutation(
                  `section-${section.id}`,
                  () => createPlanItem(accessToken, id, section.id, input),
                  "訓練項目已加入。",
                )
              }
              onUpdateItem={(itemId, input) =>
                runMutation(
                  `item-${itemId}`,
                  () => updatePlanItem(accessToken, id, itemId, input),
                  "訓練項目已更新。",
                )
              }
              onDeleteItem={(itemId) =>
                runMutation(
                  `item-${itemId}`,
                  () => deletePlanItem(accessToken, id, itemId),
                  "訓練項目已刪除。",
                )
              }
              onReorderItems={(ids) =>
                runMutation(
                  `items-${section.id}`,
                  () => reorderPlanItems(accessToken, id, section.id, ids),
                  "項目順序已更新。",
                )
              }
            />
          ))}
          <NewSectionForm
            disabled={Boolean(busy)}
            onCreate={(name) =>
              runMutation(
                "new-section",
                () => createPlanSection(accessToken, id, name),
                "新區段已建立。",
              )
            }
          />
        </View>
        <Pressable
          disabled={busy === "delete-plan"}
          onPress={() => {
            setDeletePlanError(null);
            setDeletePlanOpen(true);
          }}
          style={styles.dangerButton}
        >
          <Text style={styles.dangerText}>
            {busy === "delete-plan" ? "刪除中…" : "刪除這份個人菜單"}
          </Text>
        </Pressable>
      </ScrollView>
      <ConfirmDialog
        visible={deletePlanOpen}
        title="刪除個人菜單"
        description="這會連同所有區段與項目一起刪除，且無法復原。"
        confirmLabel="刪除菜單"
        busy={busy === "delete-plan"}
        error={deletePlanError}
        onCancel={() => setDeletePlanOpen(false)}
        onConfirm={() => void removePlan()}
      />
    </SafeAreaView>
  );
}

function PlanHeader({
  plan,
  disabled,
  onSave,
}: {
  plan: PersonalPlanDetail;
  disabled: boolean;
  onSave: (name: string, description: string) => Promise<boolean>;
}) {
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description);
  return (
    <View style={styles.headerCard}>
      <Text style={styles.eyebrow}>PERSONAL WORKOUT</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        style={styles.titleInput}
        maxLength={120}
      />
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="加入這份菜單的目標或提醒"
        placeholderTextColor="#888888"
        multiline
        style={[styles.input, styles.descriptionInput]}
        maxLength={2000}
      />
      <Pressable
        disabled={disabled || !name.trim()}
        onPress={() => void onSave(name.trim(), description.trim())}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>儲存菜單資訊</Text>
      </Pressable>
    </View>
  );
}

function NewSectionForm({
  disabled,
  onCreate,
}: {
  disabled: boolean;
  onCreate: (name: string) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  return (
    <View style={styles.addCard}>
      <Text style={styles.cardTitle}>新增訓練區段</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="例如：熱身、控球、投籃"
        placeholderTextColor="#888888"
        style={styles.input}
      />
      <Pressable
        disabled={disabled || !name.trim()}
        onPress={() =>
          void onCreate(name.trim()).then((created) => {
            if (created) setName("");
          })
        }
        style={styles.secondaryButton}
      >
        <Text style={styles.secondaryButtonText}>新增區段</Text>
      </Pressable>
    </View>
  );
}

type FavoriteMove = MemberOverview["favoriteMoves"][number];

function SectionEditor({
  section,
  sectionIndex,
  sectionCount,
  favoriteMoves,
  disabled,
  onMove,
  onRename,
  onDelete,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onReorderItems,
}: {
  section: PersonalPlanSection;
  sectionIndex: number;
  sectionCount: number;
  favoriteMoves: FavoriteMove[];
  disabled: boolean;
  onMove: (direction: -1 | 1) => Promise<void>;
  onRename: (name: string) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  onAddItem: (input: {
    moveId?: string;
    title: string;
    sets?: number;
    reps?: number;
    restSeconds?: number;
  }) => Promise<boolean>;
  onUpdateItem: (
    itemId: string,
    input: {
      title: string;
      instructions?: string;
      sets?: number;
      reps?: number;
      durationSeconds?: number;
      restSeconds?: number;
    },
  ) => Promise<boolean>;
  onDeleteItem: (itemId: string) => Promise<boolean>;
  onReorderItems: (ids: string[]) => Promise<boolean>;
}) {
  const [name, setName] = useState(section.name);
  const [showFavorites, setShowFavorites] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function moveItem(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= section.items.length) return;
    const ordered = [...section.items];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    await onReorderItems(ordered.map((item) => item.id));
  }

  async function removeSection() {
    setDeleteError(null);
    const deleted = await onDelete();
    if (deleted) {
      setDeleteOpen(false);
      return;
    }
    setDeleteError("刪除失敗，請稍後再試。");
  }

  return (
    <View style={styles.sectionCard}>
      <View style={styles.orderRow}>
        <Text style={styles.orderLabel}>
          {String(sectionIndex + 1).padStart(2, "0")}
        </Text>
        <OrderButtons
          disabled={disabled}
          canUp={sectionIndex > 0}
          canDown={sectionIndex < sectionCount - 1}
          onUp={() => onMove(-1)}
          onDown={() => onMove(1)}
        />
      </View>
      <View style={styles.renameRow}>
        <TextInput
          value={name}
          onChangeText={setName}
          style={[styles.input, styles.flexInput]}
          maxLength={100}
        />
        <Pressable
          disabled={disabled || !name.trim()}
          onPress={() => void onRename(name.trim())}
          style={styles.smallButton}
        >
          <Text style={styles.smallButtonText}>改名</Text>
        </Pressable>
      </View>
      <View style={styles.itemStack}>
        {section.items.length ? (
          section.items.map((item, index) => (
            <ItemEditor
              key={item.id}
              item={item}
              index={index}
              count={section.items.length}
              disabled={disabled}
              onMove={(direction) => moveItem(index, direction)}
              onSave={(input) => onUpdateItem(item.id, input)}
              onDelete={() => onDeleteItem(item.id)}
            />
          ))
        ) : (
          <Text style={styles.emptyText}>此區段還沒有訓練項目。</Text>
        )}
      </View>
      <View style={styles.addArea}>
        <Text style={styles.subheading}>加入訓練項目</Text>
        <View style={styles.renameRow}>
          <TextInput
            value={customTitle}
            onChangeText={setCustomTitle}
            placeholder="自訂項目名稱"
            placeholderTextColor="#888888"
            style={[styles.input, styles.flexInput]}
          />
          <Pressable
            disabled={disabled || !customTitle.trim()}
            onPress={() =>
              void onAddItem({
                title: customTitle.trim(),
                sets: 3,
                reps: 10,
                restSeconds: 30,
              }).then((created) => {
                if (created) setCustomTitle("");
              })
            }
            style={styles.smallButton}
          >
            <Text style={styles.smallButtonText}>新增</Text>
          </Pressable>
        </View>
        <Pressable
          disabled={disabled}
          onPress={() => setShowFavorites((value) => !value)}
          style={styles.favoriteToggle}
        >
          <Text style={styles.secondaryButtonText}>
            {showFavorites
              ? "收起收藏招式"
              : `從收藏招式加入（${favoriteMoves.length}）`}
          </Text>
        </Pressable>
        {showFavorites ? (
          <View style={styles.favoriteList}>
            {favoriteMoves.length ? (
              favoriteMoves.map((move) => (
                <View key={move.id} style={styles.favoriteRow}>
                  <View style={styles.favoriteCopy}>
                    <Text style={styles.favoriteTitle}>{move.name}</Text>
                    <Text numberOfLines={1} style={styles.muted}>
                      {move.summary}
                    </Text>
                  </View>
                  <Pressable
                    disabled={disabled}
                    onPress={() =>
                      void onAddItem({
                        moveId: move.id,
                        title: move.name,
                        sets: 3,
                        reps: 10,
                        restSeconds: 30,
                      })
                    }
                    style={styles.smallButton}
                  >
                    <Text style={styles.smallButtonText}>加入</Text>
                  </Pressable>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>目前沒有收藏招式。</Text>
            )}
          </View>
        ) : null}
      </View>
      <Pressable
        disabled={disabled}
        onPress={() => {
          setDeleteError(null);
          setDeleteOpen(true);
        }}
        style={styles.deleteLink}
      >
        <Text style={styles.dangerText}>刪除區段</Text>
      </Pressable>
      <ConfirmDialog
        visible={deleteOpen}
        title="刪除區段"
        description="區段內的訓練項目也會一起刪除，且無法復原。"
        confirmLabel="刪除區段"
        busy={disabled}
        error={deleteError}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void removeSection()}
      />
    </View>
  );
}

function ItemEditor({
  item,
  index,
  count,
  disabled,
  onMove,
  onSave,
  onDelete,
}: {
  item: PersonalPlanItem;
  index: number;
  count: number;
  disabled: boolean;
  onMove: (direction: -1 | 1) => Promise<void>;
  onSave: (input: {
    title: string;
    instructions?: string;
    sets?: number;
    reps?: number;
    durationSeconds?: number;
    restSeconds?: number;
  }) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
}) {
  const [title, setTitle] = useState(item.title);
  const [instructions, setInstructions] = useState(item.instructions);
  const [sets, setSets] = useState(numberText(item.sets));
  const [reps, setReps] = useState(numberText(item.reps));
  const [duration, setDuration] = useState(numberText(item.durationSeconds));
  const [rest, setRest] = useState(numberText(item.restSeconds));
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function removeItem() {
    setDeleteError(null);
    const deleted = await onDelete();
    if (deleted) {
      setDeleteOpen(false);
      return;
    }
    setDeleteError("刪除失敗，請稍後再試。");
  }

  return (
    <View style={styles.itemCard}>
      <View style={styles.orderRow}>
        <Text style={styles.itemNumber}>{index + 1}</Text>
        <OrderButtons
          disabled={disabled}
          canUp={index > 0}
          canDown={index < count - 1}
          onUp={() => onMove(-1)}
          onDown={() => onMove(1)}
        />
      </View>
      {item.move ? (
        <Text style={styles.linkedMove}>已連結招式 · {item.move.name}</Text>
      ) : null}
      <TextInput value={title} onChangeText={setTitle} style={styles.input} />
      <TextInput
        value={instructions}
        onChangeText={setInstructions}
        placeholder="動作提醒（選填）"
        placeholderTextColor="#888888"
        multiline
        style={[styles.input, styles.instructionsInput]}
      />
      <View style={styles.volumeGrid}>
        <NumberField label="組數" value={sets} onChangeText={setSets} />
        <NumberField label="次數" value={reps} onChangeText={setReps} />
        <NumberField label="秒數" value={duration} onChangeText={setDuration} />
        <NumberField label="休息秒" value={rest} onChangeText={setRest} />
      </View>
      <View style={styles.itemActions}>
        <Pressable
          disabled={
            disabled ||
            !title.trim() ||
            (!positiveNumber(reps) && !positiveNumber(duration))
          }
          onPress={() =>
            void onSave({
              title: title.trim(),
              instructions: instructions.trim(),
              sets: positiveNumber(sets),
              reps: positiveNumber(reps),
              durationSeconds: positiveNumber(duration),
              restSeconds: nonNegativeNumber(rest),
            })
          }
          style={styles.smallButton}
        >
          <Text style={styles.smallButtonText}>儲存項目</Text>
        </Pressable>
        <Pressable
          disabled={disabled}
          onPress={() => {
            setDeleteError(null);
            setDeleteOpen(true);
          }}
          style={styles.deleteLink}
        >
          <Text style={styles.dangerText}>刪除</Text>
        </Pressable>
      </View>
      <ConfirmDialog
        visible={deleteOpen}
        title="刪除訓練項目"
        description={`確定刪除「${item.title}」？這個動作無法復原。`}
        confirmLabel="刪除項目"
        busy={disabled}
        error={deleteError}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void removeItem()}
      />
    </View>
  );
}

function NumberField({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.numberField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        style={[styles.input, styles.numberInput]}
      />
    </View>
  );
}

function OrderButtons({
  disabled,
  canUp,
  canDown,
  onUp,
  onDown,
}: {
  disabled: boolean;
  canUp: boolean;
  canDown: boolean;
  onUp: () => Promise<void>;
  onDown: () => Promise<void>;
}) {
  return (
    <View style={styles.orderButtons}>
      <Pressable
        disabled={disabled || !canUp}
        onPress={() => void onUp()}
        style={[styles.orderButton, !canUp && styles.disabledButton]}
      >
        <Text style={styles.orderButtonText}>↑</Text>
      </Pressable>
      <Pressable
        disabled={disabled || !canDown}
        onPress={() => void onDown()}
        style={[styles.orderButton, !canDown && styles.disabledButton]}
      >
        <Text style={styles.orderButtonText}>↓</Text>
      </Pressable>
    </View>
  );
}

const numberText = (value: number | null) =>
  value === null ? "" : String(value);
function positiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}
function nonNegativeNumber(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#ffffff" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: 28,
    backgroundColor: "#ffffff",
  },
  content: {
    width: "100%",
    maxWidth: 800,
    alignSelf: "center",
    padding: 20,
    paddingBottom: 70,
  },
  headerCard: {
    borderRadius: 18,
    backgroundColor: "#f2f2f2",
    padding: 20,
    gap: 12,
  },
  guideCard: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#dddddd",
    borderRadius: 14,
    padding: 16,
    gap: 7,
    backgroundColor: "#ffffff",
  },
  guideText: { color: "#555555", fontSize: 13, lineHeight: 20 },
  startButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#111111",
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginTop: 14,
  },
  savingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  eyebrow: {
    color: "#666666",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  pageTitle: { color: "#111111", fontSize: 30, fontWeight: "900" },
  titleInput: {
    color: "#111111",
    fontSize: 29,
    fontWeight: "900",
    borderBottomWidth: 1,
    borderBottomColor: "#bbbbbb",
    paddingVertical: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cccccc",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    color: "#111111",
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  descriptionInput: { minHeight: 80, textAlignVertical: "top" },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#111111",
    paddingHorizontal: 17,
    paddingVertical: 13,
  },
  primaryButtonText: { color: "#ffffff", fontWeight: "900" },
  notice: {
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: "#f1f1f1",
    color: "#444444",
    padding: 12,
    fontSize: 13,
  },
  sectionHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 34,
    marginBottom: 14,
  },
  sectionTitle: {
    color: "#111111",
    fontSize: 23,
    fontWeight: "900",
    marginTop: 5,
  },
  count: { color: "#777777", fontSize: 12 },
  sectionStack: { gap: 16 },
  sectionCard: {
    borderWidth: 1,
    borderColor: "#d8d8d8",
    borderRadius: 17,
    padding: 16,
    gap: 13,
    backgroundColor: "#ffffff",
  },
  addCard: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#bbbbbb",
    borderRadius: 17,
    padding: 16,
    gap: 12,
  },
  cardTitle: { color: "#111111", fontSize: 18, fontWeight: "900" },
  orderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderLabel: { color: "#888888", fontSize: 12, fontWeight: "900" },
  orderButtons: { flexDirection: "row", gap: 6 },
  orderButton: {
    minWidth: 36,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bbbbbb",
    borderRadius: 8,
    paddingVertical: 6,
  },
  orderButtonText: { color: "#111111", fontSize: 16, fontWeight: "900" },
  disabledButton: { opacity: 0.25 },
  renameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  flexInput: { flex: 1 },
  smallButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    backgroundColor: "#111111",
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  smallButtonText: { color: "#ffffff", fontSize: 12, fontWeight: "900" },
  itemStack: { gap: 10 },
  itemCard: {
    borderRadius: 13,
    backgroundColor: "#f3f3f3",
    padding: 13,
    gap: 10,
  },
  itemNumber: { color: "#666666", fontSize: 12, fontWeight: "900" },
  linkedMove: { color: "#333333", fontSize: 11, fontWeight: "800" },
  instructionsInput: { minHeight: 64, textAlignVertical: "top" },
  volumeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  numberField: { minWidth: 72, flexGrow: 1, gap: 5 },
  fieldLabel: { color: "#666666", fontSize: 10, fontWeight: "800" },
  numberInput: { textAlign: "center" },
  itemActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addArea: {
    borderTopWidth: 1,
    borderTopColor: "#e2e2e2",
    paddingTop: 14,
    gap: 10,
  },
  subheading: { color: "#222222", fontSize: 14, fontWeight: "900" },
  favoriteToggle: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: 10,
    padding: 11,
  },
  favoriteList: { gap: 8 },
  favoriteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 10,
    backgroundColor: "#f3f3f3",
    padding: 11,
  },
  favoriteCopy: { flex: 1, gap: 3 },
  favoriteTitle: { color: "#111111", fontSize: 13, fontWeight: "800" },
  emptyText: { color: "#777777", fontSize: 13, paddingVertical: 8 },
  muted: { color: "#777777", fontSize: 12 },
  secondaryButton: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 10,
    padding: 12,
  },
  secondaryButtonText: { color: "#222222", fontWeight: "800" },
  deleteLink: { paddingVertical: 8, paddingHorizontal: 4 },
  dangerButton: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#c8a0a0",
    borderRadius: 12,
    padding: 13,
    marginTop: 34,
  },
  dangerText: { color: "#9b1c1c", fontSize: 12, fontWeight: "800" },
});
