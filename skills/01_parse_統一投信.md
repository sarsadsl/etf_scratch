# Skill 01：Parse 統一投信（ezmoney SPA）

## 技術分類
Puppeteer Headless 瀏覽器 + DOM 解析

## 目標網站
```
https://www.ezmoney.com.tw/ETF/Fund/Info?fundCode={ezmoneyCCode}
```

## 核心挑戰
1. ezmoney 是 SPA（Single Page Application），持股資料透過前端 JavaScript 動態渲染，非 SSR 輸出。
2. 必須使用無頭瀏覽器等待渲染完成後才能取得 DOM 內容。
3. 預設 DOM 需要等待約 5 秒才會完整渲染 `#assetBody` 的持股表格。

## 解析策略（策略 B）

### 必要參數
| ETF 代碼 | ezmoneyCCode（統一內部代碼）|
|----------|---------------------------|
| 00981A   | 49YTW                     |
| 00988A   | 61YTW                     |

### 抓取流程
1. Puppeteer 啟動 headless 瀏覽器（含 Stealth Plugin 繞過反爬蟲偵測）
2. `page.goto()` 導航至目標頁面，使用 `waitUntil: 'networkidle2'`
3. 強制等待 5 秒（`setTimeout`），讓前端 JavaScript 完成資料渲染
4. 透過 `page.evaluate()` 在頁面內執行 DOM 查詢

### DOM 選擇器
```javascript
const trs = document.querySelectorAll('#assetBody tr');
```
每一列 `<tr>` 包含 4 個 `<td>`：
| 欄位索引 | 內容     | 範例        |
|---------|---------|------------|
| tds[0]  | 股票代號 | 2330       |
| tds[1]  | 股票名稱 | 台積電*    |
| tds[2]  | 持有股數 | 1,234,000  |
| tds[3]  | 權重     | 9.01%      |

### 資料清洗規則
- `tds[1]`：移除名稱中的星號 `*`
- `tds[2]`：移除千分位逗號後 `parseInt`
- `tds[3]`：移除百分比符號 `%` 後 `parseFloat`
- 過濾條件：`tds[3].endsWith('%')` 且 `tds[0] !== '股票代號'` 且 `tds[0] !== '期貨(名目本金)'`（排除期貨/表頭）

### 回傳格式
```javascript
[{ stockCode, stockName, shares, weight }, ...]
```
按權重降序排列。

## 已知陷阱
1. `#assetBody` 表格偶爾會因網路延遲導致空白，需確保 `networkidle2` + `5s delay` 雙重等待。
2. 部分欄位會出現「期貨(名目本金)」列，該列結構相同但非持股資料，需以 `tds[0]` 排除。
3. 股票名稱偶有星號 `*` 後綴（代表特殊標記），清洗時一律移除。

## 檔案參考
- 實作：`src/scraper.js` → `fetchFsitcSpa()`
- 設定：`src/configs/targets.js` → `ezmoneyCCode` 欄位
