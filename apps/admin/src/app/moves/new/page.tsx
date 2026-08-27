import type { Metadata } from "next";
import { MoveEditorForm } from "@/components/admin/move-editor-form";
import { StudioShell } from "@/components/admin/studio-shell";
import { adminApiRequest } from "@/lib/admin-api";
import { requireAdminSession } from "@/lib/admin-session";
import type { EditorialOptions } from "@/types/admin";

export const metadata: Metadata = { title: "新增招式" };
export const dynamic = "force-dynamic";

export default async function NewMovePage() {
  const session = await requireAdminSession();
  const options = await adminApiRequest<EditorialOptions>(
    "/admin/editorial/options",
    session.accessToken,
  );
  return (
    <StudioShell email={session.email}>
      <main className="mx-auto max-w-6xl px-5 py-8 lg:px-10 lg:py-12">
        <p className="text-xs font-bold tracking-[0.2em] text-[#758650]">
          NEW MOVE
        </p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.04em]">
          新增招式
        </h1>
        <p className="mb-9 mt-3 text-sm leading-7 text-[#697067]">
          先以草稿建立，再補齊步驟、球員與影片後發布。
        </p>
        {options.ok ? (
          <MoveEditorForm options={options.data} />
        ) : (
          <div className="rounded-xl bg-[#fff1eb] p-5 text-[#9f3c1a]">
            {options.message}
          </div>
        )}
      </main>
    </StudioShell>
  );
}
