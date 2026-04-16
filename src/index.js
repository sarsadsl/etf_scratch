import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { targets } from './configs/targets.js';
import { fetchHoldings } from './scraper.js';
import { compareHoldings } from './comparator.js';
import { sendTelegramNotification } from './notifier.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE = path.join(__dirname, '..', 'state.json');

async function main() {
  console.log('[System] 開始執行主動式 ETF 持股抓取任務...');
  
  // 1. 讀取前一日狀態
  let previousState = {};
  if (fs.existsSync(STATE_FILE)) {
    try {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      previousState = JSON.parse(raw || '{}');
    } catch (e) {
      console.warn('[System] 解析 state.json 失敗，將視為初次執行。');
    }
  }

  const newState = {};
  const notificationResults = [];

  // 2. 逐一抓取目標 ETF
  for (const target of targets) {
    console.log(`[System] 正在抓取: ${target.code} ${target.name}`);
    const currentHoldings = await fetchHoldings(target);
    
    if (currentHoldings && !currentHoldings.error) {
      // 比對差額
      const prevHoldings = previousState[target.code] || [];
      const comparedHoldings = compareHoldings(currentHoldings, prevHoldings);
      
      notificationResults.push({
        target,
        holdings: comparedHoldings
      });
      
      // 更新狀態 (僅存儲原始抓取資料)
      newState[target.code] = currentHoldings;
    } else {
      // 若抓取失敗，保留前一日狀態，避免隔日全部被判定為新增
      newState[target.code] = previousState[target.code] || [];
      
      notificationResults.push({
        target,
        holdings: null, // 代表失敗
        debugError: currentHoldings ? currentHoldings.message : 'Unknown exception / Promise failed',
        debugPayload: currentHoldings ? currentHoldings.debugInfo : null
      });
    }
  }

  // 3. 發送推播
  await sendTelegramNotification(notificationResults);

  // 4. 將今日抓取結果覆寫回狀態檔
  fs.writeFileSync(STATE_FILE, JSON.stringify(newState, null, 2), 'utf-8');
  console.log('[System] 狀態已更新至 state.json。任務完成。');
}

main().catch(error => {
  console.error('[System] 任務執行發生嚴重錯誤:', error);
  process.exit(1);
});
