"use client";

import { useState } from "react";
import { adminClientApiRequest } from "@/lib/admin-client-api";
import { formatDate } from "@/lib/format";
import type { ContentReport } from "@/types/admin";

const reasonLabels: Record<ContentReport["reason"], string> = {
  inappropriate: "不當內容",
  copyright: "著作權疑慮",
  misleading: "資訊錯誤／誤導",
  safety: "安全疑慮",
  other: "其他",
};

const targetLabels: Record<ContentReport["targetType"], string> = {
  user_clip: "使用者片段",
  move: "招式",
  workout_template: "公開菜單",
};

export function ReportQueue({
  initialReports,
}: {
  initialReports: ContentReport[];
}) {
  const [reports, setReports] = useState(initialReports);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateReport(
    report: ContentReport,
    status: "reviewing" | "resolved" | "dismissed",
  ) {
    setBusyId(report.id);
    setError(null);
    try {
      const updated = await adminClientApiRequest<ContentReport>(
        `/admin/reports/${report.id}`,
        { method: "PATCH", body: JSON.stringify({ status }) },
      );
      setReports((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "更新回報失敗。");
    } finally {
      setBusyId(null);
    }
  }

  if (!reports.length) {
    return (
      <div className="mt-8 border border-dashed border-[#c9c7be] p-12 text-center text-sm text-[#696964]">
        目前沒有內容回報。
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      {error ? (
        <p className="border-l-4 border-[#f05a28] bg-[#fff0e9] p-4 text-sm text-[#873719]">
          {error}
        </p>
      ) : null}
      {reports.map((report) => (
        <article
          key={report.id}
          className="border border-[#d7d7d0] bg-white p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="utility-type text-[10px] font-bold tracking-[.12em] text-[#f05a28]">
                {targetLabels[report.targetType]} /{" "}
                {reasonLabels[report.reason]}
              </p>
              <h2 className="display-type mt-2 text-2xl font-black">
                {report.targetLabel}
              </h2>
              <p className="mt-2 text-xs text-[#777771]">
                建立時間 {formatDate(report.createdAt)} · Reporter{" "}
                {report.reporterUserId ?? "帳號已刪除"}
              </p>
            </div>
            <span className="utility-type rounded-md border border-[#d7d7d0] bg-[#eeeeea] px-2 py-1 text-[10px] font-bold uppercase">
              {report.status}
            </span>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#595954]">
            {report.details || "使用者未補充說明。"}
          </p>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-[#d7d7d0] pt-4">
            <Action
              label="開始處理"
              disabled={busyId === report.id}
              onClick={() => void updateReport(report, "reviewing")}
            />
            <Action
              label="標記已處理"
              disabled={busyId === report.id}
              onClick={() => void updateReport(report, "resolved")}
            />
            <Action
              label="駁回"
              disabled={busyId === report.id}
              onClick={() => void updateReport(report, "dismissed")}
            />
          </div>
        </article>
      ))}
    </div>
  );
}

function Action({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="border border-[#121212] px-3 py-2 text-xs font-bold disabled:opacity-40"
    >
      {label}
    </button>
  );
}
