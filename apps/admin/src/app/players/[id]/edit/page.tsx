import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlayerForm } from "@/components/admin/player-form";
import { StudioShell } from "@/components/admin/studio-shell";
import { adminApiRequest } from "@/lib/admin-api";
import { requireAdminSession } from "@/lib/admin-session";
import type { Player } from "@/types/admin";

export const metadata: Metadata = { title: "編輯球員" };
export const dynamic = "force-dynamic";

export default async function EditPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAdminSession();
  const result = await adminApiRequest<Player>(`/admin/players/${id}`, session.accessToken);

  if (!result.ok && result.status === 404) {
    notFound();
  }

  return (
    <StudioShell email={session.email}>
      <main className="mx-auto max-w-6xl px-5 py-8 lg:px-10 lg:py-12">
        <p className="text-xs font-bold tracking-[0.2em] text-[#758650]">EDIT PLAYER</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.04em]">編輯球員</h1>
        <p className="mb-9 mt-3 text-sm leading-7 text-[#697067]">
          修改會直接寫入 PostgreSQL；切換為發布後，公開讀取政策才會允許 Mobile 顯示。
        </p>
        {result.ok ? (
          <PlayerForm player={result.data} />
        ) : (
          <div className="rounded-2xl border border-[#efb39e] bg-[#fff3ed] p-6 text-sm text-[#9f3c1a]">
            {result.message}
          </div>
        )}
      </main>
    </StudioShell>
  );
}
