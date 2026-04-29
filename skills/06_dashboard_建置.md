# Skill 06：Dashboard 建置（Vite + React + Recharts）

## 技術分類
前端單頁應用（SPA），部署至 GitHub Pages

## 技術棧
| 用途      | 技術                          |
|----------|------------------------------|
| 建置工具  | Vite                         |
| UI 框架   | React 18                     |
| ETF 圖表  | Recharts（BarChart, PieChart）|
| 產業圖表  | Chart.js + react-chartjs-2   |
| 圖示      | lucide-react                 |
| 路由      | react-router-dom (HashRouter)|
| 部署      | GitHub Pages                 |
| CI/CD    | GitHub Actions               |

## 專案結構
```
dashboard/
├── public/
│   ├── data/             ← scraper 產出的 JSON 放這裡
│   │   ├── index.json    ← 歷史日期選單
│   │   ├── latest.json   ← 最新一期資料
│   │   └── 20260428.json ← 各日期資料檔
│   └── CNAME             ← 自訂網域檔
├── src/
│   ├── main.jsx          ← 進入點（含 HashRouter）
│   ├── App.jsx           ← 主元件（ETF 追蹤 + 頂層 Nav）
│   ├── index.css         ← 全站 CSS 設計系統
│   └── pages/
│       ├── IndustryIndex.jsx ← 產業分析文章列表
│       └── BmcPage.jsx       ← BMC 分析文章
├── vite.config.js
└── package.json
```

## 資料載入機制
1. 啟動時 fetch `data/index.json` 取得所有可用日期
2. 預設載入最新日期的 JSON 檔
3. 使用者切換日期時，fetch 對應的 `data/{dateStr}.json`
4. 比對前後日資料計算差額（由 scraper 預先計算）

## 設計系統
- 背景：深色主題（`#0B1120`）
- 文字層級：`#F1F5F9` / `#94A3B8` / `#475569`
- 強調色：`--accent-blue: #3B82F6`
- 卡片：glassmorphism 效果（`backdrop-filter: blur()`）
- 圖表色彩：每檔 ETF 有獨立色系（定義在 `ETF_META`）

## 功能列表
1. **ETF 追蹤**：單檔持股列表、權重長條圖、持股變化標記
2. **聚合檢視**：跨 ETF 資金吸引力排名
3. **ETF 篩選器**：多選勾選，狀態持久化至 localStorage
4. **歷史日期切換**：下拉選單，載入任一天的快照
5. **角色系統**：訪客 / 會員 / 管理員（DevTools 模擬）
6. **Telegram 廣播**：管理員可從網頁直接發送推播

## 部署流程
透過 GitHub Actions 在每次 push 或每日排程後自動執行：
```yaml
- name: Build Dashboard (Vite)
  run: cd dashboard && npm ci && npm run build

- name: Deploy to GitHub Pages
  uses: peaceiris/actions-gh-pages@v3
  with:
    publish_dir: ./dashboard/dist
    cname: stocktrack.morningjoy.cc
```

## 已知注意事項
1. `vite.config.js` 的 `base` 設定需與 GitHub repo 名稱一致（若使用 custom domain 則設為 `/`）。
2. `CNAME` 檔案必須放在 `public/` 下，Vite build 時會自動複製到 `dist/`。
3. Chart.js 混合圖表（Bar + Line）在 production build 中需明確註冊 `LineController` 和 `BarController`，dev mode 不會報錯但 production 會白屏。

## 檔案參考
- 進入點：`dashboard/src/main.jsx`
- 主元件：`dashboard/src/App.jsx`
- 設計系統：`dashboard/src/index.css`
- 部署設定：`.github/workflows/daily-scraper.yml`
