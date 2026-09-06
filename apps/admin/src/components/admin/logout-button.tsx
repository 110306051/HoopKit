"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function logout() {
    setIsPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={logout} disabled={isPending} className={`${compact ? "px-3 py-1.5 text-xs" : "w-full px-4 py-2 text-sm"} rounded-md border border-[#d7d7d0] bg-white font-bold text-[#353532] transition hover:border-[#121212] disabled:opacity-50`}>
      {isPending ? "登出中…" : "登出"}
    </button>
  );
}
