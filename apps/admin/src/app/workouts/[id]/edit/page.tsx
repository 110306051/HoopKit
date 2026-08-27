import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkoutEditorForm } from "@/components/admin/workout-editor-form";
import { StudioShell } from "@/components/admin/studio-shell";
import { adminApiRequest } from "@/lib/admin-api";
import { requireAdminSession } from "@/lib/admin-session";
import type { EditorialOptions, WorkoutEditor } from "@/types/admin";

export const metadata: Metadata = { title: "編輯訓練菜單" };
export const dynamic = "force-dynamic";

export default async function EditWorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAdminSession();
  const [workout, options] = await Promise.all([
    adminApiRequest<WorkoutEditor>(
      `/admin/editorial/workouts/${id}`,
      session.accessToken,
    ),
    adminApiRequest<EditorialOptions>(
      "/admin/editorial/options",
      session.accessToken,
    ),
  ]);
  if (!workout.ok && workout.status === 404) notFound();
  return (
    <StudioShell email={session.email}>
      <main className="mx-auto max-w-6xl px-5 py-8 lg:px-10 lg:py-12">
        <p className="text-xs font-bold tracking-[0.2em] text-[#758650]">
          EDIT WORKOUT
        </p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.04em]">
          編輯公開訓練菜單
        </h1>
        <p className="mb-9 mt-3 text-sm leading-7 text-[#697067]">
          維護來源球員、菜單區段、訓練項目與發布狀態。
        </p>
        {workout.ok && options.ok ? (
          <WorkoutEditorForm workout={workout.data} options={options.data} />
        ) : (
          <div className="rounded-xl bg-[#fff1eb] p-5 text-[#9f3c1a]">
            {!workout.ok
              ? workout.message
              : !options.ok
                ? options.message
                : "載入失敗"}
          </div>
        )}
      </main>
    </StudioShell>
  );
}
