"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { adminClientApiRequest } from "@/lib/admin-client-api";
import type {
  ContentStatus,
  EditorialOptions,
  MoveEditor,
} from "@/types/admin";

type StepDraft = MoveEditor["steps"][number];
type ClipDraft = MoveEditor["clips"][number];

export function MoveEditorForm({
  move,
  options,
}: {
  move?: MoveEditor;
  options: EditorialOptions;
}) {
  const router = useRouter();
  const [name, setName] = useState(move?.name ?? "");
  const [slug, setSlug] = useState(move?.slug ?? "");
  const [categoryId, setCategoryId] = useState(
    move?.categoryId ?? options.categories[0]?.id ?? "",
  );
  const [summary, setSummary] = useState(move?.summary ?? "");
  const [difficulty, setDifficulty] = useState(move?.difficulty ?? "beginner");
  const [howToUse, setHowToUse] = useState(move?.howToUse ?? "");
  const [whenToUse, setWhenToUse] = useState(move?.whenToUse ?? "");
  const [coachingCues, setCoachingCues] = useState(
    move?.coachingCues.join("\n") ?? "",
  );
  const [commonMistakes, setCommonMistakes] = useState(
    move?.commonMistakes.join("\n") ?? "",
  );
  const [coverAssetId, setCoverAssetId] = useState(move?.coverAssetId ?? "");
  const [status, setStatus] = useState<ContentStatus>(move?.status ?? "draft");
  const [playerIds, setPlayerIds] = useState(move?.playerIds ?? []);
  const [tagIds, setTagIds] = useState(move?.tagIds ?? []);
  const [steps, setSteps] = useState<StepDraft[]>(move?.steps ?? []);
  const [clips, setClips] = useState<ClipDraft[]>(move?.clips ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imageAssets = options.mediaAssets.filter(
    (asset) => asset.kind === "image",
  );
  const videoAssets = options.mediaAssets.filter(
    (asset) => asset.kind === "video",
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminClientApiRequest<MoveEditor>(
        move ? `/admin/editorial/moves/${move.id}` : "/admin/editorial/moves",
        {
          method: move ? "PUT" : "POST",
          body: JSON.stringify({
            name,
            slug,
            categoryId,
            summary,
            difficulty,
            howToUse,
            whenToUse,
            coachingCues: lines(coachingCues),
            commonMistakes: lines(commonMistakes),
            coverAssetId: coverAssetId || undefined,
            status,
            playerIds,
            tagIds,
            steps,
            clips: clips.map((clip) => ({
              ...clip,
              playerId: clip.playerId || undefined,
              coverTimeMs: clip.coverTimeMs ?? undefined,
            })),
          }),
        },
      );
      router.push("/moves");
      router.refresh();
    } catch (saveError) {
      setError(errorMessage(saveError));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="editor-form space-y-5">
      <EditorSection
        title="招式基本資料"
        description="這些欄位會成為 Mobile 招式列表與詳細頁的主要內容。"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="招式名稱" required>
            <input
              className="field-input"
              required
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="Slug" required>
            <input
              className="field-input font-mono"
              required
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              value={slug}
              onChange={(event) => setSlug(event.target.value.toLowerCase())}
            />
          </Field>
          <Field label="分類" required>
            <select
              className="field-input"
              required
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="">請選擇分類</option>
              {options.categories.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="難度" required>
            <select
              className="field-input"
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
            >
              <option value="beginner">初階</option>
              <option value="intermediate">中階</option>
              <option value="advanced">進階</option>
            </select>
          </Field>
        </div>
        <Field label="簡短摘要">
          <textarea
            className="field-input min-h-24 py-3"
            maxLength={1000}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
          />
        </Field>
        <div className="grid gap-5 lg:grid-cols-2">
          <Field label="怎麼使用">
            <textarea
              className="field-input min-h-36 py-3"
              value={howToUse}
              onChange={(event) => setHowToUse(event.target.value)}
            />
          </Field>
          <Field label="使用時機">
            <textarea
              className="field-input min-h-36 py-3"
              value={whenToUse}
              onChange={(event) => setWhenToUse(event.target.value)}
            />
          </Field>
          <Field label="動作要點" hint="每行一個要點">
            <textarea
              className="field-input min-h-36 py-3"
              value={coachingCues}
              onChange={(event) => setCoachingCues(event.target.value)}
            />
          </Field>
          <Field label="常見錯誤" hint="每行一個錯誤">
            <textarea
              className="field-input min-h-36 py-3"
              value={commonMistakes}
              onChange={(event) => setCommonMistakes(event.target.value)}
            />
          </Field>
        </div>
      </EditorSection>

      <EditorSection
        title="球員與標籤"
        description="同一招式可綁定多位示範球員與多個搜尋標籤。"
      >
        <ChoiceGrid
          title="示範球員"
          options={options.players}
          selected={playerIds}
          onChange={setPlayerIds}
        />
        <ChoiceGrid
          title="標籤"
          options={options.tags}
          selected={tagIds}
          onChange={setTagIds}
        />
      </EditorSection>

      <EditorSection
        title="動作步驟"
        description="列表順序就是 Mobile 詳細頁的顯示順序。"
      >
        <div className="space-y-4">
          {steps.map((step, index) => (
            <NestedCard
              key={step.id ?? index}
              label={`步驟 ${index + 1}`}
              onUp={() => setSteps(moveItem(steps, index, -1))}
              onDown={() => setSteps(moveItem(steps, index, 1))}
              onRemove={() =>
                setSteps(steps.filter((_, itemIndex) => itemIndex !== index))
              }
            >
              <input
                className="field-input"
                required
                placeholder="步驟標題"
                value={step.title}
                onChange={(event) =>
                  setSteps(
                    updateItem(steps, index, { title: event.target.value }),
                  )
                }
              />
              <textarea
                className="field-input min-h-24 py-3"
                required
                placeholder="動作說明"
                value={step.description}
                onChange={(event) =>
                  setSteps(
                    updateItem(steps, index, {
                      description: event.target.value,
                    }),
                  )
                }
              />
            </NestedCard>
          ))}
          <AddButton
            label="新增動作步驟"
            onClick={() => setSteps([...steps, { title: "", description: "" }])}
          />
        </div>
      </EditorSection>

      <EditorSection
        title="Highlight 影片片段"
        description="從媒體中心選擇已完成轉碼的 Mux 影片，時間使用毫秒。"
      >
        <div className="space-y-4">
          {clips.map((clip, index) => (
            <NestedCard
              key={clip.id ?? index}
              label={`片段 ${index + 1}`}
              onUp={() => setClips(moveItem(clips, index, -1))}
              onDown={() => setClips(moveItem(clips, index, 1))}
              onRemove={() =>
                setClips(clips.filter((_, itemIndex) => itemIndex !== index))
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="片段名稱" required>
                  <input
                    className="field-input"
                    required
                    value={clip.title}
                    onChange={(event) =>
                      setClips(
                        updateItem(clips, index, { title: event.target.value }),
                      )
                    }
                  />
                </Field>
                <Field label="Mux 影片" required>
                  <select
                    className="field-input"
                    required
                    value={clip.mediaAssetId}
                    onChange={(event) =>
                      setClips(
                        updateItem(clips, index, {
                          mediaAssetId: event.target.value,
                        }),
                      )
                    }
                  >
                    <option value="">選擇影片</option>
                    {videoAssets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.title}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="片段球員">
                  <select
                    className="field-input"
                    value={clip.playerId ?? ""}
                    onChange={(event) =>
                      setClips(
                        updateItem(clips, index, {
                          playerId: event.target.value || null,
                        }),
                      )
                    }
                  >
                    <option value="">不指定</option>
                    {options.players.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="grid grid-cols-3 gap-3">
                  <NumberField
                    label="開始 ms"
                    value={clip.startMs}
                    onChange={(value) =>
                      setClips(updateItem(clips, index, { startMs: value }))
                    }
                  />
                  <NumberField
                    label="結束 ms"
                    value={clip.endMs}
                    min={1}
                    onChange={(value) =>
                      setClips(updateItem(clips, index, { endMs: value }))
                    }
                  />
                  <NumberField
                    label="封面 ms"
                    value={clip.coverTimeMs ?? clip.startMs}
                    onChange={(value) =>
                      setClips(updateItem(clips, index, { coverTimeMs: value }))
                    }
                  />
                </div>
              </div>
            </NestedCard>
          ))}
          <AddButton
            label="新增 Highlight 片段"
            disabled={!videoAssets.length}
            onClick={() =>
              setClips([
                ...clips,
                {
                  title: "",
                  mediaAssetId: videoAssets[0]?.id ?? "",
                  playerId: null,
                  startMs: 0,
                  endMs: 5000,
                  coverTimeMs: 0,
                },
              ])
            }
          />
          {!videoAssets.length ? (
            <p className="text-sm text-[#9f3c1a]">
              媒體中心目前沒有 ready 的影片，請先完成影片上傳與 Mux 轉碼。
            </p>
          ) : null}
        </div>
      </EditorSection>

      <EditorSection
        title="封面與發布"
        description="草稿只供 Admin 查看；發布後才會提供給未來的 Mobile 公開 API。"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="封面圖片">
            <select
              className="field-input"
              value={coverAssetId}
              onChange={(event) => setCoverAssetId(event.target.value)}
            >
              <option value="">不指定</option>
              {imageAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="狀態">
            <select
              className="field-input"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as ContentStatus)
              }
            >
              <option value="draft">草稿</option>
              <option value="published">發布</option>
              <option value="archived">封存</option>
            </select>
          </Field>
        </div>
      </EditorSection>

      {error ? (
        <p className="border-l-4 border-[#f05a28] bg-[#fff0e9] p-4 text-sm font-bold text-[#873719]">
          {error}
        </p>
      ) : null}
      <div className="sticky bottom-4 z-10 flex flex-wrap justify-end gap-3 border border-[#d7d7d0] bg-white/95 p-3 shadow-[0_12px_35px_rgba(18,18,18,.12)] backdrop-blur">
        <button
          type="button"
          className="secondary-action"
          onClick={() => router.back()}
        >
          取消
        </button>
        <button
          type="submit"
          disabled={saving || !categoryId}
          className="primary-action disabled:opacity-50"
        >
          {saving ? "儲存中…" : move ? "儲存招式" : "建立招式"}
        </button>
      </div>
    </form>
  );
}

export function EditorSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-[#d7d7d0] bg-white p-6 lg:grid lg:grid-cols-[220px_1fr] lg:gap-10 lg:p-8">
      <header>
        <h2 className="display-type text-2xl font-black">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[#696964]">{description}</p>
      </header>
      <div className="mt-6 space-y-5 lg:mt-0">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-[#30302d]">
        {label}
        {required ? <span className="text-[#f05a28]"> *</span> : null}
      </span>
      {children}
      {hint ? (
        <span className="mt-1 block text-xs text-[#858c83]">{hint}</span>
      ) : null}
    </label>
  );
}

function ChoiceGrid({
  title,
  options,
  selected,
  onChange,
}: {
  title: string;
  options: Array<{ id: string; name: string }>;
  selected: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <div>
      <p className="mb-3 text-sm font-bold">{title}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => (
          <label
            key={option.id}
            className="flex items-center gap-3 rounded-lg border border-[#d7d7d0] bg-white px-4 py-3 text-sm transition hover:border-[#121212]"
          >
            <input
              type="checkbox"
              checked={selected.includes(option.id)}
              onChange={() =>
                onChange(
                  selected.includes(option.id)
                    ? selected.filter((id) => id !== option.id)
                    : [...selected, option.id],
                )
              }
            />
            {option.name}
          </label>
        ))}
      </div>
    </div>
  );
}

export function NestedCard({
  label,
  onUp,
  onDown,
  onRemove,
  children,
}: {
  label: string;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-l-2 border-[#121212] bg-[#f8f8f6] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-extrabold">{label}</p>
        <div className="flex gap-2">
          <SmallButton label="上移" onClick={onUp} />
          <SmallButton label="下移" onClick={onDown} />
          <SmallButton label="移除" danger onClick={onRemove} />
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export function AddButton({
  label,
  onClick,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full rounded-lg border border-dashed border-[#a8a8a0] bg-white px-5 py-3 text-sm font-bold text-[#30302d] transition hover:border-[#f05a28] hover:text-[#c94b22] disabled:opacity-45"
    >
      ＋ {label}
    </button>
  );
}

function SmallButton({
  label,
  onClick,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border bg-white px-2.5 py-1.5 text-xs font-bold ${danger ? "border-[#efc6b7] text-[#a33d1d]" : "border-[#d7d7d0] text-[#595954]"}`}
    >
      {label}
    </button>
  );
}

function NumberField({
  label,
  value,
  min = 0,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <input
        className="field-input px-2"
        type="number"
        min={min}
        required
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </Field>
  );
}

export function updateItem<T>(items: T[], index: number, patch: Partial<T>) {
  return items.map((item, itemIndex) =>
    itemIndex === index ? { ...item, ...patch } : item,
  );
}

export function moveItem<T>(items: T[], index: number, delta: number) {
  const target = index + delta;
  if (target < 0 || target >= items.length) return items;
  const result = [...items];
  [result[index], result[target]] = [result[target], result[index]];
  return result;
}

function lines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "儲存招式失敗。";
}
