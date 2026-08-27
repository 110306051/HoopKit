# HoopKit Database、Auth 與 Admin 開發指南

## Admin 到底是什麼？

`apps/admin` 是給 HoopKit 內部內容團隊使用的「管理介面」，不是後端。

內容編輯者不適合每天手寫 SQL 或直接改 production database，因此 Admin
會逐步提供球員、招式、影片片段與公開訓練菜單的表單、預覽和發布流程。
目前完成的是第一個基礎切片：登入、保護路由、角色授權和內容總覽。

```text
Admin（操作畫面）
  │  Supabase Auth：Email / Password 登入、取得 access token
  │
  └── Bearer access token
        ↓
NestJS API（驗證身分、角色、商業規則）
        ↓
Supabase
  ├── Auth：帳號、密碼雜湊、Session、JWT
  └── PostgreSQL：內容、角色、收藏、自定義訓練菜單
```

重要邊界：

- Admin 只拿 publishable key，不能拿 service-role key。
- NestJS 的 service-role key 僅存在 server 環境，絕不能放入
  `NEXT_PUBLIC_*` 或 `EXPO_PUBLIC_*`。
- API 不是只做「轉送 CRUD」。它負責權限、驗證、跨資料表交易、Mux
  webhook、發布規則，以及日後計費或審核等不可相信 client 的邏輯。
- PostgreSQL RLS 是最後一道資料列權限防線，即使 client 直接呼叫
  Supabase Data API，仍只能讀寫 policy 允許的資料。

## 目前的資料庫結構

Schema 的唯一版本來源是 `supabase/migrations/`，不是某一台電腦上的
Docker volume。

| 群組       | 資料表                                                                        | 用途                                    |
| ---------- | ----------------------------------------------------------------------------- | --------------------------------------- |
| 帳號       | `profiles`, `user_roles`                                                      | App 個人資料與 `user/editor/admin` 授權 |
| 內容分類   | `players`, `skill_categories`, `tags`                                         | 球員、技能分類、標籤                    |
| 招式       | `moves`, `move_players`, `move_tags`, `move_steps`                            | 招式詳細內容與關聯                      |
| 影片       | `media_assets`, `highlight_clips`                                             | Mux/Supabase 資產資料與片段時間範圍     |
| 公開菜單   | `workout_templates`, `workout_template_sections`, `workout_template_items`    | 可被使用者匯入的官方訓練模板            |
| 個人資料   | `favorite_moves`, `favorite_workout_templates`                                | 使用者收藏                              |
| 自定義菜單 | `user_workout_plans`, `user_workout_plan_sections`, `user_workout_plan_items` | 使用者自己的訓練菜單                    |

公開內容採 `draft → published → archived` 狀態。一般訪客只看得到
`published`；`editor/admin` 可以預覽草稿及管理內容。個人訓練菜單永遠用
`auth.uid()` 限制為擁有者本人。

## Seed 是什麼？

Seed 是「重建環境時自動放入的初始/示範資料」，不是 schema。

- Migration 建立資料表、欄位、索引、constraint、function 與 RLS policy。
- `supabase/seed.sql` 只執行 `insert`，目前放入虛構球員、基礎交叉運球及
  一份公開控球菜單。
- `pnpm.cmd db:reset` 會清空本機資料庫、依序重跑 migrations，最後再跑
  seed。因此你手動新增的本機資料會被清除。
- Seed 必須可重複、可提交、不可包含 production 個資或真正密碼。

Supabase Auth 的可登入帳號不放進 seed。請使用下方的本機 Admin 指令建立，
因為 Auth user 不只是 `auth.users` 一列資料，還涉及密碼雜湊與 Auth 服務流程。

## 第一次啟動

1. 啟動 Docker Desktop，確認 Linux engine 正常。
2. 在 repo 根目錄執行：

   ```powershell
   pnpm.cmd db:start
   pnpm.cmd db:status
   ```

3. 將 `db:status` 顯示的 `PUBLISHABLE_KEY` 填到：

   - `apps/admin/.env.local`
   - `apps/api/.env` 的 `SUPABASE_PUBLISHABLE_KEY`

4. 將 `SERVICE_ROLE_KEY` 只填到 `apps/api/.env`。
5. 建立本機 Admin：

   ```powershell
   pnpm.cmd admin:create-local
   ```

   指令會建立 `admin@hoopkit.local`，自動產生強密碼並只在 Terminal
   顯示一次。若要指定帳號或密碼：

   ```powershell
   $env:LOCAL_ADMIN_EMAIL = "you@example.com"
   $env:LOCAL_ADMIN_PASSWORD = "請使用符合規則的本機密碼"
   pnpm.cmd admin:create-local
   ```

6. 分別啟動：

   ```powershell
   pnpm.cmd --filter @hoopkit/api dev
   pnpm.cmd --filter @hoopkit/admin dev
   ```

7. 開啟 `http://localhost:3000/login`。

每次 `pnpm.cmd db:reset` 都會清掉本機 Auth user，所以要重新執行
`pnpm.cmd admin:create-local`。

## 如何查看 schema 與操作資料？

### Supabase Studio（最適合剛開始）

啟動 Supabase 後開啟 `http://localhost:54323`：

- **Table Editor**：查看 `public` schema 的 tables、columns、rows 與關聯。
- **Database → Schema Visualizer**：用關聯圖查看 foreign keys。
- **SQL Editor**：執行查詢，例如：

  ```sql
  select id, slug, name, status
  from public.moves
  order by created_at desc;
  ```

- **Authentication → Users**：查看 Auth 帳號。注意：這和
  `public.profiles`、`public.user_roles` 是不同層。

Studio 很適合查資料與實驗 SQL，但正式 schema 變更仍應寫入 migration，
否則其他開發者和部署環境無法重建相同狀態。

### 直接連 PostgreSQL

本機連線字串預設為：

```text
postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

可使用 VS Code PostgreSQL extension、DBeaver、DataGrip 或 `psql`。連線工具
只是一個資料庫 client，不會取代 migrations。

### 查看程式碼中的 schema

- 基礎 Profile：
  `supabase/migrations/20260713000000_initial_foundation.sql`
- 核心內容與菜單：
  `supabase/migrations/20260730000000_core_training_schema.sql`
- 示範資料：`supabase/seed.sql`

## 日常修改 schema 的流程

```powershell
# 1. 建立空 migration
pnpm.cmd exec supabase migration new add_move_variations

# 2. 編寫新產生的 SQL 檔

# 3. 從零重建，驗證全部 migrations + seed
pnpm.cmd db:reset

# 4. 檢查常見安全/效能問題
pnpm.cmd db:lint

# 5. 執行整個 monorepo 品質檢查
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd build
```

不要修改已經部署過的舊 migration；建立新的 migration 描述變更。正式環境則
使用 `supabase db push` 套用尚未執行的 migrations，絕對不要對 production
執行會清空資料的 `db reset`。

## Auth 與 API

目前 API：

| Method | Path                                  | 權限           | 用途                                            |
| ------ | ------------------------------------- | -------------- | ----------------------------------------------- |
| GET    | `/v1/health/live`                     | 公開           | Process liveness                                |
| GET    | `/v1/auth/me`                         | 已登入         | 驗證 token 並回傳 id/email/role                 |
| GET    | `/v1/admin/dashboard`                 | `editor/admin` | 回傳內容數量總覽                                |
| GET    | `/v1/admin/content`                   | `editor/admin` | 組合球員、招式、步驟、菜單與媒體內容            |
| GET    | `/v1/admin/players`                   | `editor/admin` | 列出所有球員（包含草稿與封存）                  |
| GET    | `/v1/admin/players/:id`               | `editor/admin` | 讀取單一球員                                    |
| POST   | `/v1/admin/players`                   | `editor/admin` | 建立球員                                        |
| PUT    | `/v1/admin/players/:id`               | `editor/admin` | 更新、發布或封存球員                            |
| GET    | `/v1/admin/media`                     | `editor/admin` | 列出媒體、處理狀態與錯誤資訊                    |
| POST   | `/v1/admin/media/images/upload-url`   | `editor/admin` | 建立圖片紀錄與 Supabase 一次性上傳 token        |
| POST   | `/v1/admin/media/images/:id/complete` | `editor/admin` | 圖片上傳後寫入公開 URL、尺寸與 ready 狀態       |
| POST   | `/v1/admin/media/videos/upload-url`   | `editor/admin` | 建立 Mux Direct Upload URL                      |
| POST   | `/v1/webhooks/mux`                    | Mux 簽章       | 接收轉碼 ready/error 狀態（公開路由但強制驗簽） |

登入本身由 Admin 呼叫 Supabase Auth 的 `signInWithPassword()`。API 收到
`Authorization: Bearer <access_token>` 後，使用 `getUser(token)` 向 Auth
server 驗證真實身分，再用 server-only client 讀取角色。第一版選擇每次向
Auth server 驗證以獲得直觀且立即的撤銷行為；流量變大後可以改為本機
JWKS/claims 驗證與短期快取，同時明確處理 session 撤銷延遲。

Admin 的 Next.js Proxy 會刷新 Cookie 內的 session。受保護頁面仍會在 Server
Component 再檢查 claims；只在瀏覽器藏按鈕不算授權。

## 目前 Admin 內容功能

- `/dashboard`：內容筆數、資料查詢狀態與工作流入口。
- `/library`：查看 Database 中的球員、招式全文、動作步驟、Highlight
  Clips、公開菜單 sections/items，以及圖片/影片欄位。
- `/players`：球員列表與發布狀態。
- `/players/new`：建立草稿或已發布球員。
- `/players/:id/edit`：修改、發布或封存球員。
- `/media`：上傳圖片或影片、查看進度、錯誤、metadata、縮圖與播放預覽。

球員建立／編輯頁可直接選擇本機圖片。它會共用媒體中心的 signed-upload
流程，把檔案存入 `content-images` bucket、建立一筆 `media_assets`，再把完成
後的公開 URL 填入 `players.avatar_path`；管理員仍需按「儲存球員」才會完成
球員資料更新。這是過渡模型，後續可新增 `players.avatar_asset_id` foreign key
與媒體選擇器，避免只靠 URL 表示關聯。

媒體中心是獨立素材庫。單純上傳媒體不會自動綁定球員、招式或菜單；內容
編輯器必須再選擇該資產。招式封面、菜單封面已在 schema 使用
`cover_asset_id`，Highlight Clip 使用 `media_asset_id`；對應的完整編輯 UI
仍待實作。

圖片會使用 API 建立的 signed upload token 直接傳至公開的
`content-images` bucket；bucket 仍限制 MIME type 與 10 MB 上限。影片 bytes
不經 NestJS，而是使用 Mux Direct Upload URL 從瀏覽器直接傳到 Mux。

在 `apps/api/.env` 設定以下 server-only 變數後，影片上傳才會啟用：

```dotenv
MUX_TOKEN_ID=...
MUX_TOKEN_SECRET=...
MUX_WEBHOOK_SECRET=...
MUX_CORS_ORIGIN=http://localhost:3000
```

Mux webhook URL 是 `https://<你的公開-api-host>/v1/webhooks/mux`。本機 API
不能直接被 Mux 呼叫；端到端測試時需以安全 tunnel 暴露 port 3001，再把該
HTTPS URL 設定至 Mux。`MUX_WEBHOOK_SECRET` 是 webhook endpoint 的 signing
secret，不是 API token secret。
