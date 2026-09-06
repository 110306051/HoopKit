import type { Metadata } from "next";
import Link from "next/link";
import {
  EditorialEmpty,
  EditorialError,
  EditorialListHeader,
} from "@/components/admin/editorial-list-ui";
import { StudioShell } from "@/components/admin/studio-shell";
import { StatusBadge } from "@/components/admin/status-badge";
import { adminApiRequest } from "@/lib/admin-api";
import { formatDate } from "@/lib/format";
import { requireAdminSession } from "@/lib/admin-session";
import type { MoveEditor } from "@/types/admin";

export const metadata: Metadata = { title: "招式管理" };
export const dynamic = "force-dynamic";

export default async function MovesPage() {
  const session = await requireAdminSession();
  const result = await adminApiRequest<MoveEditor[]>(
    "/admin/editorial/moves",
    session.accessToken,
  );
  return (
    <StudioShell email={session.email}>
      <main className="studio-page">
        <EditorialListHeader
          eyebrow="MOVES"
          title="招式管理"
          description="建立招式內容、動作步驟、示範球員與 Highlight 片段。"
          href="/moves/new"
          action="新增招式"
        />
        {result.ok ? (
          result.data.length ? (
            <div className="mt-9 overflow-hidden border border-[#d7d7d0] bg-white">
              <div className="divide-y divide-[#d7d7d0]">
                {result.data.map((move) => (
                  <article
                    key={move.id}
                    className="grid gap-4 px-5 py-5 transition hover:bg-[#f5f5f2] md:grid-cols-[minmax(220px,1.5fr)_120px_120px_150px_80px] md:items-center"
                  >
                    <div>
                      <p className="font-bold">{move.name}</p>
                      <p className="mt-1 font-mono text-[11px] text-[#858c83]">
                        /{move.slug}
                      </p>
                    </div>
                    <p className="text-sm text-[#626a61]">
                      {difficultyLabel(move.difficulty)}
                    </p>
                    <StatusBadge status={move.status} />
                    <p className="text-xs text-[#7b8379]">
                      {formatDate(move.updatedAt)}
                    </p>
                    <Link
                      href={`/moves/${move.id}/edit`}
                      className="text-sm font-bold text-[#c94b22] hover:underline"
                    >
                      編輯
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <EditorialEmpty href="/moves/new" text="尚未建立招式" />
          )
        ) : (
          <EditorialError message={result.message} />
        )}
      </main>
    </StudioShell>
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
