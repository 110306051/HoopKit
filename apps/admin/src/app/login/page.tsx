import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "登入",
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (claims) {
    redirect("/dashboard");
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-y-0 left-0 hidden w-[46%] bg-[#111711] lg:block">
        <div className="court-grid absolute inset-0 opacity-35" />
        <div className="absolute -left-32 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full border border-[#bff54a]/50" />
        <div className="absolute -left-12 top-1/2 h-52 w-52 -translate-y-1/2 rounded-full border border-[#bff54a]/40" />
        <div className="relative flex h-full flex-col justify-between p-14 text-white">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-[#bff54a] font-black text-[#111711]">
              H
            </span>
            <span className="font-[var(--font-manrope)] text-lg font-extrabold tracking-tight">
              HOOPKIT STUDIO
            </span>
          </div>

          <div className="max-w-md pb-10">
            <p className="mb-5 text-xs font-bold tracking-[0.24em] text-[#bff54a]">
              BUILD BETTER REPS
            </p>
            <h1 className="font-[var(--font-manrope)] text-5xl font-extrabold leading-[1.08] tracking-[-0.04em]">
              把每一次訓練，
              <br />
              變成可執行的內容。
            </h1>
            <p className="mt-7 max-w-sm text-base leading-8 text-white/62">
              在同一個工作台管理球員、招式拆解、影片片段與公開訓練菜單。
            </p>
          </div>

          <p className="text-xs tracking-wide text-white/35">
            INTERNAL CONTENT OPERATIONS · HOOPKIT
          </p>
        </div>
      </div>

      <section className="ml-auto flex min-h-screen w-full items-center px-6 py-12 lg:w-[54%] lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-12 flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-full bg-[#111711] font-black text-[#bff54a]">
              H
            </span>
            <span className="font-[var(--font-manrope)] font-extrabold">
              HOOPKIT STUDIO
            </span>
          </div>

          <p className="text-xs font-bold tracking-[0.2em] text-[#758650]">
            CONTENT OPERATIONS
          </p>
          <h2 className="mt-4 font-[var(--font-manrope)] text-4xl font-extrabold tracking-[-0.035em]">
            歡迎回來
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-[#697067]">
            使用已由管理者建立的帳號登入。這個後台不開放公開註冊。
          </p>

          <LoginForm />

          <div className="mt-8 flex items-start gap-3 border-t border-[#d8d6cd] pt-6 text-xs leading-6 text-[#7b8379]">
            <span className="mt-1 size-2 shrink-0 rounded-full bg-[#bff54a] ring-4 ring-[#bff54a]/20" />
            登入由 Supabase Auth 驗證；HoopKit 不會在自己的資料表保存密碼。
          </div>
        </div>
      </section>
    </main>
  );
}
