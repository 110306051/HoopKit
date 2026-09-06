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
      <main className="studio-page">
        <div className="court-index flex flex-col justify-between gap-5 pt-7 sm:flex-row sm:items-end">
          <div>
            <p className="page-kicker">PLAYERS / ROSTER</p>
            <h1 className="page-title">球員管理</h1>
            <p className="mt-4 text-sm leading-7 text-[#696964]">
              建立、校對、發布或封存球員資料。封存不會刪除既有招式關聯。
            </p>
          </div>
          <Link
            href="/players/new"
            className="primary-action"
          >
            ＋ 新增球員
          </Link>
        </div>

        {result.ok ? (
          result.data.length ? (
            <div className="mt-9 overflow-hidden border border-[#d7d7d0] bg-white">
              <div className="utility-type hidden grid-cols-[minmax(240px,1.5fr)_1fr_120px_150px_80px] gap-4 border-b border-[#d7d7d0] bg-[#eeeeea] px-5 py-3 text-[10px] font-bold tracking-[0.08em] text-[#696964] md:grid">
                <span>球員</span>
                <span>隊伍／位置</span>
                <span>狀態</span>
                <span>最後更新</span>
                <span />
              </div>
              <div className="divide-y divide-[#d7d7d0]">
                {result.data.map((player) => (
                  <article
                    key={player.id}
                    className="grid gap-4 px-5 py-5 transition hover:bg-[#f5f5f2] md:grid-cols-[minmax(240px,1.5fr)_1fr_120px_150px_80px] md:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {player.avatarPath ? (
                        <img
                          src={player.avatarPath}
                          alt={player.fullName}
                          className="size-12 rounded-xl object-cover"
                        />
                      ) : (
                        <span className="grid size-12 shrink-0 place-items-center rounded-md bg-[#121212] text-sm font-black text-[#f05a28]">
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
                      className="text-sm font-bold text-[#c94b22] hover:underline"
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
