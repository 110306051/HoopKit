import type { Metadata } from "next";
import { PlayerForm } from "@/components/admin/player-form";
import { StudioShell } from "@/components/admin/studio-shell";
import { requireAdminSession } from "@/lib/admin-session";

export const metadata: Metadata = { title: "新增球員" };

export default async function NewPlayerPage() {
  const session = await requireAdminSession();

  return (
    <StudioShell email={session.email}>
      <main className="studio-page max-w-6xl">
        <p className="court-index page-kicker pt-7">PLAYERS / NEW</p>
        <h1 className="page-title">新增球員</h1>
        <p className="mb-9 mt-4 text-sm leading-7 text-[#696964]">
          先以草稿建立內容，確認名稱、圖片與介紹後再切換為已發布。
        </p>
        <PlayerForm />
      </main>
    </StudioShell>
  );
}
