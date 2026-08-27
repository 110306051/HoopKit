/* eslint-disable @next/next/no-img-element */

import type { Metadata } from "next";
import Link from "next/link";
import { StudioShell } from "@/components/admin/studio-shell";
import { StatusBadge } from "@/components/admin/status-badge";
import { adminApiRequest } from "@/lib/admin-api";
import { formatDate } from "@/lib/format";
import { requireAdminSession } from "@/lib/admin-session";
import type { Player } from "@/types/admin";

export const metadata: Metadata = { title: "球員管理" };
export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const session = await requireAdminSession();
  const result = await adminApiRequest<Player[]>("/admin/players", session.accessToken);

  return (
    <StudioShell email={session.email}>
      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-12">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-[#758650]">PLAYERS</p>
            <h1 className="mt-3 font-[var(--font-manrope)] text-4xl font-extrabold tracking-[-0.04em]">
              球員管理
            </h1>
            <p className="mt-3 text-sm leading-7 text-[#697067]">
              建立、校對、發布或封存球員資料。封存不會刪除既有招式關聯。
            </p>
          </div>
          <Link
            href="/players/new"
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#111711] px-5 text-sm font-bold text-white hover:bg-[#293128]"
          >
            ＋ 新增球員
          </Link>
        </div>

        {result.ok ? (
          result.data.length ? (
            <div className="mt-9 overflow-hidden rounded-2xl border border-[#d8d6cd] bg-[#fbfaf6]">
              <div className="hidden grid-cols-[minmax(240px,1.5fr)_1fr_120px_150px_80px] gap-4 border-b border-[#dedcd4] bg-[#eeece5] px-5 py-3 text-xs font-bold text-[#747c72] md:grid">
                <span>球員</span>
                <span>隊伍／位置</span>
                <span>狀態</span>
                <span>最後更新</span>
                <span />
              </div>
              <div className="divide-y divide-[#e2e0d8]">
                {result.data.map((player) => (
                  <article
                    key={player.id}
                    className="grid gap-4 px-5 py-5 transition hover:bg-[#f5f4ef] md:grid-cols-[minmax(240px,1.5fr)_1fr_120px_150px_80px] md:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {player.avatarPath ? (
                        <img
                          src={player.avatarPath}
                          alt={player.fullName}
                          className="size-12 rounded-xl object-cover"
                        />
                      ) : (
                        <span className="court-grid grid size-12 shrink-0 place-items-center rounded-xl bg-[#111711] text-sm font-black text-[#bff54a]">
                          {player.fullName.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-bold">{player.fullName}</p>
                        <p className="truncate font-mono text-[11px] text-[#858c83]">/{player.slug}</p>
                      </div>
                    </div>
                    <p className="text-sm text-[#626a61]">
                      {player.teamName ?? "未指定隊伍"} · {player.position}
                    </p>
                    <div>
                      <StatusBadge status={player.status} />
                    </div>
                    <p className="text-xs text-[#7b8379]">{formatDate(player.updatedAt)}</p>
                    <Link
                      href={`/players/${player.id}/edit`}
                      className="text-sm font-bold text-[#536d1c] hover:underline"
                    >
                      編輯
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-9 rounded-2xl border border-dashed border-[#c9c7be] p-12 text-center">
              <p className="font-bold">尚未建立球員</p>
              <Link href="/players/new" className="mt-3 inline-block text-sm font-bold text-[#56721b]">
                建立第一位球員 →
              </Link>
            </div>
          )
        ) : (
          <div className="mt-9 rounded-2xl border border-[#efb39e] bg-[#fff3ed] p-6 text-sm text-[#9f3c1a]">
            {result.message}
          </div>
        )}
      </main>
    </StudioShell>
  );
}
