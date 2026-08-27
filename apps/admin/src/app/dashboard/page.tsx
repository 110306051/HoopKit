import type { Metadata } from "next";
import Link from "next/link";
import { StudioShell } from "@/components/admin/studio-shell";
import { adminApiRequest } from "@/lib/admin-api";
import { requireAdminSession } from "@/lib/admin-session";
import type { DashboardData } from "@/types/admin";

export const metadata: Metadata = { title: "總覽" };
export const dynamic = "force-dynamic";

const metricCards = [
  { key: "players", label: "球員", note: "球星與示範球員資料", accent: "#bff54a" },
  { key: "moves", label: "招式", note: "動作拆解與使用時機", accent: "#ff8a55" },
  {
    key: "workoutTemplates",
    label: "公開菜單",
    note: "可匯入的訓練模板",
    accent: "#8cd1ff",
  },
  { key: "mediaAssets", label: "影片資產", note: "Mux／影片處理狀態", accent: "#d7b5ff" },
] as const;

export default async function DashboardPage() {
  const session = await requireAdminSession();
  const result = await adminApiRequest<DashboardData>(
    "/admin/dashboard",
    session.accessToken,
  );
  const email = result.ok ? result.data.user.email ?? session.email : session.email;
  const role = result.ok ? result.data.user.role : undefined;

  return (
    <StudioShell email={email} role={role}>
      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-12">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-[#758650]">DASHBOARD</p>
            <h1 className="mt-3 font-[var(--font-manrope)] text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
              內容營運總覽
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#697067]">
              查看內容數量與服務狀態，再進入內容資料庫檢視完整文字、菜單階層和媒體欄位。
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-[#d8d6cd] bg-[#fbfaf6] px-4 py-2 text-sm">
            <span className={`size-2 rounded-full ${result.ok ? "bg-[#7fbd00]" : "bg-[#ff6b35]"}`} />
            {result.ok ? "Dashboard 資料查詢正常" : "需要處理設定"}
          </div>
        </div>

        {!result.ok ? (
          <section className="mt-9 rounded-2xl border border-[#efb39e] bg-[#fff3ed] p-5">
            <p className="font-bold text-[#8f3517]">尚未取得管理資料</p>
            <p className="mt-2 text-sm leading-6 text-[#a05235]">{result.message}</p>
          </section>
        ) : null}

        <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((card) => (
            <article
              key={card.key}
              className="relative overflow-hidden rounded-2xl border border-[#d8d6cd] bg-[#fbfaf6] p-6"
            >
              <span
                className="absolute right-5 top-5 size-3 rounded-full"
                style={{ backgroundColor: card.accent }}
              />
              <p className="text-sm font-semibold text-[#697067]">{card.label}</p>
              <p className="mt-4 font-[var(--font-manrope)] text-5xl font-extrabold tracking-[-0.05em]">
                {result.ok ? result.data.metrics[card.key] : "—"}
              </p>
              <p className="mt-5 border-t border-[#e2e0d8] pt-4 text-xs leading-5 text-[#848b82]">
                {card.note}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <article className="court-grid overflow-hidden rounded-2xl bg-[#111711] p-7 text-white sm:p-9">
            <p className="text-xs font-bold tracking-[0.2em] text-[#bff54a]">CONTENT LIBRARY</p>
            <h2 className="mt-4 max-w-xl font-[var(--font-manrope)] text-3xl font-extrabold tracking-[-0.035em]">
              查看資料庫裡真正的文字、圖片、影片與菜單內容。
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/60">
              內容資料庫會組合球員、招式步驟、標籤、Highlight Clip、公開訓練模板與媒體資產。
            </p>
            <Link
              href="/library"
              className="mt-8 inline-flex rounded-full bg-[#bff54a] px-5 py-3 text-sm font-extrabold text-[#111711]"
            >
              開啟內容資料庫 →
            </Link>
          </article>

          <article className="rounded-2xl border border-[#d8d6cd] bg-[#fbfaf6] p-7">
            <p className="text-xs font-bold tracking-[0.18em] text-[#758650]">FIRST WORKFLOW</p>
            <h2 className="mt-3 text-2xl font-extrabold">球員內容管理</h2>
            <p className="mt-3 text-sm leading-7 text-[#697067]">
              第一條可寫入工作流已完成：新增、編輯、發布與封存球員。
            </p>
            <div className="mt-6 grid gap-3">
              <Link
                href="/players"
                className="rounded-xl border border-[#d8d6cd] bg-white px-4 py-3 text-sm font-bold hover:border-[#9ba497]"
              >
                管理現有球員 →
              </Link>
              <Link
                href="/players/new"
                className="rounded-xl bg-[#111711] px-4 py-3 text-sm font-bold text-white"
              >
                ＋ 建立新球員
              </Link>
            </div>
          </article>
        </section>
      </main>
    </StudioShell>
  );
}
