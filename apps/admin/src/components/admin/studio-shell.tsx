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
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="hidden min-h-screen border-r border-[#d7d7d0] bg-white px-4 py-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <Link href="/dashboard" className="flex items-center gap-3 px-2 py-2">
          <span className="grid size-10 place-items-center rounded-lg bg-[#121212] text-lg font-black text-white">
            H<span className="text-[#f05a28]">.</span>
          </span>
          <div>
            <p className="display-type text-xl font-black leading-none tracking-[-0.02em]">HOOPKIT</p>
            <p className="utility-type mt-1 text-[9px] font-bold tracking-[0.16em] text-[#85857f]">PLAYBOOK STUDIO</p>
          </div>
        </Link>
        <div className="my-5 border-t border-[#d7d7d0]" />
        <StudioNav />
        <div className="mt-auto border-t border-[#d7d7d0] px-2 pt-5">
          <p className="utility-type text-[9px] font-bold tracking-[0.14em] text-[#8b8b85]">SIGNED IN</p>
          <p className="mt-2 truncate text-sm font-bold">{email}</p>
          <p className="mt-1 text-xs text-[#777771]">{role ?? "已驗證帳號"}</p>
          <div className="mt-4"><LogoutButton /></div>
        </div>
      </aside>
      <div className="min-w-0 pb-20 lg:pb-0">
        <header className="sticky top-0 z-20 border-b border-[#d7d7d0] bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-md bg-[#121212] text-sm font-black text-white">H<span className="text-[#f05a28]">.</span></span>
              <span className="display-type text-lg font-black">HOOPKIT</span>
            </Link>
            <LogoutButton compact />
          </div>
        </header>
        {children}
        <div className="fixed inset-x-0 bottom-0 z-30 lg:hidden"><StudioNav /></div>
      </div>
    </div>
  );
}
