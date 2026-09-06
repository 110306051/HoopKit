import type { Metadata } from "next";
import { ReportQueue } from "@/components/admin/report-queue";
import { StudioShell } from "@/components/admin/studio-shell";
import { adminApiRequest } from "@/lib/admin-api";
import { requireAdminSession } from "@/lib/admin-session";
import type { ContentReport } from "@/types/admin";

export const metadata: Metadata = { title: "內容回報" };
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await requireAdminSession();
  const result = await adminApiRequest<ContentReport[]>(
    "/admin/reports",
    session.accessToken,
  );

  return (
    <StudioShell email={session.email} role="admin">
      <main className="studio-page">
        <header className="court-index pt-7">
          <p className="page-kicker">TRUST &amp; SAFETY / REPORTS</p>
          <h1 className="page-title">內容回報</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#696964]">
            集中處理不當內容、著作權、資訊正確性與訓練安全疑慮。此頁僅限 Admin。
          </p>
        </header>
        {result.ok ? (
          <ReportQueue initialReports={result.data} />
        ) : (
          <p className="mt-8 border-l-4 border-[#f05a28] bg-[#fff0e9] p-5 text-sm text-[#873719]">
            {result.message}
          </p>
        )}
      </main>
    </StudioShell>
  );
}
