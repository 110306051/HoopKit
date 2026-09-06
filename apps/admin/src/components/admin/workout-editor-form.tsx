"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { adminClientApiRequest } from "@/lib/admin-client-api";
import type {
  ContentStatus,
  EditorialOptions,
  WorkoutEditor,
  WorkoutEditorItem,
  WorkoutEditorSection,
} from "@/types/admin";
import {
  AddButton,
  EditorSection,
  Field,
  moveItem,
  NestedCard,
  updateItem,
} from "./move-editor-form";

export function WorkoutEditorForm({
  workout,
  options,
}: {
  workout?: WorkoutEditor;
  options: EditorialOptions;
}) {
  const router = useRouter();
  const [name, setName] = useState(workout?.name ?? "");
  const [slug, setSlug] = useState(workout?.slug ?? "");
  const [sourcePlayerId, setSourcePlayerId] = useState(
    workout?.sourcePlayerId ?? "",
  );
  const [description, setDescription] = useState(workout?.description ?? "");
  const [warmupNotes, setWarmupNotes] = useState(workout?.warmupNotes ?? "");
  const [difficulty, setDifficulty] = useState(
    workout?.difficulty ?? "beginner",
  );
  const [duration, setDuration] = useState<number | null>(
    workout?.estimatedDurationMinutes ?? 30,
  );
  const [coverAssetId, setCoverAssetId] = useState(workout?.coverAssetId ?? "");
  const [status, setStatus] = useState<ContentStatus>(
    workout?.status ?? "draft",
  );
  const [sections, setSections] = useState<WorkoutEditorSection[]>(
    workout?.sections ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imageAssets = options.mediaAssets.filter(
    (asset) => asset.kind === "image",
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminClientApiRequest<WorkoutEditor>(
        workout
          ? `/admin/editorial/workouts/${workout.id}`
          : "/admin/editorial/workouts",
        {
          method: workout ? "PUT" : "POST",
          body: JSON.stringify({
            name,
            slug,
            sourcePlayerId: sourcePlayerId || undefined,
            description,
            warmupNotes,
            difficulty,
            estimatedDurationMinutes: duration ?? undefined,
            coverAssetId: coverAssetId || undefined,
            status,
            sections,
          }),
        },
      );
      router.push("/workouts");
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "儲存訓練菜單失敗。",
      );
      setSaving(false);
    }
  }

  function patchSection(index: number, patch: Partial<WorkoutEditorSection>) {
    setSections(updateItem(sections, index, patch));
  }

  function patchItem(
    sectionIndex: number,
    itemIndex: number,
    patch: Partial<WorkoutEditorItem>,
  ) {
    const section = sections[sectionIndex];
    patchSection(sectionIndex, {
      items: updateItem(section.items, itemIndex, patch),
    });
  }

  return (
    <form onSubmit={submit} className="editor-form space-y-5">
      <EditorSection
        title="菜單基本資料"
        description="公開模板由內容團隊維護；Mobile 使用者之後可複製成自己的訓練菜單。"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="菜單名稱" required>
            <input
              className="field-input"
              required
              maxLength={120}
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
          <Field label="來源球員">
            <select
              className="field-input"
              value={sourcePlayerId}
              onChange={(event) => setSourcePlayerId(event.target.value)}
            >
              <option value="">不指定</option>
              {options.players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="難度">
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
          <Field label="預估分鐘">
            <input
              className="field-input"
              type="number"
              min={1}
              value={duration ?? ""}
              onChange={(event) =>
                setDuration(
                  event.target.value ? Number(event.target.value) : null,
                )
              }
            />
          </Field>
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
        </div>
        <Field label="菜單介紹">
          <textarea
            className="field-input min-h-32 py-3"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        <Field label="熱身提醒">
          <textarea
            className="field-input min-h-28 py-3"
            value={warmupNotes}
            onChange={(event) => setWarmupNotes(event.target.value)}
          />
        </Field>
      </EditorSection>

      <EditorSection
        title="訓練區段與項目"
        description="可建立熱身、主訓練、收操等區段；上移與下移會直接決定顯示順序。"
      >
        <div className="space-y-5">
          {sections.map((section, sectionIndex) => (
            <NestedCard
              key={section.id ?? sectionIndex}
              label={`區段 ${sectionIndex + 1}`}
              onUp={() => setSections(moveItem(sections, sectionIndex, -1))}
              onDown={() => setSections(moveItem(sections, sectionIndex, 1))}
              onRemove={() =>
                setSections(
                  sections.filter((_, index) => index !== sectionIndex),
                )
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="區段名稱" required>
                  <input
                    className="field-input"
                    required
                    value={section.name}
                    onChange={(event) =>
                      patchSection(sectionIndex, { name: event.target.value })
                    }
                  />
                </Field>
                <Field label="區段說明">
                  <input
                    className="field-input"
                    value={section.description}
                    onChange={(event) =>
                      patchSection(sectionIndex, {
                        description: event.target.value,
                      })
                    }
                  />
                </Field>
              </div>

              <div className="space-y-3 border-l border-[#a8a8a0] pl-4">
                {section.items.map((item, itemIndex) => (
                  <NestedCard
                    key={item.id ?? itemIndex}
                    label={`項目 ${itemIndex + 1}`}
                    onUp={() =>
                      patchSection(sectionIndex, {
                        items: moveItem(section.items, itemIndex, -1),
                      })
                    }
                    onDown={() =>
                      patchSection(sectionIndex, {
                        items: moveItem(section.items, itemIndex, 1),
                      })
                    }
                    onRemove={() =>
                      patchSection(sectionIndex, {
                        items: section.items.filter(
                          (_, index) => index !== itemIndex,
                        ),
                      })
                    }
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="項目名稱" required>
                        <input
                          className="field-input"
                          required
                          value={item.title}
                          onChange={(event) =>
                            patchItem(sectionIndex, itemIndex, {
                              title: event.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="綁定招式">
                        <select
                          className="field-input"
                          value={item.moveId ?? ""}
                          onChange={(event) =>
                            patchItem(sectionIndex, itemIndex, {
                              moveId: event.target.value || null,
                            })
                          }
                        >
                          <option value="">一般訓練，不綁定招式</option>
                          {options.moves.map((moveOption) => (
                            <option key={moveOption.id} value={moveOption.id}>
                              {moveOption.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <Field label="執行說明">
                      <textarea
                        className="field-input min-h-20 py-3"
                        value={item.instructions}
                        onChange={(event) =>
                          patchItem(sectionIndex, itemIndex, {
                            instructions: event.target.value,
                          })
                        }
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      <OptionalNumber
                        label="組數"
                        value={item.sets}
                        min={1}
                        onChange={(value) =>
                          patchItem(sectionIndex, itemIndex, { sets: value })
                        }
                      />
                      <OptionalNumber
                        label="次數"
                        value={item.reps}
                        min={1}
                        onChange={(value) =>
                          patchItem(sectionIndex, itemIndex, { reps: value })
                        }
                      />
                      <OptionalNumber
                        label="執行秒數"
                        value={item.durationSeconds}
                        min={1}
                        onChange={(value) =>
                          patchItem(sectionIndex, itemIndex, {
                            durationSeconds: value,
                          })
                        }
                      />
                      <OptionalNumber
                        label="休息秒數"
                        value={item.restSeconds}
                        min={0}
                        required
                        onChange={(value) =>
                          patchItem(sectionIndex, itemIndex, {
                            restSeconds: value ?? 0,
                          })
                        }
                      />
                    </div>
                    {!item.reps && !item.durationSeconds ? (
                      <p className="text-xs font-bold text-[#a33d1d]">
                        次數或執行秒數至少填一項。
                      </p>
                    ) : null}
                  </NestedCard>
                ))}
                <AddButton
                  label="新增訓練項目"
                  onClick={() =>
                    patchSection(sectionIndex, {
                      items: [...section.items, emptyItem()],
                    })
                  }
                />
              </div>
            </NestedCard>
          ))}
          <AddButton
            label="新增訓練區段"
            onClick={() =>
              setSections([
                ...sections,
                { name: "", description: "", items: [] },
              ])
            }
          />
        </div>
      </EditorSection>

      <EditorSection
        title="發布狀態"
        description="只有 published 模板會出現在 Mobile 公開內容。"
      >
        <Field label="狀態">
          <select
            className="field-input max-w-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value as ContentStatus)}
          >
            <option value="draft">草稿</option>
            <option value="published">發布</option>
            <option value="archived">封存</option>
          </select>
        </Field>
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
          disabled={saving}
          className="primary-action disabled:opacity-50"
        >
          {saving ? "儲存中…" : workout ? "儲存菜單" : "建立菜單"}
        </button>
      </div>
    </form>
  );
}

function OptionalNumber({
  label,
  value,
  min,
  required = false,
  onChange,
}: {
  label: string;
  value: number | null;
  min: number;
  required?: boolean;
  onChange: (value: number | null) => void;
}) {
  return (
    <Field label={label} required={required}>
      <input
        className="field-input px-3"
        type="number"
        min={min}
        required={required}
        value={value ?? ""}
        onChange={(event) =>
          onChange(
            event.target.value === "" ? null : Number(event.target.value),
          )
        }
      />
    </Field>
  );
}

function emptyItem(): WorkoutEditorItem {
  return {
    moveId: null,
    title: "",
    instructions: "",
    sets: 3,
    reps: 10,
    durationSeconds: null,
    restSeconds: 30,
  };
}
