# Skill 08：Telegram Bot 推播與 Cloudflare Worker 轉發

## 技術分類
Telegram Bot API + Cloudflare Workers（Serverless）

## 架構
```
                        ┌─ GitHub Actions (排程自動推播)
Telegram Bot API ←──────┤
                        └─ Cloudflare Worker ←── Dashboard 前端（手動推播）
```

---

## 一、GitHub Actions 自動推播（notifier.js）

### 設定
環境變數透過 GitHub Secrets 注入：
- `TELEGRAM_BOT_TOKEN`：Bot 的 API Token
- `TELEGRAM_CHAT_ID`：目標頻道或群組 ID

### API 端點
```
POST https://api.telegram.org/bot{token}/sendMessage
```

### 請求格式
```javascript
{
  chat_id: chatId,
  text: message,
  parse_mode: 'Markdown'
}
```

### 訊息格式設計
```
📊 主動式 ETF 持股異動報告 (2026/4/28)

🔹 00981A 主動統一台股增長
  #1 `2330` 台積電
     35.5% (🔺+0.5%) | 5000張 (+100)

  💤 今日前十大持股無任何增減變化
```

### 特殊處理
1. **Markdown 跳脫**：股票名稱中的特殊字元（`_`, `*`, `[`, `]`, `(`, `)` 等）必須用 `\\` 跳脫。
2. **張數換算**：`shares / 1000` 轉為張數顯示。小數張用 `.toFixed(1)`。
3. **黑名單**：特定 ETF 的特定股票可設定黑名單，過濾後不推播。
4. **`SKIP_TELEGRAM`**：環境變數設為 `true` 時跳過推播（用於本地測試）。

---

## 二、Cloudflare Worker 手動推播（前端觸發）

### 用途
讓 Dashboard 管理員從網頁 UI 直接發送 Telegram 廣播，不需要存取 GitHub Actions。

### 架構
```
Dashboard 前端 (POST) → Cloudflare Worker (驗證密碼) → Telegram Bot API
```

### Worker 端點
部署在 Cloudflare Workers，處理 CORS + 密碼驗證 + 轉發。

### 安全機制
1. **CORS**：`Access-Control-Allow-Origin: *`（上線後應限縮為 GitHub Pages 網域）
2. **密碼驗證**：前端傳入 `password`，Worker 比對 `env.ADMIN_PASSWORD`
3. **環境變數**：`BOT_TOKEN`, `CHANNEL_ID`, `ADMIN_PASSWORD` 存在 Cloudflare Worker Secrets

### Worker 程式碼摘要
```javascript
export default {
  async fetch(request, env) {
    const body = await request.json();
    if (body.password !== env.ADMIN_PASSWORD) {
      return new Response('身分驗證失敗', { status: 401 });
    }
    // 轉發至 Telegram
    await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      body: JSON.stringify({ chat_id: env.CHANNEL_ID, text: body.message })
    });
  }
};
```

## 已知注意事項
1. Telegram Markdown 格式與標準 Markdown 不同：不支援 `#` 標題、`**` 粗體用 `*` 替代。
2. 訊息長度上限 4096 字元，超過需分段發送。
3. Cloudflare Worker 免費方案每日 10 萬次請求，足夠使用。

## 檔案參考
- 自動推播：`src/notifier.js`
- Worker：`cloudflare-worker/worker.js`
- Dashboard 觸發：`dashboard/src/App.jsx`（管理員按鈕）
