import {
  MobileLegalDocument,
  MobileLegalSection,
} from "@/components/mobile-legal-document";

export default function TermsScreen() {
  const email = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? "support@hoopkit.app";
  return (
    <MobileLegalDocument title="服務條款">
      <MobileLegalSection title="訓練安全">
        HoopKit
        提供一般訓練資訊，不構成醫療診斷。請依自身能力調整強度；若疼痛或不適，請停止並尋求合格專業協助。
      </MobileLegalSection>
      <MobileLegalSection title="上傳內容">
        你必須擁有上傳影片所需權利，不得上傳侵權、違法、危險、騷擾或侵犯隱私的內容。必要時我們可能限制或移除內容。
      </MobileLegalSection>
      <MobileLegalSection title="帳號與聯絡">
        請妥善保管登入資訊，不得繞過權限或干擾服務。條款問題請聯絡 {email}。
      </MobileLegalSection>
    </MobileLegalDocument>
  );
}
