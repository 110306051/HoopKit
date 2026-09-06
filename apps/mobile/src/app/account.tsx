import { useCallback, useState } from "react";
import { router, type Href } from "expo-router";
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
import { ErrorState, LoadingState } from "@/components/content-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CourtIndex } from "@/components/playbook-ui";
import { Fonts, Playbook } from "@/constants/theme";
import { useApiResource } from "@/hooks/use-api-resource";
import { useRefreshOnFocus } from "@/hooks/use-refresh-on-focus";
import {
  createPersonalPlan,
  deleteAccount,
  getMemberOverview,
} from "@/lib/member-api";
import { useSession } from "@/providers/session-provider";

export default function AccountScreen() {
  const { session, loading } = useSession();
  if (loading) return <LoadingState label="讀取登入狀態…" />;
  return session ? (
    <MemberHome accessToken={session.accessToken} />
  ) : (
    <AuthForm />
  );
}

function AuthForm() {
  const { login, register } = useSession();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        const signedIn = await register(email, password, displayName);
        if (!signedIn) {
          setMessage("註冊完成，請先到 Email 完成驗證後再登入。");
          setMode("login");
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失敗。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.authContent}
        keyboardShouldPersistTaps="handled"
      >
        <CourtIndex
          eyebrow="YOUR TRAINING / YOUR ORDER"
          title={mode === "login" ? "登入 HoopKit" : "建立訓練帳號"}
          description="登入後可以收藏招式、複製公開菜單，並建立自己的訓練順序。"
        />
        <View style={styles.form}>
          {mode === "register" ? (
            <Field
              label="顯示名稱"
              value={displayName}
              onChangeText={setDisplayName}
            />
          ) : null}
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Field
            label="密碼（至少 8 碼）"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <Pressable
            disabled={busy}
            onPress={submit}
            style={styles.primaryButton}
          >
            {busy ? (
              <ActivityIndicator color={Playbook.paper} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {mode === "login" ? "登入" : "註冊"}
              </Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => {
              setMode(mode === "login" ? "register" : "login");
              setMessage(null);
            }}
            style={styles.textButton}
          >
            <Text style={styles.textButtonLabel}>
              {mode === "login"
                ? "還沒有帳號？建立帳號"
                : "已經有帳號？返回登入"}
            </Text>
          </Pressable>
          <LegalLinks />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field(
  props: React.ComponentProps<typeof TextInput> & { label: string },
) {
  const { label, ...inputProps } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        placeholderTextColor={Playbook.mutedLight}
        style={styles.input}
      />
    </View>
  );
}

function MemberHome({ accessToken }: { accessToken: string }) {
  const { logout } = useSession();
  const [newPlanName, setNewPlanName] = useState("");
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const loader = useCallback(
    (signal: AbortSignal) => getMemberOverview(accessToken, signal),
    [accessToken],
  );
  const { data, error, loading, retry, refresh } = useApiResource(loader);
  useRefreshOnFocus(refresh);
  if (loading) return <LoadingState label="載入你的訓練空間…" />;
  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (!data) return null;

  async function createPlan() {
    if (!newPlanName.trim()) return;
    setCreatingPlan(true);
    setCreateError(null);
    try {
      const plan = await createPersonalPlan(accessToken, {
        name: newPlanName.trim(),
      });
      setNewPlanName("");
      router.push(`/my-plans/${plan.id}` as Href);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "建立菜單失敗。");
    } finally {
      setCreatingPlan(false);
    }
  }

  async function confirmDeleteAccount() {
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteAccount(accessToken);
      await logout();
      setDeleteVisible(false);
      router.replace("/" as Href);
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : "刪除帳號失敗。");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.memberContent}>
        <View style={styles.memberHeading}>
          <View>
            <Text style={styles.eyebrow}>MY HOOPKIT</Text>
            <Text style={styles.memberTitle}>
              {data.profile?.displayName || "球員"}
            </Text>
            <Text style={styles.email}>{data.account.email}</Text>
          </View>
          <Pressable onPress={() => void logout()} style={styles.outlineButton}>
            <Text style={styles.outlineButtonText}>登出</Text>
          </Pressable>
        </View>
        <StatRow
          values={[
            [String(data.plans.length), "個人菜單"],
            [String(data.favoriteMoves.length), "收藏招式"],
            [String(data.favoriteWorkouts.length), "收藏菜單"],
          ]}
        />
        <Pressable
          onPress={() => router.push("/training/history" as Href)}
          style={styles.historyButton}
        >
          <Text style={styles.outlineButtonText}>查看訓練紀錄與繼續訓練 →</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/my-clips" as Href)}
          style={styles.clipLibraryButton}
        >
          <View style={styles.clipLibraryCopy}>
            <Text style={styles.clipLibraryEyebrow}>PERSONAL FILM</Text>
            <Text style={styles.clipLibraryTitle}>上傳與整理我的片段</Text>
            <Text style={styles.clipLibraryBody}>
              選擇本機影片，標記 HoopKit 球員與自訂技術標籤。
            </Text>
          </View>
          <Text style={styles.clipLibraryArrow}>→</Text>
        </Pressable>
        <MemberSection
          title="我的訓練菜單"
          description="從公開菜單建立副本後，就屬於你自己的內容。"
        >
          {data.plans.length ? (
            data.plans.map((plan) => (
              <Pressable
                key={plan.id}
                onPress={() => router.push(`/my-plans/${plan.id}` as Href)}
                style={styles.listCard}
              >
                <Text style={styles.listTitle}>{plan.name}</Text>
                <Text style={styles.listBody}>
                  {plan.description || "尚未加入說明"}
                </Text>
                <Text style={styles.comingSoon}>開啟編輯與排序 →</Text>
              </Pressable>
            ))
          ) : (
            <EmptyCard text="還沒有個人菜單，先從公開菜單挑一份加入。" />
          )}
          <View style={styles.createPlanRow}>
            <TextInput
              value={newPlanName}
              onChangeText={setNewPlanName}
              placeholder="例如：週末控球訓練"
              placeholderTextColor={Playbook.mutedLight}
              style={[styles.input, styles.createPlanInput]}
            />
            <Pressable
              disabled={creatingPlan || !newPlanName.trim()}
              onPress={() => void createPlan()}
              style={styles.compactButton}
            >
              <Text style={styles.primaryButtonText}>
                {creatingPlan ? "建立中" : "新增"}
              </Text>
            </Pressable>
          </View>
          {createError ? (
            <Text style={styles.message}>{createError}</Text>
          ) : null}
          <Pressable
            onPress={() => router.push("/workouts" as Href)}
            style={styles.outlineWide}
          >
            <Text style={styles.outlineButtonText}>瀏覽公開菜單</Text>
          </Pressable>
        </MemberSection>
        <MemberSection title="收藏招式">
          {data.favoriteMoves.length ? (
            data.favoriteMoves.map((move) => (
              <Pressable
                key={move.id}
                onPress={() => router.push(`/moves/${move.slug}` as Href)}
                style={styles.listCard}
              >
                <Text style={styles.listTitle}>{move.name}</Text>
                <Text style={styles.listBody}>{move.summary}</Text>
              </Pressable>
            ))
          ) : (
            <EmptyCard text="看到想練的招式時，按下收藏即可放到這裡。" />
          )}
        </MemberSection>
        <MemberSection title="收藏公開菜單">
          {data.favoriteWorkouts.length ? (
            data.favoriteWorkouts.map((workout) => (
              <Pressable
                key={workout.id}
                onPress={() => router.push(`/workouts/${workout.slug}` as Href)}
                style={styles.listCard}
              >
                <Text style={styles.listTitle}>{workout.name}</Text>
                <Text style={styles.listBody}>{workout.description}</Text>
                <Text style={styles.comingSoon}>查看公開菜單 →</Text>
              </Pressable>
            ))
          ) : (
            <EmptyCard text="收藏公開菜單後，會顯示在這裡。" />
          )}
        </MemberSection>
        <View style={styles.submissionNote}>
          <Text style={styles.listTitle}>官方內容與個人片段分開保存</Text>
          <Text style={styles.listBody}>
            你可以標記 Admin 提供的球員，但不會改動官方球員或招式資料。
          </Text>
        </View>
        <View style={styles.accountSafety}>
          <Text style={styles.sectionTitle}>帳號與資料</Text>
          <LegalLinks />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setDeleteError(null);
              setDeleteVisible(true);
            }}
            style={styles.deleteAccountButton}
          >
            <Text style={styles.deleteAccountText}>永久刪除帳號與個人資料</Text>
          </Pressable>
        </View>
      </ScrollView>
      <ConfirmDialog
        visible={deleteVisible}
        title="永久刪除 HoopKit 帳號？"
        description="這會刪除登入帳號、收藏、個人菜單、訓練紀錄，以及由 HoopKit 管理的個人 Mux 影片。操作無法復原。"
        confirmLabel="永久刪除"
        busy={deleteBusy}
        error={deleteError}
        onCancel={() => {
          if (!deleteBusy) setDeleteVisible(false);
          setDeleteError(null);
        }}
        onConfirm={() => void confirmDeleteAccount()}
      />
    </SafeAreaView>
  );
}

function LegalLinks() {
  return (
    <View style={styles.legalLinks}>
      <Pressable onPress={() => router.push("/legal/privacy" as Href)}>
        <Text style={styles.legalLink}>隱私權政策</Text>
      </Pressable>
      <Text style={styles.legalDivider}>·</Text>
      <Pressable onPress={() => router.push("/legal/terms" as Href)}>
        <Text style={styles.legalLink}>服務條款</Text>
      </Pressable>
    </View>
  );
}

function MemberSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {description ? (
        <Text style={styles.sectionDescription}>{description}</Text>
      ) : null}
      <View style={styles.sectionStack}>{children}</View>
    </View>
  );
}

function StatRow({ values }: { values: string[][] }) {
  return (
    <View style={styles.stats}>
      {values.map(([value, label]) => (
        <View key={label} style={styles.stat}>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statLabel}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function EmptyCard({ text }: { text: string }) {
  return <Text style={styles.emptyCard}>{text}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Playbook.canvas },
  authContent: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    padding: 24,
    paddingTop: 50,
  },
  eyebrow: {
    color: Playbook.orange,
    fontFamily: Fonts.mono,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.6,
  },
  authTitle: {
    color: Playbook.ink,
    fontFamily: Fonts.display,
    fontSize: 34,
    fontWeight: "900",
    marginTop: 10,
  },
  lead: { color: Playbook.muted, fontSize: 15, lineHeight: 23, marginTop: 10 },
  form: { marginTop: 30, gap: 18 },
  field: { gap: 8 },
  label: { color: Playbook.inkSoft, fontSize: 13, fontWeight: "800" },
  input: {
    borderWidth: 1,
    borderColor: Playbook.line,
    borderRadius: 8,
    backgroundColor: Playbook.paper,
    color: Playbook.ink,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  message: { color: Playbook.danger, fontSize: 13, lineHeight: 20 },
  primaryButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: Playbook.ink,
    paddingHorizontal: 18,
  },
  primaryButtonText: { color: Playbook.paper, fontWeight: "900", fontSize: 15 },
  textButton: { alignItems: "center", padding: 10 },
  textButtonLabel: { color: Playbook.inkSoft, fontWeight: "700" },
  memberContent: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    padding: 20,
    paddingBottom: 60,
  },
  memberHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 16,
  },
  memberTitle: {
    color: Playbook.ink,
    fontFamily: Fonts.display,
    fontSize: 31,
    fontWeight: "900",
    marginTop: 6,
  },
  email: {
    color: Playbook.muted,
    fontFamily: Fonts.mono,
    fontSize: 12,
    marginTop: 4,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: Playbook.lineStrong,
    borderRadius: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  outlineButtonText: { color: Playbook.inkSoft, fontWeight: "800" },
  stats: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: Playbook.line,
    overflow: "hidden",
    marginTop: 16,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 18,
    borderRightWidth: 1,
    borderRightColor: Playbook.line,
    backgroundColor: Playbook.paper,
  },
  statValue: {
    color: Playbook.ink,
    fontFamily: Fonts.display,
    fontSize: 26,
    fontWeight: "900",
  },
  statLabel: { color: Playbook.muted, fontSize: 11, marginTop: 4 },
  section: { marginTop: 34 },
  sectionTitle: {
    color: Playbook.ink,
    fontFamily: Fonts.display,
    fontSize: 27,
    fontWeight: "900",
    borderTopWidth: 1,
    borderTopColor: Playbook.ink,
    paddingTop: 12,
  },
  sectionDescription: {
    color: Playbook.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 5,
  },
  sectionStack: { gap: 10, marginTop: 14 },
  listCard: {
    borderWidth: 1,
    borderColor: Playbook.line,
    backgroundColor: Playbook.paper,
    padding: 16,
    gap: 6,
  },
  listTitle: { color: Playbook.ink, fontSize: 16, fontWeight: "800" },
  listBody: { color: Playbook.muted, fontSize: 13, lineHeight: 20 },
  comingSoon: {
    color: Playbook.orange,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
  },
  createPlanRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  createPlanInput: { flex: 1 },
  compactButton: {
    minHeight: 48,
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: Playbook.ink,
    paddingHorizontal: 18,
  },
  emptyCard: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: Playbook.lineStrong,
    color: Playbook.muted,
    padding: 18,
    lineHeight: 20,
  },
  outlineWide: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: Playbook.ink,
    borderRadius: 8,
    padding: 13,
  },
  historyButton: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: Playbook.ink,
    borderRadius: 8,
    padding: 13,
    marginTop: 12,
  },
  clipLibraryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#27282D",
    backgroundColor: Playbook.film,
    padding: 18,
  },
  clipLibraryCopy: { flex: 1, gap: 5 },
  clipLibraryEyebrow: {
    color: Playbook.orange,
    fontFamily: Fonts.mono,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.3,
  },
  clipLibraryTitle: {
    color: Playbook.paper,
    fontFamily: Fonts.display,
    fontSize: 22,
    fontWeight: "900",
  },
  clipLibraryBody: { color: "#FFFFFF80", fontSize: 12, lineHeight: 18 },
  clipLibraryArrow: {
    color: Playbook.orange,
    fontFamily: Fonts.display,
    fontSize: 28,
    fontWeight: "900",
  },
  submissionNote: {
    marginTop: 34,
    borderLeftWidth: 3,
    borderLeftColor: Playbook.orange,
    backgroundColor: Playbook.orangeSoft,
    padding: 18,
    gap: 7,
  },
  accountSafety: { marginTop: 34, gap: 14 },
  legalLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  legalLink: {
    color: Playbook.inkSoft,
    fontSize: 12,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  legalDivider: { color: Playbook.mutedLight },
  deleteAccountButton: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: Playbook.danger,
    borderRadius: 8,
    padding: 13,
  },
  deleteAccountText: {
    color: Playbook.danger,
    fontSize: 13,
    fontWeight: "900",
  },
});
