import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MoveEditorForm } from "@/components/admin/move-editor-form";
import { StudioShell } from "@/components/admin/studio-shell";
import { adminApiRequest } from "@/lib/admin-api";
import { requireAdminSession } from "@/lib/admin-session";
import type { EditorialOptions, MoveEditor } from "@/types/admin";

export const metadata: Metadata = { title: "編輯招式" };
export const dynamic = "force-dynamic";

export default async function EditMovePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAdminSession();
  const [move, options] = await Promise.all([
    adminApiRequest<MoveEditor>(
      `/admin/editorial/moves/${id}`,
      session.accessToken,
    ),
    adminApiRequest<EditorialOptions>(
      "/admin/editorial/options",
      session.accessToken,
    ),
  ]);
  if (!move.ok && move.status === 404) notFound();
  return (
    <StudioShell email={session.email}>
      <main className="mx-auto max-w-6xl px-5 py-8 lg:px-10 lg:py-12">
        <p className="text-xs font-bold tracking-[0.2em] text-[#758650]">
          EDIT MOVE
        </p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.04em]">
          編輯招式
        </h1>
        <p className="mb-9 mt-3 text-sm leading-7 text-[#697067]">
          同一頁維護招式說明、關聯、步驟與 Highlight 片段。
        </p>
        {move.ok && options.ok ? (
          <MoveEditorForm move={move.data} options={options.data} />
        ) : (
          <div className="rounded-xl bg-[#fff1eb] p-5 text-[#9f3c1a]">
            {!move.ok
              ? move.message
              : !options.ok
                ? options.message
                : "載入失敗"}
          </div>
        )}
      </main>
    </StudioShell>
  );
}
