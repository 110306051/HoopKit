import type { Metadata } from "next";
import { MediaManager } from "@/components/admin/media-manager";
import { StudioShell } from "@/components/admin/studio-shell";
import { adminApiRequest } from "@/lib/admin-api";
import { requireAdminSession } from "@/lib/admin-session";
import type { MediaAsset } from "@/types/admin";

export const metadata: Metadata = { title: "媒體中心" };
export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const session = await requireAdminSession();
  const result = await adminApiRequest<MediaAsset[]>(
    "/admin/media",
    session.accessToken,
  );

  return (
    <StudioShell email={session.email}>
      <main className="studio-page max-w-[1560px]">
        <header className="court-index pt-7">
          <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
            <div>
              <p className="page-kicker">FILM DESK / ASSET OPERATIONS</p>
              <h1 className="page-title">媒體中心</h1>
              <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[#696964]">
                集中管理球員圖片、招式封面與 Highlight 原始影片。圖片送往 Supabase Storage；影片直傳 Mux 後自動追蹤轉碼狀態。
              </p>
            </div>
            <div className="utility-type border-l-2 border-[#315efb] bg-white px-4 py-3 text-[10px] font-bold leading-5 text-[#595954]">
              BROWSER → STORAGE / MUX<br />
              SERVICE KEYS STAY IN API
            </div>
          </div>
        </header>

        {result.ok ? (
          <MediaManager initialAssets={result.data} />
        ) : (
          <div className="mt-10 border-l-4 border-[#f05a28] bg-[#fff0e9] p-6 text-[#873719]">
            <p className="font-bold">媒體資料載入失敗</p>
            <p className="mt-2 text-sm">{result.message}</p>
          </div>
        )}
      </main>
    </StudioShell>
  );
}
