/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { MediaPreview } from "./media-preview";
import { StatusBadge } from "./status-badge";
import type { ContentLibrary } from "@/types/admin";

const positionLabels: Record<string, string> = {
  point_guard: "控球後衛",
  shooting_guard: "得分後衛",
  small_forward: "小前鋒",
  power_forward: "大前鋒",
  center: "中鋒",
  guard: "後衛",
  forward: "前鋒",
  unknown: "未指定",
};

export function ContentLibraryView({ data }: { data: ContentLibrary }) {
  return (
    <div className="space-y-12">
      <section id="players" className="scroll-mt-24">
        <SectionHeader
          eyebrow="PLAYERS"
          title="球員資料"
          count={data.players.length}
          action={
            <Link
              href="/players/new"
              className="rounded-full bg-[#111711] px-4 py-2 text-sm font-bold text-white hover:bg-[#283027]"
            >
              ＋ 新增球員
            </Link>
          }
        />

        {data.players.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.players.map((player) => (
              <article
                key={player.id}
                className="overflow-hidden rounded-2xl border border-[#d8d6cd] bg-[#fbfaf6]"
              >
                <div className="flex items-center gap-4 p-5">
                  {player.avatarPath ? (
                    <img
                      src={player.avatarPath}
                      alt={player.fullName}
                      className="size-16 rounded-2xl object-cover"
                    />
                  ) : (
                    <span className="court-grid grid size-16 shrink-0 place-items-center rounded-2xl bg-[#111711] font-[var(--font-manrope)] text-xl font-black text-[#bff54a]">
                      {player.fullName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate text-lg font-bold">{player.fullName}</h3>
                      <StatusBadge status={player.status} />
                    </div>
                    <p className="mt-1 text-xs text-[#7b8379]">
                      {positionLabels[player.position] ?? player.position}
                      {player.teamName ? ` · ${player.teamName}` : ""}
                    </p>
                  </div>
                </div>
                <p className="line-clamp-3 min-h-20 border-t border-[#e5e2da] px-5 py-4 text-sm leading-6 text-[#626a61]">
                  {player.bio || "尚未填寫球員介紹。"}
                </p>
                <Link
                  href={`/players/${player.id}/edit`}
                  className="block border-t border-[#e5e2da] px-5 py-3 text-sm font-bold text-[#4f681a] hover:bg-[#f3f8e7]"
                >
                  編輯球員 →
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState text="Database 還沒有球員資料。" />
        )}
      </section>

      <section id="moves" className="scroll-mt-24">
        <SectionHeader eyebrow="MOVES" title="招式與動作拆解" count={data.moves.length} />
        {data.moves.length ? (
          <div className="space-y-5">
            {data.moves.map((move) => (
              <details
                key={move.id}
                className="group overflow-hidden rounded-2xl border border-[#d8d6cd] bg-[#fbfaf6]"
              >
                <summary className="flex cursor-pointer list-none items-center gap-5 p-5 marker:hidden">
                  <div className="hidden w-44 shrink-0 sm:block">
                    <MediaPreview asset={move.coverAsset} compact />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={move.status} />
                      <span className="rounded-full bg-[#eceae2] px-2.5 py-1 text-[11px] font-bold text-[#697067]">
                        {move.category}
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-wide text-[#8a9188]">
                        {move.difficulty}
                      </span>
                    </div>
                    <h3 className="mt-3 text-xl font-extrabold">{move.name}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#626a61]">
                      {move.summary || "尚未填寫招式摘要。"}
                    </p>
                  </div>
                  <span className="text-2xl text-[#7d857b] transition group-open:rotate-45">
                    ＋
                  </span>
                </summary>

                <div className="grid gap-6 border-t border-[#e2e0d8] p-5 lg:grid-cols-[1fr_1.35fr] lg:p-7">
                  <div className="space-y-5">
                    <div className="sm:hidden">
                      <MediaPreview asset={move.coverAsset} />
                    </div>
                    <TextBlock label="使用方式" value={move.howToUse} />
                    <TextBlock label="使用時機" value={move.whenToUse} />
                    <ListBlock label="動作要點" items={move.coachingCues} />
                    <ListBlock label="常見錯誤" items={move.commonMistakes} />
                    <div>
                      <p className="text-xs font-bold tracking-[0.14em] text-[#7e887b]">標籤</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {move.tags.length ? (
                          move.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-[#d8d6cd] bg-white px-3 py-1 text-xs font-semibold"
                            >
                              #{tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-[#8a9188]">沒有標籤</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold tracking-[0.14em] text-[#7e887b]">
                      動作步驟 · {move.steps.length}
                    </p>
                    <ol className="mt-4 space-y-3">
                      {move.steps.map((step, index) => (
                        <li
                          key={step.id}
                          className="grid grid-cols-[36px_1fr] gap-3 rounded-xl border border-[#e0ded6] bg-white p-4"
                        >
                          <span className="grid size-9 place-items-center rounded-full bg-[#bff54a] font-[var(--font-manrope)] text-sm font-black">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-bold">{step.title}</p>
                            <p className="mt-1 text-sm leading-6 text-[#626a61]">
                              {step.description}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                    {!move.steps.length ? <EmptyState text="尚未建立動作步驟。" compact /> : null}

                    <p className="mt-6 text-xs font-bold tracking-[0.14em] text-[#7e887b]">
                      HIGHLIGHT CLIPS · {move.clips.length}
                    </p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {move.clips.map((clip) => (
                        <div key={clip.id}>
                          <MediaPreview asset={clip.mediaAsset} />
                          <p className="mt-2 text-sm font-bold">{clip.title}</p>
                          <p className="mt-1 text-xs text-[#7b8379]">
                            {(clip.startMs / 1000).toFixed(1)}s – {(clip.endMs / 1000).toFixed(1)}s
                            {clip.playerName ? ` · ${clip.playerName}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                    {!move.clips.length ? <EmptyState text="尚未綁定 Highlight Clip。" compact /> : null}
                  </div>
                </div>
              </details>
            ))}
          </div>
        ) : (
          <EmptyState text="Database 還沒有招式資料。" />
        )}
      </section>

      <section id="workouts" className="scroll-mt-24">
        <SectionHeader
          eyebrow="WORKOUTS"
          title="公開訓練菜單"
          count={data.workoutTemplates.length}
        />
        <div className="grid gap-5 xl:grid-cols-2">
          {data.workoutTemplates.map((template) => (
            <article
              key={template.id}
              className="overflow-hidden rounded-2xl border border-[#d8d6cd] bg-[#fbfaf6]"
            >
              <div className="p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={template.status} />
                  <span className="text-xs font-bold uppercase text-[#7b8379]">
                    {template.difficulty}
                  </span>
                  {template.estimatedDurationMinutes ? (
                    <span className="text-xs text-[#7b8379]">
                      · {template.estimatedDurationMinutes} 分鐘
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-4 text-2xl font-extrabold">{template.name}</h3>
                <p className="mt-3 text-sm leading-7 text-[#626a61]">
                  {template.description}
                </p>
                {template.sourcePlayerName ? (
                  <p className="mt-3 text-xs font-semibold text-[#76864c]">
                    來源球員：{template.sourcePlayerName}
                  </p>
                ) : null}
                <div className="mt-5 rounded-xl bg-[#eef4df] p-4">
                  <p className="text-xs font-bold tracking-[0.12em] text-[#62723b]">熱身說明</p>
                  <p className="mt-2 text-sm leading-6 text-[#4f5e34]">
                    {template.warmupNotes || "尚未填寫熱身說明。"}
                  </p>
                </div>
              </div>

              <div className="border-t border-[#e2e0d8] p-6">
                <div className="space-y-5">
                  {template.sections.map((section, sectionIndex) => (
                    <div key={section.id}>
                      <div className="flex items-center gap-3">
                        <span className="grid size-7 place-items-center rounded-full bg-[#111711] text-xs font-black text-[#bff54a]">
                          {sectionIndex + 1}
                        </span>
                        <div>
                          <p className="font-bold">{section.name}</p>
                          <p className="text-xs text-[#7b8379]">{section.description}</p>
                        </div>
                      </div>
                      <ul className="ml-3.5 mt-3 space-y-2 border-l border-[#cbc9bf] pl-7">
                        {section.items.map((item) => (
                          <li key={item.id} className="rounded-xl bg-white p-3 text-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-bold">{item.title}</p>
                                <p className="mt-1 text-xs leading-5 text-[#737b71]">
                                  {item.instructions}
                                </p>
                              </div>
                              <span className="shrink-0 text-xs font-bold text-[#5d7040]">
                                {item.sets ? `${item.sets} 組` : ""}
                                {item.reps ? ` × ${item.reps}` : ""}
                                {item.durationSeconds ? ` ${item.durationSeconds}s` : ""}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
        {!data.workoutTemplates.length ? <EmptyState text="尚未建立公開訓練菜單。" /> : null}
      </section>

      <section id="media" className="scroll-mt-24">
        <SectionHeader eyebrow="MEDIA" title="圖片與影片資產" count={data.mediaAssets.length} />
        {data.mediaAssets.length ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {data.mediaAssets.map((asset) => (
              <article key={asset.id}>
                <MediaPreview asset={asset} />
                <p className="mt-2 truncate font-mono text-[11px] text-[#7b8379]">{asset.id}</p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState text="目前 media_assets 是空的；之後上傳或綁定影片後會在這裡預覽。" />
        )}
      </section>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  count,
  action,
}: {
  eyebrow: string;
  title: string;
  count: number;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <p className="text-[10px] font-bold tracking-[0.2em] text-[#758650]">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-extrabold">
          {title} <span className="text-base font-semibold text-[#949a92]">{count}</span>
        </h2>
      </div>
      {action}
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold tracking-[0.14em] text-[#7e887b]">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#505950]">
        {value || "尚未填寫。"}
      </p>
    </div>
  );
}

function ListBlock({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-bold tracking-[0.14em] text-[#7e887b]">{label}</p>
      {items.length ? (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-6 text-[#505950]">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#9acb30]" />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-[#8a9188]">尚未填寫。</p>
      )}
    </div>
  );
}

function EmptyState({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-[#c9c7be] bg-[#eeece5] text-center text-sm text-[#747c72] ${
        compact ? "mt-3 p-5" : "p-10"
      }`}
    >
      {text}
    </div>
  );
}
