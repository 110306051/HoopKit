"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("登入失敗，請確認 Email、密碼與帳號狀態。");
      setIsSubmitting(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form className="mt-10 space-y-5" onSubmit={handleSubmit}>
      <div>
        <label
          className="mb-2 block text-sm font-bold text-[#30302d]"
          htmlFor="email"
        >
          工作 Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="coach@hoopkit.local"
          className="field-input"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label
            className="block text-sm font-bold text-[#30302d]"
            htmlFor="password"
          >
            密碼
          </label>
          <span className="text-xs text-[#7b8379]">至少 8 個字元</span>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="輸入管理帳號密碼"
          className="field-input"
        />
      </div>

      {error ? (
        <p
          className="rounded-xl border border-[#efb39e] bg-[#fff1eb] px-4 py-3 text-sm text-[#9f3c1a]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="primary-action w-full disabled:cursor-wait disabled:opacity-60"
      >
        {isSubmitting ? "正在驗證…" : "進入 HoopKit Studio"}
      </button>
    </form>
  );
}
