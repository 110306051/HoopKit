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
import type { WorkoutEditor } from "@/types/admin";

export const metadata: Metadata = { title: "訓練菜單管理" };
export const dynamic = "force-dynamic";

export default async function WorkoutsPage() {
  const session = await requireAdminSession();
  const result = await adminApiRequest<WorkoutEditor[]>(
    "/admin/editorial/workouts",
    session.accessToken,
  );
  return (
    <StudioShell email={session.email}>
      <main className="studio-page">
        <EditorialListHeader
          eyebrow="WORKOUT TEMPLATES"
          title="公開訓練菜單"
          description="編排球星／球員公開訓練模板、區段、組數、次數與休息時間。"
          href="/workouts/new"
          action="新增菜單"
        />
        {result.ok ? (
          result.data.length ? (
            <div className="mt-9 overflow-hidden border border-[#d7d7d0] bg-white">
              <div className="divide-y divide-[#d7d7d0]">
                {result.data.map((workout) => (
                  <article
                    key={workout.id}
                    className="grid gap-4 px-5 py-5 transition hover:bg-[#f5f5f2] md:grid-cols-[minmax(220px,1.5fr)_120px_120px_150px_80px] md:items-center"
                  >
                    <div>
                      <p className="font-bold">{workout.name}</p>
                      <p className="mt-1 font-mono text-[11px] text-[#858c83]">
                        /{workout.slug}
                      </p>
                    </div>
                    <p className="text-sm text-[#626a61]">
                      {workout.estimatedDurationMinutes
                        ? `${workout.estimatedDurationMinutes} 分鐘`
                        : "未設定"}
                    </p>
                    <StatusBadge status={workout.status} />
                    <p className="text-xs text-[#7b8379]">
                      {formatDate(workout.updatedAt)}
                    </p>
                    <Link
                      href={`/workouts/${workout.id}/edit`}
                      className="text-sm font-bold text-[#c94b22] hover:underline"
                    >
                      編輯
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <EditorialEmpty href="/workouts/new" text="尚未建立公開訓練菜單" />
          )
        ) : (
          <EditorialError message={result.message} />
        )}
      </main>
    </StudioShell>
  );
}
