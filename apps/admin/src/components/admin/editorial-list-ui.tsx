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
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <p className="text-xs font-bold tracking-[0.2em] text-[#758650]">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.04em]">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-7 text-[#697067]">{description}</p>
      </div>
      <Link
        href={href}
        className="inline-flex h-11 items-center justify-center rounded-full bg-[#111711] px-5 text-sm font-bold text-white"
      >
        {action}
      </Link>
    </div>
  );
}

export function EditorialEmpty({ href, text }: { href: string; text: string }) {
  return (
    <div className="mt-9 rounded-2xl border border-dashed border-[#c9c7be] p-12 text-center">
      <p className="font-bold">{text}</p>
      <Link
        href={href}
        className="mt-3 inline-block text-sm font-bold text-[#56721b]"
      >
        建立第一筆內容
      </Link>
    </div>
  );
}

export function EditorialError({ message }: { message: string }) {
  return (
    <div className="mt-9 rounded-2xl border border-[#efb39e] bg-[#fff3ed] p-6 text-sm text-[#9f3c1a]">
      {message}
    </div>
  );
}
