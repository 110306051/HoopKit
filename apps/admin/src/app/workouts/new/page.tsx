import type { Metadata } from "next";
import { WorkoutEditorForm } from "@/components/admin/workout-editor-form";
import { StudioShell } from "@/components/admin/studio-shell";
import { adminApiRequest } from "@/lib/admin-api";
import { requireAdminSession } from "@/lib/admin-session";
import type { EditorialOptions } from "@/types/admin";

export const metadata: Metadata = { title: "新增訓練菜單" };
export const dynamic = "force-dynamic";

export default async function NewWorkoutPage() {
  const session = await requireAdminSession();
  const options = await adminApiRequest<EditorialOptions>(
    "/admin/editorial/options",
    session.accessToken,
  );
  return (
    <StudioShell email={session.email}>
      <main className="mx-auto max-w-6xl px-5 py-8 lg:px-10 lg:py-12">
        <p className="text-xs font-bold tracking-[0.2em] text-[#758650]">
          NEW WORKOUT
        </p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.04em]">
          新增公開訓練菜單
        </h1>
        <p className="mb-9 mt-3 text-sm leading-7 text-[#697067]">
          建立可供 Mobile 使用者導入的官方訓練模板。
        </p>
        {options.ok ? (
          <WorkoutEditorForm options={options.data} />
        ) : (
          <div className="rounded-xl bg-[#fff1eb] p-5 text-[#9f3c1a]">
            {options.message}
          </div>
        )}
      </main>
    </StudioShell>
  );
}
