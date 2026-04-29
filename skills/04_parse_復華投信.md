# Skill 04：Parse 復華投信（HTTP GET xlsx 直讀）

## 技術分類
HTTP 直接下載 Excel 檔 + xlsx 套件解析（不需瀏覽器）

## 目標 API
```
GET https://www.fhtrust.com.tw/api/assetsExcel/{fhtrustCode}/{dateStr}
```

## 核心優勢
1. 復華投信提供 Excel 下載 API，完全不需瀏覽器。
2. 使用 `axios.get()` + `responseType: 'arraybuffer'` 取得二進位檔案。
3. 用 `xlsx` 套件（SheetJS）解析，穩定性極高。

## 解析策略（策略 A）

### 必要參數
| ETF 代碼 | fhtrustCode（復華內部代碼）|
|----------|--------------------------|
| 00991A   | ETF23                    |

### 日期格式
`YYYYMMDD`，如 `20260428`。使用與其他策略相同的交易日計算邏輯。

### 抓取流程
```javascript
const res = await axios.get(url, {
  responseType: 'arraybuffer',
  timeout: 30000,
  headers: { 'User-Agent': '...' }
});

const wb = xlsx.read(res.data, { type: 'buffer' });
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
```

### Excel 結構解析
1. 找到表頭列：遍歷所有列，找到含 `"證券代號"` 的列作為 `headerIdx`
2. 從 `headerIdx + 1` 開始逐列讀取資料
3. 遇到空列（`row[0]` 或 `row[1]` 為空）時停止

### 欄位對照
| 欄位索引 | 內容     | 清洗方式                |
|---------|---------|------------------------|
| row[0]  | 證券代號 | `String().trim()`      |
| row[1]  | 證券名稱 | `String().trim()`      |
| row[2]  | 持有股數 | 移除逗號 → `parseInt`   |
| row[3]  | 金額    | （不使用）              |
| row[4]  | 權重    | 移除 `%` → `parseFloat` |

### 過濾條件
- `stockCode` 非空
- `weight > 0 || shares > 0`

### 回傳格式
```javascript
[{ stockCode, stockName, shares, weight }, ...]
```

## 已知陷阱
1. 日期必須是有效交易日，否則 API 回傳空白 Excel（無表頭列）。此時 `findIndex` 回傳 -1，函式直接 return `null`。
2. 不同基金的 Excel 表頭位置可能不同（有的前幾列是基金簡介），需用 `"證券代號"` 搜尋定位，不能硬編碼行號。
3. 部分列的權重欄帶有 `%` 符號（如 `3.25%`），必須移除後再 `parseFloat`。

## 依賴套件
```json
{
  "xlsx": "用於解析 Excel binary"
}
```

## 檔案參考
- 實作：`src/scraper.js` → `fetchFhtrustXlsx()`
- 設定：`src/configs/targets.js` → `fhtrustCode` 欄位
