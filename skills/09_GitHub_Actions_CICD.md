# Skill 09：GitHub Actions CI/CD 排程與部署

## 技術分類
CI/CD 自動化排程（GitHub Actions）

## 工作流程檔案
`.github/workflows/daily-scraper.yml`

## 觸發條件
```yaml
on:
  push:
    branches: [main]         # 每次 push 到 main 觸發（僅 build + deploy）
  schedule:
    - cron: '30 10 * * *'    # UTC 10:30 = 台灣時間 18:30（每日執行）
  workflow_dispatch:          # 手動觸發
```

## 執行流程

### Step 1：Checkout
```yaml
- uses: actions/checkout@v4
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
```

### Step 2：Setup Node.js
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
```

### Step 3：Install + Run Scraper
```yaml
- run: npm ci || npm install
- run: npm start
  env:
    TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
    TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
```
重點：**只在非 push 觸發時執行 scraper**（`if: github.event_name != 'push'`），避免 push 時重複抓取。

### Step 4：Commit & Push 資料
```yaml
- run: |
    git add state.json data/ dashboard/public/data/
    if ! git diff --staged --quiet; then
      git commit -m "chore: update ETF state & data [skip ci]"
    fi
- uses: ad-m/github-push-action@master
```
關鍵技巧：
- commit message 包含 `[skip ci]`，防止自身 push 觸發無限循環
- 使用 `git diff --staged --quiet` 判斷是否有實際變更

### Step 5：Build Dashboard
```yaml
- run: cd dashboard && npm ci && npm run build
```

### Step 6：Deploy to GitHub Pages
```yaml
- uses: peaceiris/actions-gh-pages@v3
  with:
    publish_dir: ./dashboard/dist
    cname: stocktrack.morningjoy.cc   # 自訂域名
```

## 自訂域名設定

### GitHub 端
1. `dashboard/public/CNAME` 檔案內容：`stocktrack.morningjoy.cc`
2. `peaceiris/actions-gh-pages` 加 `cname` 參數（防止部署時覆蓋）

### Cloudflare 端
1. DNS 新增 CNAME 記錄：`stocktrack` → `sarsadsl.github.io`
2. Proxy 模式設為 **DNS only（灰色雲朵）**
3. 等待 GitHub Pages 自動簽發 HTTPS 憑證

## 資料檔案輸出

| 檔案路徑                        | 用途                        |
|--------------------------------|----------------------------|
| `state.json`                   | 原始持股狀態（供下次比對用）   |
| `data/{dateStr}.json`          | 歷史快照                    |
| `dashboard/public/data/latest.json` | Dashboard 預設載入         |
| `dashboard/public/data/{dateStr}.json` | Dashboard 歷史查詢       |
| `dashboard/public/data/index.json`   | 可用日期選單              |

## 安全機制
- `token.bat`、`.env` 已加入 `.gitignore`
- 所有敏感資訊透過 GitHub Secrets 注入
- `GITHUB_TOKEN` 為 Actions 內建 token

## 已知注意事項
1. `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` 環境變數用於強制使用 Node 24 runtime。
2. Puppeteer 在 Ubuntu runner 需要 `--no-sandbox`, `--disable-setuid-sandbox` 參數。
3. 若 scraper 全部 ETF 都失敗，不會將當天日期登錄到 `index.json`（防止產生空殼日期）。

## 檔案參考
- 工作流程：`.github/workflows/daily-scraper.yml`
- 主程式：`src/index.js`
- CNAME：`dashboard/public/CNAME`
