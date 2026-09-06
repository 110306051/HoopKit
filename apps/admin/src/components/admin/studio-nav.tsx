"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navigation = [
  { href: "/dashboard", label: "總覽", shortLabel: "總覽", icon: <DashboardIcon />, group: "工作台" },
  { href: "/players", label: "球員管理", shortLabel: "球員", icon: <PlayerIcon />, group: "內容" },
  { href: "/moves", label: "招式管理", shortLabel: "招式", icon: <MoveIcon />, group: "內容" },
  { href: "/workouts", label: "訓練菜單", shortLabel: "菜單", icon: <WorkoutIcon />, group: "內容" },
  { href: "/media", label: "媒體中心", shortLabel: "媒體", icon: <MediaIcon />, group: "資產" },
  { href: "/library", label: "內容預覽", shortLabel: "預覽", icon: <LibraryIcon />, group: "資產" },
  { href: "/reports", label: "內容回報", shortLabel: "回報", icon: <ReportIcon />, group: "系統" },
] as const;

export function StudioNav() {
  const pathname = usePathname();
  const groups = ["工作台", "內容", "資產", "系統"] as const;

  return (
    <>
      <nav className="hidden space-y-5 lg:block" aria-label="主要導覽">
        {groups.map((group) => (
          <div key={group}>
            <p className="utility-type mb-1.5 px-3 text-[9px] font-bold tracking-[0.15em] text-[#999993]">{group}</p>
            <div className="space-y-0.5">
              {navigation.filter((item) => item.group === group).map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} />
              ))}
            </div>
          </div>
        ))}
      </nav>
      <nav className="grid grid-cols-7 border-t border-[#d7d7d0] bg-white px-1 pb-[max(.4rem,env(safe-area-inset-bottom))] pt-1.5 lg:hidden" aria-label="主要導覽">
        {navigation.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`relative flex min-w-0 flex-col items-center gap-1 rounded-md px-1 py-1.5 text-[10px] font-bold ${active ? "text-[#121212]" : "text-[#85857f]"}`}>
              {active ? <span className="absolute inset-x-3 -top-1.5 h-0.5 bg-[#f05a28]" /> : null}
              <span className="size-5">{item.icon}</span>
              <span className="truncate">{item.shortLabel}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function NavLink({ item, pathname }: { item: (typeof navigation)[number]; pathname: string }) {
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} className={`group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-bold transition ${active ? "bg-[#121212] text-white" : "text-[#595954] hover:bg-[#eeeeea] hover:text-[#121212]"}`}>
      {active ? <span className="absolute -left-1 h-5 w-1 bg-[#f05a28]" /> : null}
      <span className={`size-5 ${active ? "text-[#f05a28]" : "text-[#898983] group-hover:text-[#121212]"}`}>{item.icon}</span>
      {item.label}
    </Link>
  );
}

function Icon({ children }: { children: ReactNode }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}
function DashboardIcon() { return <Icon><path d="M4 4h6v6H4zM14 4h6v10h-6zM4 14h6v6H4zM14 18h6v2h-6z" /></Icon>; }
function PlayerIcon() { return <Icon><circle cx="12" cy="8" r="4" /><path d="M4.5 20c.8-4 3.3-6 7.5-6s6.7 2 7.5 6" /></Icon>; }
function MoveIcon() { return <Icon><path d="M5 18 18 5M10 5h8v8" /><path d="M5 7v11h11" /></Icon>; }
function WorkoutIcon() { return <Icon><path d="M7 5h13M7 12h13M7 19h13" /><path d="m3 5 .7.7L5 4M3 12l.7.7L5 11M3 19l.7.7L5 18" /></Icon>; }
function MediaIcon() { return <Icon><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9 5 3-5 3z" /></Icon>; }
function LibraryIcon() { return <Icon><path d="M4 5h6v14H4zM14 5h6v6h-6zM14 15h6v4h-6z" /></Icon>; }
function ReportIcon() { return <Icon><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.7 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" /></Icon>; }
