import { useState } from "react";
import { router, type Href } from "expo-router";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Fonts, Playbook } from "@/constants/theme";
import {
  createContentReport,
  type ReportReason,
  type ReportTargetType,
} from "@/lib/member-api";
import { useSession } from "@/providers/session-provider";

const reasons: { value: ReportReason; label: string }[] = [
  { value: "inappropriate", label: "不當內容" },
  { value: "copyright", label: "著作權疑慮" },
  { value: "misleading", label: "資訊錯誤／誤導" },
  { value: "safety", label: "訓練安全疑慮" },
  { value: "other", label: "其他" },
];

export function ReportContentButton({
  targetType,
  targetId,
}: {
  targetType: ReportTargetType;
  targetId: string;
}) {
  const { session } = useSession();
  const [visible, setVisible] = useState(false);
  const [reason, setReason] = useState<ReportReason>("inappropriate");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function open() {
    if (!session) {
      router.push("/account" as Href);
      return;
    }
    setMessage(null);
    setVisible(true);
  }

  async function submit() {
    if (!session) return;
    setBusy(true);
    setMessage(null);
    try {
      await createContentReport(session.accessToken, {
        targetType,
        targetId,
        reason,
        details: details.trim() || undefined,
      });
      setMessage("已送出回報，HoopKit 管理員會進行審查。");
      setDetails("");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "送出回報失敗。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={open}
        style={styles.trigger}
      >
        <Text style={styles.triggerText}>
          {session ? "回報內容" : "登入後回報內容"}
        </Text>
      </Pressable>
      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={() => !busy && setVisible(false)}
      >
        <View style={styles.overlay}>
          <Pressable
            disabled={busy}
            onPress={() => setVisible(false)}
            style={StyleSheet.absoluteFill}
          />
          <View accessibilityViewIsModal style={styles.dialog}>
            <Text style={styles.eyebrow}>TRUST &amp; SAFETY</Text>
            <Text style={styles.title}>回報這筆內容</Text>
            <Text style={styles.description}>
              請選擇最符合的原因。若涉及立即人身危險，請先聯絡所在地緊急服務。
            </Text>
            <View style={styles.reasons}>
              {reasons.map((item) => (
                <Pressable
                  key={item.value}
                  onPress={() => setReason(item.value)}
                  style={[
                    styles.reason,
                    reason === item.value && styles.reasonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.reasonText,
                      reason === item.value && styles.reasonTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              multiline
              maxLength={2000}
              value={details}
              onChangeText={setDetails}
              placeholder="補充說明（選填）"
              placeholderTextColor={Playbook.mutedLight}
              style={styles.input}
            />
            {message ? <Text style={styles.message}>{message}</Text> : null}
            <View style={styles.actions}>
              <Pressable
                disabled={busy}
                onPress={() => setVisible(false)}
                style={styles.cancel}
              >
                <Text style={styles.cancelText}>關閉</Text>
              </Pressable>
              <Pressable
                disabled={busy || message?.startsWith("已送出")}
                onPress={() => void submit()}
                style={styles.submit}
              >
                {busy ? (
                  <ActivityIndicator color={Playbook.paper} />
                ) : (
                  <Text style={styles.submitText}>送出回報</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { alignSelf: "center", marginTop: 24, padding: 12 },
  triggerText: {
    color: Playbook.muted,
    fontSize: 12,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,.48)",
    padding: 20,
  },
  dialog: {
    width: "100%",
    maxWidth: 460,
    borderRadius: 10,
    backgroundColor: Playbook.paper,
    padding: 20,
    gap: 12,
  },
  eyebrow: {
    color: Playbook.orange,
    fontFamily: Fonts.mono,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  title: {
    color: Playbook.ink,
    fontFamily: Fonts.display,
    fontSize: 26,
    fontWeight: "900",
  },
  description: { color: Playbook.muted, fontSize: 13, lineHeight: 20 },
  reasons: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  reason: {
    borderWidth: 1,
    borderColor: Playbook.line,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  reasonActive: { backgroundColor: Playbook.ink, borderColor: Playbook.ink },
  reasonText: { color: Playbook.inkSoft, fontSize: 12, fontWeight: "800" },
  reasonTextActive: { color: Playbook.paper },
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: Playbook.line,
    borderRadius: 7,
    color: Playbook.ink,
    padding: 12,
    textAlignVertical: "top",
  },
  message: { color: Playbook.orange, fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: "row", gap: 9 },
  cancel: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Playbook.line,
    borderRadius: 7,
    padding: 12,
  },
  cancelText: { color: Playbook.inkSoft, fontWeight: "800" },
  submit: {
    flex: 1,
    alignItems: "center",
    borderRadius: 7,
    backgroundColor: Playbook.ink,
    padding: 12,
  },
  submitText: { color: Playbook.paper, fontWeight: "900" },
});
