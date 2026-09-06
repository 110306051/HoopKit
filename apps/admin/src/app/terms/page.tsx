import type { Metadata } from "next";
import { LegalDocument, LegalSection } from "@/components/legal-document";

export const metadata: Metadata = { title: "服務條款" };

export default function TermsPage() {
  const supportEmail =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@hoopkit.app";
  return (
    <LegalDocument
      eyebrow="LEGAL / TERMS"
      title="HoopKit 服務條款"
      updatedAt="2026-09-06"
    >
      <p>使用 HoopKit 即表示你同意遵守本條款。若不同意，請停止使用服務。</p>
      <LegalSection title="訓練內容與安全">
        <p>
          HoopKit
          提供一般籃球訓練資訊，不構成醫療診斷或個別專業建議。請依自身能力調整強度；如有疼痛、受傷或健康疑慮，請停止訓練並諮詢合格專業人員。
        </p>
      </LegalSection>
      <LegalSection title="帳號責任">
        <p>
          你應提供正確資料、妥善保管登入資訊並為帳號活動負責。不得嘗試存取他人資料、繞過權限或干擾服務。
        </p>
      </LegalSection>
      <LegalSection title="上傳內容">
        <p>
          你保留上傳影片的權利，並授權 HoopKit
          及必要服務商在提供上傳、轉碼、播放、備份與安全審查所需範圍處理內容。
        </p>
        <p>
          你必須擁有必要權利，不得上傳侵權、違法、危險、仇恨、色情、騷擾或侵犯隱私的內容。我們得依內容回報、法令或平台規範限制或移除內容。
        </p>
      </LegalSection>
      <LegalSection title="終止與聯絡">
        <p>
          你可以在 App
          中刪除帳號。我們也可能對重大或重複違規採取限制措施。條款或內容處理問題請寄至{" "}
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
