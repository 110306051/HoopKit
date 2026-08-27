import type { Metadata } from "next";
import { PlayerForm } from "@/components/admin/player-form";
import { StudioShell } from "@/components/admin/studio-shell";
import { requireAdminSession } from "@/lib/admin-session";

export const metadata: Metadata = { title: "新增球員" };

export default async function NewPlayerPage() {
  const session = await requireAdminSession();

  return (
    <StudioShell email={session.email}>
      <main className="mx-auto max-w-6xl px-5 py-8 lg:px-10 lg:py-12">
        <p className="text-xs font-bold tracking-[0.2em] text-[#758650]">NEW PLAYER</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.04em]">新增球員</h1>
        <p className="mb-9 mt-3 text-sm leading-7 text-[#697067]">
          先以草稿建立內容，確認名稱、圖片與介紹後再切換為已發布。
        </p>
        <PlayerForm />
      </main>
    </StudioShell>
  );
}
