"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
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
    <button
      type="button"
      onClick={logout}
      disabled={isPending}
      className="rounded-full border border-[#d8d6cd] bg-white px-4 py-2 text-sm font-semibold transition hover:border-[#9fa49d] hover:bg-[#f7f6f1] disabled:opacity-50"
    >
      {isPending ? "登出中…" : "登出"}
    </button>
  );
}
