import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { targets } from './configs/targets.js';
import { fetchHoldings, closeBrowser } from './scraper.js';
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
  const dashboardState = {};
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
      
      // 更新狀態 (state.json 保持原始資料)
      newState[target.code] = currentHoldings;
      // 為 Dashboard 準備包含差額的資料
      dashboardState[target.code] = comparedHoldings;
    } else {
      // 若抓取失敗，保留前一日狀態
      newState[target.code] = previousState[target.code] || [];
      dashboardState[target.code] = previousState[target.code] || [];
      
      notificationResults.push({
        target,
        holdings: null, // 代表失敗
        debugError: currentHoldings ? currentHoldings.message : 'Unknown exception / Promise failed',
        debugPayload: currentHoldings ? currentHoldings.debugInfo : null
      });
    }
  }

  // 3. 關閉共用瀏覽器
  await closeBrowser();

  // 4. 發送推播
  await sendTelegramNotification(notificationResults);

  // 5. 將今日抓取結果覆寫回狀態檔
  fs.writeFileSync(STATE_FILE, JSON.stringify(newState, null, 2), 'utf-8');

  // 新增：儲存至歷史資料庫 (data/YYYYMMDD.json)
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }
  const dateStr = new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' }).replace(/\//g, '');
  const historyFile = path.join(dataDir, `${dateStr}.json`);
  fs.writeFileSync(historyFile, JSON.stringify(dashboardState, null, 2), 'utf-8');

  // 新增：寫入 Dashboard 公開目錄供前端提取 (Static Site)
  const dashboardDataDir = path.join(__dirname, '..', 'dashboard', 'public', 'data');
  if (!fs.existsSync(dashboardDataDir)) {
    fs.mkdirSync(dashboardDataDir, { recursive: true });
  }
  // 複製包含 diffs 的狀態至 Dashboard
  fs.writeFileSync(path.join(dashboardDataDir, 'latest.json'), JSON.stringify(dashboardState, null, 2), 'utf-8');
  fs.writeFileSync(path.join(dashboardDataDir, `${dateStr}.json`), JSON.stringify(dashboardState, null, 2), 'utf-8');

  // 生成歷史日期選單 (index.json)
  const historyListPath = path.join(dashboardDataDir, 'index.json');
  let historyList = [];
  if (fs.existsSync(historyListPath)) {
    try { historyList = JSON.parse(fs.readFileSync(historyListPath, 'utf-8')); } catch(e){}
  }
  if (!historyList.includes(dateStr)) {
    historyList.push(dateStr);
    historyList.sort((a, b) => b.localeCompare(a)); // Descending
    fs.writeFileSync(historyListPath, JSON.stringify(historyList, null, 2), 'utf-8');
  }

  console.log('[System] 狀態已更新至 state.json, data 資料夾，並已同步至 Dashboard。任務完成。');
}

main().catch(error => {
  console.error('[System] 任務執行發生嚴重錯誤:', error);
  process.exit(1);
});
