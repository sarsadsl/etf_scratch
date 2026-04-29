# ETF Tracker 技術技能索引

本目錄記錄此專案累積的所有技術知識，分為以下分類：

---

## 資料抓取（Scraper）

| # | 技能文件 | 投信/技術 | 抓取方式 | 需要瀏覽器 |
|---|---------|----------|---------|-----------|
| 01 | [Parse 統一投信](01_parse_統一投信.md) | 統一投信 ezmoney | Puppeteer DOM 解析 | 是 |
| 02 | [Parse 元大投信](02_parse_元大投信.md) | 元大投信 Nuxt | Puppeteer __NUXT__ State | 是 |
| 03 | [Parse 野村投信](03_parse_野村投信.md) | 野村投信 API | HTTP POST JSON | 否 |
| 04 | [Parse 復華投信](04_parse_復華投信.md) | 復華投信 API | HTTP GET Excel | 否 |
| 05 | [Parse 群益投信](05_parse_群益投信.md) | 群益投信 API | HTTP POST JSON | 否 |

---

## 資料處理

| # | 技能文件 | 涵蓋內容 |
|---|---------|---------|
| 10 | [比對引擎與資料歸檔](10_比對引擎與資料歸檔.md) | 持股差額計算、state.json 管理、日期邏輯、Puppeteer 共用瀏覽器 |

---

## 前端與 Dashboard

| # | 技能文件 | 涵蓋內容 |
|---|---------|---------|
| 06 | [Dashboard 建置](06_dashboard_建置.md) | Vite + React + Recharts + Chart.js、設計系統、功能列表 |
| 07 | [分頁與路由系統](07_分頁與路由系統.md) | HashRouter、頂層 Nav、產業分析分類篩選、新增文章步驟 |

---

## 基礎設施與部署

| # | 技能文件 | 涵蓋內容 |
|---|---------|---------|
| 08 | [Telegram 推播與 Worker](08_Telegram推播與Worker.md) | Bot API、Markdown 格式、Cloudflare Worker 密碼驗證轉發 |
| 09 | [GitHub Actions CI/CD](09_GitHub_Actions_CICD.md) | 排程設定、自動部署、自訂域名、安全機制 |

---

## 每份文件結構
每份技能文件統一包含以下段落：
1. **技術分類**：該技能所屬類型
2. **目標/端點**：具體 URL 或 API
3. **抓取/處理流程**：步驟拆解
4. **資料結構**：欄位對照表
5. **資料清洗規則**：特殊處理邏輯
6. **已知陷阱**：踩過的坑與解法
7. **檔案參考**：對應的原始碼位置
