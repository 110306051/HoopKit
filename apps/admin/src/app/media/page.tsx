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
      <main className="mx-auto max-w-[1500px] px-5 py-8 lg:px-10 lg:py-12">
        <p className="text-xs font-bold tracking-[0.2em] text-[#758650]">
          MEDIA OPERATIONS
        </p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
          媒體中心
        </h1>
        <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[#697067]">
          圖片直傳 Supabase Storage；影片直傳 Mux 並等待轉碼。服務金鑰只保留在
          NestJS API，不會送到瀏覽器。
        </p>

        {result.ok ? (
          <MediaManager initialAssets={result.data} />
        ) : (
          <div className="mt-10 rounded-2xl border border-[#efb39e] bg-[#fff3ed] p-6 text-[#8f3517]">
            <p className="font-bold">媒體資料載入失敗</p>
            <p className="mt-2 text-sm">{result.message}</p>
          </div>
        )}
      </main>
    </StudioShell>
  );
}
