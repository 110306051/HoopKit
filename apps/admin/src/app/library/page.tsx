import type { Metadata } from "next";
import { adminApiRequest } from "@/lib/admin-api";
import { requireAdminSession } from "@/lib/admin-session";
import { ContentLibraryView } from "@/components/admin/content-library-view";
import { StudioShell } from "@/components/admin/studio-shell";
import type { ContentLibrary } from "@/types/admin";

export const metadata: Metadata = {
  title: "內容資料庫",
};

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const session = await requireAdminSession();
  const result = await adminApiRequest<ContentLibrary>(
    "/admin/content",
    session.accessToken,
  );

  return (
    <StudioShell email={session.email}>
      <main className="mx-auto max-w-[1500px] px-5 py-8 lg:px-10 lg:py-12">
        <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-[#758650]">CONTENT LIBRARY</p>
            <h1 className="mt-3 font-[var(--font-manrope)] text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
              直接查看資料庫內容
            </h1>
            <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[#697067]">
              這裡顯示 PostgreSQL 中的球員、招式文字、動作步驟、Highlight Clip、公開菜單與媒體欄位。內容由 NestJS API 組合，不會把 service-role key 暴露給瀏覽器。
            </p>
          </div>

          <nav className="flex flex-wrap gap-2 text-xs font-bold">
            {[
              ["#players", "球員"],
              ["#moves", "招式"],
              ["#workouts", "菜單"],
              ["#media", "媒體"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="rounded-full border border-[#d8d6cd] bg-white px-3 py-2 hover:border-[#9ba497]"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>

        {result.ok ? (
          <div className="mt-12">
            <ContentLibraryView data={result.data} />
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-[#efb39e] bg-[#fff3ed] p-6">
            <p className="font-bold text-[#8f3517]">內容資料庫載入失敗</p>
            <p className="mt-2 text-sm text-[#a05235]">{result.message}</p>
          </div>
        )}
      </main>
    </StudioShell>
  );
}
