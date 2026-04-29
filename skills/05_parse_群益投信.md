# Skill 05：Parse 群益投信（REST API POST）

## 技術分類
HTTP API 直接呼叫（不需瀏覽器）

## 目標 API
```
POST https://www.capitalfund.com.tw/CFWeb/api/etf/buyback
```

## 核心優勢
1. 群益投信提供公開 REST API。
2. 直接用 `axios.post()` 呼叫，不需瀏覽器。
3. 回傳結構化 JSON。

## 解析策略（策略 E）

### 必要參數
需維護群益的 `fundId` 對照表：
```javascript
const CAPITAL_FUND_ID_MAP = {
  '00982A': 399,
};
```
群益使用內部的數字 `fundId` 而非 ETF 代碼，必須手動查詢對應。

### 請求格式
```javascript
axios.post(url, { fundId: 399 }, {
  headers: {
    'User-Agent': '...',
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Referer': 'https://www.capitalfund.com.tw/etf/product/detail/399/portfolio'
  },
  timeout: 30000
})
```

### 回傳 JSON 結構
```
res.data
  └── data
        └── stocks (Array)
```

### Stocks 欄位對照
| API 欄位  | 對應輸出     | 清洗方式              |
|----------|-------------|----------------------|
| stocNo   | stockCode   | `String().trim()`    |
| stocName | stockName   | `String().trim()`    |
| share    | shares      | 移除逗號 → `parseInt` |
| weight   | weight      | `parseFloat`         |

### 過濾條件
- `stockCode` 非空
- `weight > 0 || shares > 0`

### 回傳格式
```javascript
[{ stockCode, stockName, shares, weight }, ...]
```

## 已知陷阱
1. 群益使用數字 `fundId` 而非 ETF 代碼，新增基金時需先到官網查詢正確的 `fundId`，手動更新 `CAPITAL_FUND_ID_MAP`。
2. `Referer` header 的 URL 路徑需包含正確的 fundId，否則可能回 403。
3. 此 API 不需要傳入日期參數，預設回傳最新一期持股。

## 適用 ETF
| 代碼    | 名稱             | fundId |
|--------|-----------------|--------|
| 00982A | 主動群益台灣強棒  | 399    |

## 檔案參考
- 實作：`src/scraper.js` → `fetchCapitalApi()`
- 設定：`src/scraper.js` → `CAPITAL_FUND_ID_MAP`
- 目標：`src/configs/targets.js` → `issuer: '群益投信'`
