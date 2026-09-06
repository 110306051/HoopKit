import Link from "next/link";
import type { ReactNode } from "react";

export function LegalDocument({
  eyebrow,
  title,
  updatedAt,
  children,
}: {
  eyebrow: string;
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-12 sm:px-8 sm:py-20">
      <Link href="/" className="utility-type text-xs font-bold text-[#f05a28]">
        HOOPKIT ←
      </Link>
      <header className="court-index mt-8 border-b border-[#121212] pb-8">
        <p className="page-kicker">{eyebrow}</p>
        <h1 className="page-title">{title}</h1>
        <p className="mt-4 text-sm text-[#696964]">最後更新：{updatedAt}</p>
      </header>
      <article className="legal-copy mt-10 space-y-9 text-[15px] leading-8 text-[#4f4f4a]">
        {children}
      </article>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="display-type mb-3 text-2xl font-black text-[#121212]">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
