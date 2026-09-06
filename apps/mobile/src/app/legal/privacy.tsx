import {
  MobileLegalDocument,
  MobileLegalSection,
} from "@/components/mobile-legal-document";

export default function PrivacyScreen() {
  const email = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? "support@hoopkit.app";
  return (
    <MobileLegalDocument title="隱私權政策">
      <MobileLegalSection title="我們處理的資料">
        HoopKit 會處理帳號
        Email、顯示名稱、收藏、個人菜單、訓練紀錄，以及你主動上傳的影片、描述與標籤。
      </MobileLegalSection>
      <MobileLegalSection title="用途與服務商">
        資料用於登入、同步訓練內容、影片轉碼與播放、內容回報及服務穩定性。基礎服務包含
        Supabase、Mux，並可能使用 Sentry 處理錯誤資訊。
      </MobileLegalSection>
      <MobileLegalSection title="你的選擇">
        你可以在帳號頁永久刪除帳號與個人內容。隱私權問題請聯絡 {email}。
      </MobileLegalSection>
    </MobileLegalDocument>
  );
}
