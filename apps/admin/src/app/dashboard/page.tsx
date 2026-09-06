import type { Metadata } from "next";
import Link from "next/link";
import { StudioShell } from "@/components/admin/studio-shell";
import { adminApiRequest } from "@/lib/admin-api";
import { requireAdminSession } from "@/lib/admin-session";
import type { DashboardData } from "@/types/admin";

export const metadata: Metadata = { title: "總覽" };
export const dynamic = "force-dynamic";

const metrics = [
  { key: "players", label: "球員", code: "PLAYER", href: "/players" },
  { key: "moves", label: "招式", code: "MOVE", href: "/moves" },
  { key: "workoutTemplates", label: "公開菜單", code: "WORKOUT", href: "/workouts" },
  { key: "mediaAssets", label: "媒體資產", code: "MEDIA", href: "/media" },
] as const;

export default async function DashboardPage() {
  const session = await requireAdminSession();
  const result = await adminApiRequest<DashboardData>("/admin/dashboard", session.accessToken);
  const email = result.ok ? result.data.user.email ?? session.email : session.email;
  const role = result.ok ? result.data.user.role : undefined;

  return (
    <StudioShell email={email} role={role}>
      <main className="studio-page">
        <header className="court-index pt-7">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="page-kicker">COURT INDEX / 00</p>
              <h1 className="page-title">內容戰術板</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#696964]">
                從素材到發布，一眼掌握球員、招式、訓練菜單與影片的內容進度。
              </p>
            </div>
            <div className="utility-type flex items-center gap-2 border-l-2 border-[#121212] bg-white px-4 py-3 text-[11px] font-bold">
              <span className={`size-2 rounded-full ${result.ok ? "bg-[#277a48]" : "bg-[#f05a28]"}`} />
              {result.ok ? "SYSTEM READY" : "ACTION REQUIRED"}
            </div>
          </div>
        </header>

        {!result.ok ? (
          <section className="mt-8 border-l-4 border-[#f05a28] bg-[#fff0e9] p-5">
            <p className="font-bold text-[#873719]">管理資料尚未載入</p>
            <p className="mt-2 text-sm leading-6 text-[#9c5035]">{result.message}</p>
          </section>
        ) : null}

        <section className="mt-10 grid border-l border-t border-[#d7d7d0] sm:grid-cols-2 xl:grid-cols-4" aria-label="內容數量">
          {metrics.map((metric, index) => (
            <Link key={metric.key} href={metric.href} className="group relative min-h-44 border-b border-r border-[#d7d7d0] bg-white p-5 transition hover:bg-[#121212] hover:text-white">
              <div className="flex items-start justify-between">
                <span className="utility-type text-[10px] font-bold tracking-[0.14em] text-[#85857f] group-hover:text-white/55">{metric.code}</span>
                <span className="utility-type text-[10px] text-[#a2a29c]">0{index + 1}</span>
              </div>
              <p className="display-type mt-5 text-6xl font-black leading-none tracking-[-0.04em]">
                {result.ok ? result.data.metrics[metric.key] : "—"}
              </p>
              <div className="mt-5 flex items-center justify-between border-t border-[#d7d7d0] pt-3 group-hover:border-white/20">
                <span className="text-sm font-bold">{metric.label}</span>
                <span className="text-[#f05a28]">→</span>
              </div>
            </Link>
          ))}
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.45fr_.75fr]">
          <article className="relative min-h-80 overflow-hidden bg-[#121212] p-7 text-white sm:p-10">
            <div className="court-grid absolute inset-0" />
            <div className="absolute -bottom-32 -right-20 size-80 rounded-full border border-white/15" />
            <div className="absolute -bottom-16 right-12 size-44 rounded-full border border-[#f05a28]/70" />
            <div className="relative flex h-full max-w-2xl flex-col justify-between">
              <div>
                <p className="utility-type text-[10px] font-bold tracking-[0.16em] text-[#f05a28]">TODAY&apos;S PLAY</p>
                <h2 className="display-type mt-4 text-4xl font-black leading-[.98] tracking-[-0.025em] sm:text-5xl">
                  把球場上的細節，<br />整理成下一次可執行的訓練。
                </h2>
                <p className="mt-5 max-w-xl text-sm leading-7 text-white/60">
                  在內容預覽中交叉檢查球員、動作步驟、Highlight 片段與公開菜單的最終呈現。
                </p>
              </div>
              <Link href="/library" className="mt-8 inline-flex w-fit items-center gap-5 border-b border-[#f05a28] pb-2 text-sm font-bold">
                開啟內容預覽 <span className="text-[#f05a28]">↗</span>
              </Link>
            </div>
          </article>

          <article className="panel flex flex-col p-7">
            <p className="page-kicker">QUICK START</p>
            <h2 className="display-type mt-3 text-3xl font-black">建立下一筆內容</h2>
            <p className="mt-3 text-sm leading-7 text-[#696964]">
              先建立核心資料，再綁定媒體與發布狀態。
            </p>
            <div className="mt-7 grid gap-2">
              <QuickLink href="/players/new" label="新增球員" code="P" />
              <QuickLink href="/moves/new" label="新增招式" code="M" />
              <QuickLink href="/workouts/new" label="新增訓練菜單" code="W" />
              <QuickLink href="/media" label="上傳媒體" code="A" />
            </div>
          </article>
        </section>
      </main>
    </StudioShell>
  );
}

function QuickLink({ href, label, code }: { href: string; label: string; code: string }) {
  return (
    <Link href={href} className="group flex items-center justify-between border-b border-[#d7d7d0] py-3 text-sm font-bold">
      <span className="flex items-center gap-3"><span className="utility-type grid size-7 place-items-center bg-[#eeeeea] text-[10px] group-hover:bg-[#f05a28] group-hover:text-white">{code}</span>{label}</span>
      <span className="transition group-hover:translate-x-1">→</span>
    </Link>
  );
}
