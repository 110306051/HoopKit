/* eslint-disable @next/next/no-img-element */

import type { MediaAsset } from "@/types/admin";
import { formatDuration } from "@/lib/format";

export function MediaPreview({
  asset,
  compact = false,
}: {
  asset: MediaAsset | null;
  compact?: boolean;
}) {
  if (!asset) {
    return (
      <div
        className={`grid place-items-center border border-dashed border-[#a8a8a0] bg-[#eeeeea] text-center text-xs font-semibold text-[#85857f] ${
          compact ? "h-32" : "aspect-video"
        }`}
      >
        尚未綁定媒體
      </div>
    );
  }

  const isImage = asset.kind === "image";

  return (
    <div className="overflow-hidden border border-[#27282d] bg-[#101114]">
      {isImage && asset.sourceUrl ? (
        <img
          src={asset.sourceUrl}
          alt="媒體資產預覽"
          className={`w-full object-cover ${compact ? "h-32" : "aspect-video"}`}
        />
      ) : asset.playbackId && !compact ? (
        <iframe
          className="aspect-video w-full border-0 bg-black"
          src={`https://player.mux.com/${asset.playbackId}`}
          title={asset.title}
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : asset.sourceUrl ? (
        <video
          className={`w-full bg-black object-contain ${compact ? "h-32" : "aspect-video"}`}
          controls
          preload="metadata"
          poster={asset.thumbnailUrl ?? undefined}
          src={asset.sourceUrl}
        >
          目前瀏覽器無法播放此影片格式。
        </video>
      ) : asset.thumbnailUrl ? (
        <img
          src={asset.thumbnailUrl}
          alt="影片縮圖"
          className={`w-full object-cover ${compact ? "h-32" : "aspect-video"}`}
        />
      ) : (
        <div
          className={`court-grid grid place-items-center text-center text-xs font-semibold text-white/45 ${
            compact ? "h-32" : "aspect-video"
          }`}
        >
          資產存在，但尚無可預覽 URL
        </div>
      )}

      <div className="utility-type flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/10 bg-[#101114] px-3 py-2 text-[9px] font-bold tracking-[0.05em] text-white/55">
        <span>{asset.provider.toUpperCase()}</span>
        <span>{asset.status}</span>
        <span>{formatDuration(asset.durationMs)}</span>
        {asset.width && asset.height ? (
          <span>
            {asset.width}×{asset.height}
          </span>
        ) : null}
      </div>
    </div>
  );
}
