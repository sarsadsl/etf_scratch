# Skill 02：Parse 元大投信（Nuxt SSR State 提取）

## 技術分類
Puppeteer Headless 瀏覽器 + `window.__NUXT__` State 解析

## 目標網站
```
https://www.yuantaetfs.com/tradeInfo/pcf/{fundCode}
```

## 核心挑戰
1. 元大官網使用 Nuxt.js 框架，前端 DOM 僅顯示「前 5 名」持股（設計限制），但完整持股（53+ 筆）存在 SSR hydration state 中。
2. 不能依賴 DOM 解析，必須直接讀取 `window.__NUXT__` 物件。
3. 若 `__NUXT__` 資料不足（< 3 筆），自動回退至 MoneyDJ 備援。

## 解析策略（策略 C）

### 抓取流程
1. Puppeteer 導航至 PCF 頁面（`waitUntil: 'networkidle0'`）
2. 等待 3 秒讓 Nuxt hydration 完成
3. 在頁面內執行 `page.evaluate()`，存取 `window.__NUXT__`

### __NUXT__ 資料結構路徑
```
window.__NUXT__
  └── data (Array)
        └── [n] (遍歷找含 pcfData 的項目)
              └── pcfData
                    └── FundWeights
                          └── StockWeights (Array) ← 完整持股在此
```

### StockWeights 各欄位
| 原始欄位  | 對應輸出     | 說明                     |
|----------|-------------|-------------------------|
| s.code   | stockCode   | 含交易所後綴，需清洗       |
| s.name   | stockName   | 中文名稱（或 s.ename）    |
| s.qty    | shares      | 持有股數（字串，含逗號）    |
| s.weights| weight      | 權重百分比（數值）          |

### 資料清洗規則

#### 交易所後綴清除
原始 `code` 會帶交易所碼（如 `LITE US`、`285A JP`、`005930 KP`），使用正則清除：
```javascript
codeRaw.replace(/\s+(US|TW|HK|JP|KP|GR|FP|SG|KR|GB)$/i, '').trim()
```

#### 過濾條件
- `stockCode` 非空
- `weight > 0`

### 備援機制（MoneyDJ Fallback）
當 `__NUXT__` 持股不足 3 筆時，自動回退至 MoneyDJ：
```
https://www.moneydj.com/ETF/X/Basic/Basic0007.xdjhtm?etfid={code}.TW
```
MoneyDJ 使用傳統 DOM 解析（`table.datalist tr`），取表格第 2 列起的 3 欄（名稱/權重/股數），名稱欄需用正則 `/(.*?)/` 提取股票代碼。

### 回傳格式
```javascript
[{ stockCode, stockName, shares, weight }, ...]
```

## 已知陷阱
1. `window.__NUXT__` 結構版本不固定：`data` 可能是 Array，需遍歷找 `pcfData` 欄位，不能硬編碼索引。
2. DOM 只顯示前 5 名——這是設計如此，不是 Bug。全量資料只存在 `__NUXT__`。
3. 交易所後綴清單須持續維護，目前已涵蓋：US, TW, HK, JP, KP, GR, FP, SG, KR, GB。
4. 若元大官網改版 Nuxt 結構（如升級 Nuxt 3），`__NUXT__` 的路徑可能變更，需重新探勘。

## 踩坑紀錄
- 最初使用 DOM 的 `.expandBtn` 嘗試展開完整持股，但在 headless mode 下該按鈕行為不穩定，改為直接讀取 `__NUXT__` 後解決。
- 00990A 的資料更新時間點是 T+1（如 4/28 的資料在 4/29 才會出現在 4/27 的日期下），需特別注意日期對齊邏輯。

## 檔案參考
- 實作：`src/scraper.js` → `fetchYuantaOfficial()` + `fetchMoneyDjHoldings()`
- 設定：`src/configs/targets.js` → `issuer: '元大投信'`
