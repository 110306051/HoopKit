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
      <main className="studio-page max-w-6xl">
        <p className="court-index page-kicker pt-7">MOVES / NEW</p>
        <h1 className="page-title">新增招式</h1>
        <p className="mb-9 mt-4 text-sm leading-7 text-[#696964]">
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
