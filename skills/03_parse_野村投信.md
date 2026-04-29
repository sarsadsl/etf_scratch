# Skill 03：Parse 野村投信（REST API POST）

## 技術分類
HTTP API 直接呼叫（不需瀏覽器）

## 目標 API
```
POST https://www.nomurafunds.com.tw/API/ETFAPI/api/Fund/GetFundTradeInfo
```

## 核心優勢
1. 野村投信提供公開 REST API，不需要 Puppeteer。
2. 直接用 `axios.post()` 呼叫，速度最快、最穩定的策略之一。
3. 回傳結構化 JSON，不需 DOM 解析。

## 解析策略（策略 D）

### 請求格式
```javascript
axios.post(url, {
  FundNo: fundCode,   // 如 '00980A'
  Date: dateStr        // 格式 'YYYY/MM/DD'，如 '2026/04/28'
}, {
  headers: {
    'User-Agent': '...',
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Referer': 'https://www.nomurafunds.com.tw/'
  },
  timeout: 30000
})
```

### 日期計算邏輯
與其他策略共用同一套交易日計算規則：
1. 取得當前 UTC 時間，加 8 小時轉台灣時間
2. 若台灣時間未到 15:00，往前退一天
3. 跳過週六日
4. 格式化為 `YYYY/MM/DD`

### 回傳 JSON 結構
```
res.data
  └── Entries
        └── Stocks (Array)
```
若 `Entries.Stocks` 不存在，則嘗試 `res.data` 本身（Array 型態）。

### Stocks 欄位對照
| API 欄位                        | 對應輸出     |
|--------------------------------|-------------|
| CStockCode / CStocNo           | stockCode   |
| CStockName / CStocName         | stockName   |
| CQuantity / CShares            | shares      |
| CWeightsPct / CProportion      | weight      |

> 使用 `??` 運算子做欄位名稱相容（API 曾在不同 fund 回傳不同欄位名）。

### 資料清洗規則
- `shares`：移除逗號後 `parseInt`
- `weight`：直接 `parseFloat`
- 過濾：`stockCode` 非空 且 `weight > 0 || shares > 0`

### 回傳格式
```javascript
[{ stockCode, stockName, shares, weight }, ...]
```

## 已知陷阱
1. API 的 Stocks 欄位名稱不穩定：不同基金可能用 `CStockCode` vs `CStocNo`，必須用 `??` 雙重匹配。
2. `Date` 參數格式必須帶斜線 `YYYY/MM/DD`，非 `YYYYMMDD`。
3. `Referer` header 必須設定為 `https://www.nomurafunds.com.tw/`，否則 API 可能回 403。

## 適用 ETF
| 代碼    | 名稱             |
|--------|-----------------|
| 00980A | 主動野村台灣優選  |
| 00985A | 主動野村台灣50    |

## 檔案參考
- 實作：`src/scraper.js` → `fetchNomuraApi()`
- 設定：`src/configs/targets.js` → `issuer: '野村投信'`
