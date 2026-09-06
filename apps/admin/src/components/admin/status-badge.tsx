import type { ContentStatus } from "@/types/admin";

const styles: Record<ContentStatus, string> = {
  published: "border-[#bad8c5] bg-[#e9f4ed] text-[#1f653b]",
  draft: "border-[#d7d7d0] bg-[#eeeeea] text-[#595954]",
  archived: "border-[#efc6b7] bg-[#fff0e9] text-[#9c3f20]",
};

const labels: Record<ContentStatus, string> = {
  published: "已發布",
  draft: "草稿",
  archived: "已封存",
};

export function StatusBadge({ status }: { status: ContentStatus }) {
  return (
    <span
      className={`utility-type inline-flex rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.06em] ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
