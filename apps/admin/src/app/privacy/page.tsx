import type { Metadata } from "next";
import { LegalDocument, LegalSection } from "@/components/legal-document";

export const metadata: Metadata = { title: "隱私權政策" };

export default function PrivacyPage() {
  const supportEmail =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@hoopkit.app";
  return (
    <LegalDocument
      eyebrow="LEGAL / PRIVACY"
      title="HoopKit 隱私權政策"
      updatedAt="2026-09-06"
    >
      <p>
        本政策說明 HoopKit
        在提供籃球訓練內容、個人菜單、收藏、訓練紀錄與影片片段功能時，如何處理你的資料。
      </p>
      <LegalSection title="我們處理的資料">
        <p>
          帳號資料包括
          Email、顯示名稱、登入識別碼與權限；使用資料包括收藏、個人訓練菜單、訓練紀錄及操作所需的技術紀錄。
        </p>
        <p>
          若你使用影片功能，我們會處理你選擇上傳的影片、標題、描述、球員標籤、技術標籤及影片處理狀態。
        </p>
      </LegalSection>
      <LegalSection title="用途與處理服務">
        <p>
          資料用於登入驗證、同步個人內容、影片轉碼與播放、維護服務安全、處理內容回報及改善穩定性。
        </p>
        <p>
          HoopKit 使用 Supabase 提供 Auth、PostgreSQL 與檔案儲存，使用 Mux
          處理影片，並可能使用 Sentry 蒐集去識別化的錯誤與效能資訊。
        </p>
      </LegalSection>
      <LegalSection title="保存、分享與安全">
        <p>
          我們只在提供服務、履行安全與法令義務所需期間保存資料，不販售個人資料。資料可能由上述受託服務商在提供服務所需範圍處理。
        </p>
        <p>
          我們採用存取權限、傳輸加密及資料庫列級權限等措施，但任何網路服務都無法保證零風險。
        </p>
      </LegalSection>
      <LegalSection title="你的選擇">
        <p>
          你可以在 App 內登出或永久刪除帳號。刪除會移除 Auth
          身分、個人訓練資料與由 HoopKit 管理的個人 Mux
          影片；依法或為處理安全事件必須保存的有限紀錄可能例外。
        </p>
        <p>
          隱私權、資料存取或刪除問題請寄至{" "}
          <a
            className="font-bold text-[#c94b22] underline"
            href={`mailto:${supportEmail}`}
          >
            {supportEmail}
          </a>
          。
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
