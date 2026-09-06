"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="zh-Hant">
      <body>
        <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6">
          <p className="text-sm font-bold uppercase tracking-widest">
            HoopKit Admin
          </p>
          <h1 className="text-3xl font-black">頁面暫時無法顯示</h1>
          <p>錯誤已回報，請重新整理頁面；若問題持續發生，請稍後再試。</p>
          <button
            className="w-fit rounded-full bg-black px-5 py-3 font-bold text-white"
            onClick={() => window.location.reload()}
            type="button"
          >
            重新整理
          </button>
        </main>
      </body>
    </html>
  );
}
