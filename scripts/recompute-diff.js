/**
 * 修復工具：對任意兩份歷史快照重新計算 diff 並寫回指定目標日期
 * 用法：node scripts/recompute-diff.js <targetDate> <prevDate>
 * 例如：node scripts/recompute-diff.js 2026421 2026420
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { compareHoldings } from '../src/comparator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA  = path.join(__dirname, '..', 'data');
const DASH  = path.join(__dirname, '..', 'dashboard', 'public', 'data');

const [,, targetDate, prevDate] = process.argv;
if (!targetDate || !prevDate) {
  console.error('Usage: node scripts/recompute-diff.js <targetDate> <prevDate>');
  process.exit(1);
}

// 讀取原始快照（data/ 目錄，state.json 格式，沒有 diff 欄位的才是乾淨的）
// 但 data/ 裡的也已被 dashboard 格式覆蓋，所以改從 state.json 讀 targetDate 原始股數
// 重新爬蟲太慢，改用 dashboard/public/data/{targetDate}.json 的 shares 欄位（仍保存原始 shares）
// 與 {prevDate}.json 的 shares 欄位做 diff

const targetPath = path.join(DASH, `${targetDate}.json`);
const prevPath   = path.join(DASH, `${prevDate}.json`);

if (!fs.existsSync(targetPath)) { console.error('找不到目標日期檔案:', targetPath); process.exit(1); }
if (!fs.existsSync(prevPath))   { console.error('找不到前一日期檔案:', prevPath); process.exit(1); }

const targetData = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
const prevData   = JSON.parse(fs.readFileSync(prevPath,   'utf-8'));

// 從帶 diff 欄位的 JSON 中剝離出只有 stockCode/stockName/shares/weight 的原始陣列
function stripDiff(holdings) {
  return holdings.map(h => ({ stockCode: h.stockCode, stockName: h.stockName, shares: h.shares, weight: h.weight }));
}

const fixed = {};
for (const etfCode of Object.keys(targetData)) {
  const currRaw  = stripDiff(targetData[etfCode] || []);
  const prevRaw  = stripDiff(prevData[etfCode]   || []);
  fixed[etfCode] = compareHoldings(currRaw, prevRaw);
}

// 覆寫 dashboard 目錄的日期快照
fs.writeFileSync(targetPath, JSON.stringify(fixed, null, 2), 'utf-8');
// 同步覆寫 data/ 目錄
const dataTargetPath = path.join(DATA, `${targetDate}.json`);
if (fs.existsSync(dataTargetPath)) fs.writeFileSync(dataTargetPath, JSON.stringify(fixed, null, 2), 'utf-8');
// 如果是最新日期，也更新 latest.json
const indexPath = path.join(DASH, 'index.json');
const indexList = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
if (indexList[0] === targetDate) {
  fs.writeFileSync(path.join(DASH, 'latest.json'), JSON.stringify(fixed, null, 2), 'utf-8');
  console.log('已同步更新 latest.json');
}

// 統計有異動的股票數
for (const etfCode of Object.keys(fixed)) {
  const changed = fixed[etfCode].filter(s => s.diffShares !== 0 || s.diffWeight !== 0 || s.isNew);
  console.log(`[${etfCode}] 異動股票數: ${changed.length} / ${fixed[etfCode].length}`);
}
console.log(`✅ 完成：${targetDate} vs ${prevDate} 的 diff 已重新計算並寫回。`);
