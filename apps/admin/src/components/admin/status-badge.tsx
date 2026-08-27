import type { ContentStatus } from "@/types/admin";

const styles: Record<ContentStatus, string> = {
  published: "border-[#b8dc69] bg-[#effbd4] text-[#496b08]",
  draft: "border-[#c9c7be] bg-[#f1f0eb] text-[#646b62]",
  archived: "border-[#efb39e] bg-[#fff0e9] text-[#9f3c1a]",
};

const labels: Record<ContentStatus, string> = {
  published: "已發布",
  draft: "草稿",
  archived: "已封存",
};

export function StatusBadge({ status }: { status: ContentStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
