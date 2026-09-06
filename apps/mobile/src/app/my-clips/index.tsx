import { useCallback, useEffect, useMemo, useState } from "react";
import { Image } from "expo-image";
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
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ErrorState, LoadingState } from "@/components/content-state";
import { MuxHighlightPlayer } from "@/components/mux-highlight-player";
import { CourtIndex } from "@/components/playbook-ui";
import { Fonts, Playbook } from "@/constants/theme";
import { useApiResource } from "@/hooks/use-api-resource";
import { useRefreshOnFocus } from "@/hooks/use-refresh-on-focus";
import {
  deleteUserClip,
  getUserClipOptions,
  getUserClips,
} from "@/lib/member-api";
import {
  pickUserVideo,
  uploadUserVideo,
  type PickedVideo,
} from "@/lib/user-clip-upload";
import { useSession } from "@/providers/session-provider";
import type { UserClip } from "@/types/member";

export default function MyClipsScreen() {
  const { session, loading: sessionLoading } = useSession();

  if (sessionLoading) return <LoadingState label="讀取登入狀態…" />;
  if (!session) {
    return (
      <SafeAreaView edges={["bottom"]} style={styles.screen}>
        <View style={styles.signInGate}>
          <Text style={styles.gateTitle}>登入後建立個人片段庫</Text>
          <Text style={styles.muted}>
            你的上傳、球員標籤與處理狀態只會出現在自己的帳號中。
          </Text>
          <Pressable
            onPress={() => router.push("/account" as Href)}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>前往登入</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return <ClipLibrary accessToken={session.accessToken} />;
}

function ClipLibrary({ accessToken }: { accessToken: string }) {
  const loader = useCallback(
    async (signal: AbortSignal) => {
      const [clips, options] = await Promise.all([
        getUserClips(accessToken, signal),
        getUserClipOptions(accessToken, signal),
      ]);
      return { clips: clips.items, players: options.players };
    },
    [accessToken],
  );
  const { data, error, loading, retry, refresh } = useApiResource(loader);
  const [file, setFile] = useState<PickedVideo | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagText, setTagText] = useState("");
  const [playerIds, setPlayerIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<UserClip | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  useRefreshOnFocus(refresh);

  const hasPending = data?.clips.some((clip) => clip.status === "pending");
  useEffect(() => {
    if (!hasPending) return;
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [hasPending, refresh]);

  const tags = useMemo(
    () =>
      [...new Set(tagText.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean))].slice(
        0,
        8,
      ),
    [tagText],
  );

  async function chooseVideo() {
    setMessage(null);
    try {
      const picked = await pickUserVideo();
      if (!picked) return;
      setFile(picked);
      if (!title.trim()) setTitle(picked.name.replace(/\.[^.]+$/, "").slice(0, 120));
    } catch (pickError) {
      setMessage(pickError instanceof Error ? pickError.message : "無法選擇影片。");
    }
  }

  async function upload() {
    if (!file || !title.trim()) return;
    setUploading(true);
    setMessage(null);
    try {
      await uploadUserVideo(
        accessToken,
        file,
        {
          title: title.trim(),
          description: description.trim(),
          playerIds,
          tags,
        },
        (value, label) => {
          setProgress(value);
          setProgressLabel(label);
        },
      );
      setFile(null);
      setTitle("");
      setDescription("");
      setTagText("");
      setPlayerIds([]);
      setMessage("上傳完成。Mux 轉碼完成後，影片會自動出現在下方。");
      refresh();
    } catch (uploadError) {
      setMessage(uploadError instanceof Error ? uploadError.message : "上傳失敗。");
    } finally {
      setUploading(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteUserClip(accessToken, deleting.id);
      setDeleting(null);
      refresh();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "刪除失敗。");
    } finally {
      setDeleteBusy(false);
    }
  }

  if (loading) return <LoadingState label="載入個人片段庫…" />;
  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (!data) return null;

  return (
    <SafeAreaView edges={["bottom"]} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <CourtIndex
          eyebrow="PERSONAL FILM / MEMBER LIBRARY"
          title="我的片段"
          description="上傳自己的訓練或比賽片段，標記官方球員與技術關鍵字。球員名單由 HoopKit Admin 維護。"
        />

        <View style={styles.uploadDesk}>
          <View style={styles.deskHeading}>
            <Text style={styles.deskIndex}>NEW TAPE</Text>
            <Text style={styles.deskTitle}>建立影片入庫單</Text>
          </View>
          <Pressable
            disabled={uploading}
            onPress={() => void chooseVideo()}
            style={styles.filePicker}
          >
            <Text style={styles.fileKicker}>{file ? "SELECTED" : "VIDEO FILE"}</Text>
            <Text style={styles.fileName}>{file?.name ?? "點擊選擇本機影片"}</Text>
            <Text style={styles.fileMeta}>
              {file ? `${formatBytes(file.size)} · ${file.mimeType}` : "MP4、MOV 等影片格式，上限 500 MB"}
            </Text>
          </Pressable>

          <Field label="片段名稱" value={title} onChangeText={setTitle} />
          <Field
            label="備註"
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="記下動作、使用時機或你想觀察的細節"
          />

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>球員標籤（最多 5 位）</Text>
            <View style={styles.chipRow}>
              {data.players.map((player) => {
                const selected = playerIds.includes(player.id);
                return (
                  <Pressable
                    key={player.id}
                    onPress={() =>
                      setPlayerIds((current) =>
                        selected
                          ? current.filter((id) => id !== player.id)
                          : current.length < 5
                            ? [...current, player.id]
                            : current,
                      )
                    }
                    style={[styles.playerChip, selected && styles.playerChipSelected]}
                  >
                    <Text
                      style={[
                        styles.playerChipText,
                        selected && styles.playerChipTextSelected,
                      ]}
                    >
                      {selected ? "✓ " : "+ "}{player.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Field
            label="技術標籤（以逗號分隔，最多 8 個）"
            value={tagText}
            onChangeText={setTagText}
            placeholder="例如：變向，低重心，第一步"
          />
          {tags.length ? (
            <View style={styles.tagPreview}>
              {tags.map((tag) => <Text key={tag} style={styles.tag}>#{tag}</Text>)}
            </View>
          ) : null}

          {uploading ? (
            <View style={styles.progressBlock}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.progressText}>{progressLabel}</Text>
            </View>
          ) : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <Pressable
            disabled={uploading || !file || !title.trim()}
            onPress={() => void upload()}
            style={[
              styles.uploadButton,
              (uploading || !file || !title.trim()) && styles.disabled,
            ]}
          >
            {uploading ? (
              <ActivityIndicator color={Playbook.ink} />
            ) : (
              <Text style={styles.uploadButtonText}>開始上傳 → Mux</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.libraryHeading}>
          <View>
            <Text style={styles.sectionEyebrow}>YOUR FILM</Text>
            <Text style={styles.sectionTitle}>片段庫 · {data.clips.length}</Text>
          </View>
          <Pressable onPress={refresh} style={styles.refreshButton}>
            <Text style={styles.refreshText}>更新狀態</Text>
          </Pressable>
        </View>

        <View style={styles.clipStack}>
          {data.clips.length ? (
            data.clips.map((clip) => (
              <ClipCard key={clip.id} clip={clip} onDelete={() => setDeleting(clip)} />
            ))
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>第一段影片會從這裡開始</Text>
              <Text style={styles.muted}>選擇影片並完成上傳後，處理狀態會顯示在這裡。</Text>
            </View>
          )}
        </View>
      </ScrollView>
      <ConfirmDialog
        visible={Boolean(deleting)}
        title="刪除個人片段？"
        description={`「${deleting?.title ?? "這段影片"}」會從 Mux 與你的片段庫永久刪除。`}
        confirmLabel="刪除片段"
        busy={deleteBusy}
        error={deleteError}
        onCancel={() => {
          if (!deleteBusy) setDeleting(null);
          setDeleteError(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </SafeAreaView>
  );
}

function ClipCard({ clip, onDelete }: { clip: UserClip; onDelete: () => void }) {
  const durationSeconds = (clip.durationMs ?? 0) / 1000;
  return (
    <View style={styles.clipCard}>
      {clip.status === "ready" && clip.playbackId && clip.streamUrl ? (
        <MuxHighlightPlayer
          clip={{
            id: clip.id,
            title: clip.title,
            startSeconds: 0,
            endSeconds: durationSeconds,
            coverTimeSeconds: 0,
            player: null,
            playbackId: clip.playbackId,
            streamUrl: clip.streamUrl,
            thumbnailUrl: clip.thumbnailUrl ?? "",
          }}
        />
      ) : clip.thumbnailUrl ? (
        <Image source={clip.thumbnailUrl} contentFit="cover" style={styles.thumbnail} />
      ) : (
        <View style={styles.processingFrame}>
          {clip.status === "pending" ? (
            <ActivityIndicator color={Playbook.orange} />
          ) : null}
          <Text style={styles.processingLabel}>{statusLabel(clip.status)}</Text>
        </View>
      )}
      <View style={styles.clipInfo}>
        <View style={styles.clipTitleRow}>
          <View style={styles.flex}>
            <Text style={styles.clipTitle}>{clip.title}</Text>
            <Text style={styles.clipMeta}>
              {clip.createdAt.slice(0, 10)} · {formatBytes(clip.fileSizeBytes)}
            </Text>
          </View>
          <Text style={[styles.status, styles[`status_${clip.status}`]]}>
            {statusLabel(clip.status)}
          </Text>
        </View>
        {clip.description ? <Text style={styles.description}>{clip.description}</Text> : null}
        {clip.players.length ? (
          <Text style={styles.playerLine}>球員 · {clip.players.map((player) => player.name).join(" / ")}</Text>
        ) : null}
        {clip.tags.length ? (
          <View style={styles.tagPreview}>
            {clip.tags.map((tag) => <Text key={tag} style={styles.lightTag}>#{tag}</Text>)}
          </View>
        ) : null}
        {clip.errorMessage ? <Text style={styles.errorText}>{clip.errorMessage}</Text> : null}
        <Pressable onPress={onDelete} style={styles.deleteButton}>
          <Text style={styles.deleteText}>刪除片段</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        placeholderTextColor="#FFFFFF55"
        style={[styles.input, inputProps.multiline && styles.textarea]}
      />
    </View>
  );
}

function statusLabel(status: UserClip["status"]) {
  return { pending: "轉碼中", ready: "可播放", errored: "處理失敗" }[status];
}

function formatBytes(value: number) {
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(value / 1024))} KB`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Playbook.canvas },
  content: { width: "100%", maxWidth: 800, alignSelf: "center", padding: 20, paddingBottom: 60, gap: 28 },
  signInGate: { flex: 1, maxWidth: 480, alignSelf: "center", justifyContent: "center", alignItems: "center", padding: 28, gap: 14 },
  gateTitle: { color: Playbook.ink, fontFamily: Fonts.display, fontSize: 28, fontWeight: "900", textAlign: "center" },
  muted: { color: Playbook.muted, fontSize: 14, lineHeight: 22, textAlign: "center" },
  primaryButton: { backgroundColor: Playbook.ink, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 8 },
  primaryButtonText: { color: Playbook.paper, fontWeight: "900" },
  uploadDesk: { backgroundColor: Playbook.film, borderWidth: 1, borderColor: "#27282D", padding: 18, gap: 18 },
  deskHeading: { borderBottomWidth: 1, borderBottomColor: "#FFFFFF20", paddingBottom: 14 },
  deskIndex: { color: Playbook.orange, fontFamily: Fonts.mono, fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  deskTitle: { color: Playbook.paper, fontFamily: Fonts.display, fontSize: 27, fontWeight: "900", marginTop: 4 },
  filePicker: { minHeight: 132, justifyContent: "center", borderWidth: 1, borderStyle: "dashed", borderColor: "#FFFFFF45", padding: 18, gap: 7 },
  fileKicker: { color: Playbook.orange, fontFamily: Fonts.mono, fontSize: 10, fontWeight: "900" },
  fileName: { color: Playbook.paper, fontFamily: Fonts.display, fontSize: 21, fontWeight: "900" },
  fileMeta: { color: "#FFFFFF77", fontSize: 12 },
  fieldGroup: { gap: 7 },
  label: { color: "#FFFFFFA5", fontFamily: Fonts.mono, fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  input: { minHeight: 48, borderWidth: 1, borderColor: "#FFFFFF32", borderRadius: 6, color: Playbook.paper, backgroundColor: "#FFFFFF09", paddingHorizontal: 13, paddingVertical: 11 },
  textarea: { minHeight: 92, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  playerChip: { borderWidth: 1, borderColor: "#FFFFFF35", borderRadius: 6, paddingHorizontal: 11, paddingVertical: 8 },
  playerChipSelected: { backgroundColor: Playbook.orange, borderColor: Playbook.orange },
  playerChipText: { color: "#FFFFFFA5", fontSize: 12, fontWeight: "800" },
  playerChipTextSelected: { color: Playbook.paper },
  tagPreview: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  tag: { color: Playbook.orange, fontFamily: Fonts.mono, fontSize: 11, fontWeight: "800" },
  lightTag: { color: Playbook.inkSoft, backgroundColor: Playbook.surface, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 5, fontSize: 11, fontWeight: "800" },
  progressBlock: { gap: 7 },
  progressTrack: { height: 5, backgroundColor: "#FFFFFF20", overflow: "hidden" },
  progressBar: { height: "100%", backgroundColor: Playbook.orange },
  progressText: { color: "#FFFFFF85", fontFamily: Fonts.mono, fontSize: 10 },
  message: { color: Playbook.orange, fontSize: 12, lineHeight: 18 },
  uploadButton: { minHeight: 50, alignItems: "center", justifyContent: "center", backgroundColor: Playbook.orange, borderRadius: 7 },
  uploadButtonText: { color: Playbook.ink, fontWeight: "900" },
  disabled: { opacity: 0.45 },
  libraryHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 1, borderBottomColor: Playbook.ink, paddingBottom: 11 },
  sectionEyebrow: { color: Playbook.orange, fontFamily: Fonts.mono, fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  sectionTitle: { color: Playbook.ink, fontFamily: Fonts.display, fontSize: 28, fontWeight: "900" },
  refreshButton: { borderWidth: 1, borderColor: Playbook.lineStrong, borderRadius: 6, paddingHorizontal: 11, paddingVertical: 8 },
  refreshText: { color: Playbook.inkSoft, fontSize: 11, fontWeight: "800" },
  clipStack: { gap: 16 },
  clipCard: { backgroundColor: Playbook.paper, borderWidth: 1, borderColor: Playbook.line },
  thumbnail: { width: "100%", aspectRatio: 16 / 9, backgroundColor: Playbook.film },
  processingFrame: { width: "100%", aspectRatio: 16 / 9, backgroundColor: Playbook.film, alignItems: "center", justifyContent: "center", gap: 12 },
  processingLabel: { color: "#FFFFFF85", fontFamily: Fonts.mono, fontSize: 11, fontWeight: "800" },
  clipInfo: { padding: 16, gap: 10 },
  clipTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  flex: { flex: 1 },
  clipTitle: { color: Playbook.ink, fontFamily: Fonts.display, fontSize: 22, fontWeight: "900" },
  clipMeta: { color: Playbook.mutedLight, fontFamily: Fonts.mono, fontSize: 9, marginTop: 3 },
  status: { overflow: "hidden", borderRadius: 5, paddingHorizontal: 8, paddingVertical: 5, fontSize: 10, fontWeight: "900" },
  status_pending: { backgroundColor: Playbook.orangeSoft, color: Playbook.orange },
  status_ready: { backgroundColor: Playbook.greenSoft, color: Playbook.green },
  status_errored: { backgroundColor: "#F7E9E5", color: Playbook.danger },
  description: { color: Playbook.muted, fontSize: 13, lineHeight: 20 },
  playerLine: { color: Playbook.inkSoft, fontSize: 12, fontWeight: "800" },
  errorText: { color: Playbook.danger, fontSize: 12 },
  deleteButton: { alignSelf: "flex-start", borderBottomWidth: 1, borderBottomColor: Playbook.danger, paddingVertical: 4 },
  deleteText: { color: Playbook.danger, fontSize: 11, fontWeight: "800" },
  empty: { minHeight: 180, alignItems: "center", justifyContent: "center", borderWidth: 1, borderStyle: "dashed", borderColor: Playbook.lineStrong, padding: 24, gap: 8 },
  emptyTitle: { color: Playbook.ink, fontFamily: Fonts.display, fontSize: 21, fontWeight: "900" },
});
