import Link from "next/link";

export function EditorialListHeader({
  eyebrow,
  title,
  description,
  href,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <div className="court-index flex flex-col justify-between gap-5 pt-7 sm:flex-row sm:items-end">
      <div>
        <p className="page-kicker">{eyebrow}</p>
        <h1 className="page-title">{title}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[#696964]">{description}</p>
      </div>
      <Link
        href={href}
        className="primary-action"
      >
        ＋ {action}
      </Link>
    </div>
  );
}

export function EditorialEmpty({ href, text }: { href: string; text: string }) {
  return (
    <div className="mt-9 border border-dashed border-[#a8a8a0] bg-white p-12 text-center">
      <p className="font-bold">{text}</p>
      <Link
        href={href}
        className="mt-3 inline-block border-b border-[#f05a28] pb-1 text-sm font-bold"
      >
        建立第一筆內容
      </Link>
    </div>
  );
}

export function EditorialError({ message }: { message: string }) {
  return (
    <div className="mt-9 border-l-4 border-[#f05a28] bg-[#fff0e9] p-6 text-sm text-[#873719]">
      {message}
    </div>
  );
}
