"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/dashboard", label: "總覽", shortLabel: "總覽", icon: "⌁" },
  { href: "/players", label: "球員管理", shortLabel: "球員", icon: "◉" },
  { href: "/moves", label: "招式管理", shortLabel: "招式", icon: "↗" },
  { href: "/workouts", label: "訓練菜單", shortLabel: "菜單", icon: "≡" },
  { href: "/media", label: "媒體中心", shortLabel: "媒體", icon: "▶" },
  { href: "/library", label: "內容預覽", shortLabel: "預覽", icon: "▦" },
] as const;

export function StudioNav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="hidden space-y-1 lg:block">
        {navigation.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                active
                  ? "bg-[#bff54a] text-[#111711]"
                  : "text-white/62 hover:bg-white/8 hover:text-white"
              }`}
            >
              <span className="grid size-7 place-items-center rounded-lg border border-current/20 text-sm">
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <nav className="grid grid-cols-6 gap-1 border-t border-[#d8d6cd] bg-[#fbfaf6] p-2 lg:hidden">
        {navigation.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-xl px-2 py-2 text-center text-xs font-bold ${
                active ? "bg-[#111711] text-[#bff54a]" : "text-[#697067]"
              }`}
            >
              <span className="mb-1 block text-base">{item.icon}</span>
              {item.shortLabel}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
