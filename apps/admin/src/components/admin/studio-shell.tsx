import Link from "next/link";
import type { ReactNode } from "react";
import { LogoutButton } from "./logout-button";
import { StudioNav } from "./studio-nav";

type StudioShellProps = {
  email: string;
  role?: string;
  children: ReactNode;
};

export function StudioShell({ email, role, children }: StudioShellProps) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="hidden min-h-screen bg-[#111711] p-5 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <Link href="/dashboard" className="flex items-center gap-3 px-2 py-3">
          <span className="grid size-10 place-items-center rounded-full bg-[#bff54a] font-black text-[#111711]">
            H
          </span>
          <div>
            <p className="font-[var(--font-manrope)] text-sm font-extrabold tracking-tight">
              HOOPKIT STUDIO
            </p>
            <p className="text-[9px] font-semibold tracking-[0.16em] text-white/35">
              CONTENT OPERATIONS
            </p>
          </div>
        </Link>

        <div className="my-6 h-px bg-white/10" />
        <StudioNav />

        <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="truncate text-sm font-semibold">{email}</p>
          <p className="mt-1 text-xs text-white/40">{role ?? "已驗證帳號"}</p>
          <div className="mt-4">
            <LogoutButton />
          </div>
        </div>
      </aside>

      <div className="min-w-0 pb-24 lg:pb-0">
        <header className="sticky top-0 z-20 border-b border-[#d8d6cd] bg-[#fbfaf6]/90 px-5 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-full bg-[#111711] text-sm font-black text-[#bff54a]">
                H
              </span>
              <span className="font-[var(--font-manrope)] text-sm font-extrabold">
                HOOPKIT STUDIO
              </span>
            </Link>
            <LogoutButton />
          </div>
        </header>

        {children}

        <div className="fixed inset-x-0 bottom-0 z-30 lg:hidden">
          <StudioNav />
        </div>
      </div>
    </div>
  );
}
