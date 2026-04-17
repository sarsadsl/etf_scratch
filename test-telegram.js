import 'dotenv/config'; // 自動載入 .env
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendTelegramNotification } from './src/notifier.js';
import { targets } from './src/configs/targets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTest() {
  console.log("=== Telegram 推播本地測試 ===");
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    console.error("❌ 找不到 TELEGRAM_BOT_TOKEN 或 TELEGRAM_CHAT_ID。");
    console.error("請在專案根目錄建立 `.env` 檔案，並填入：\nTELEGRAM_BOT_TOKEN=xxx\nTELEGRAM_CHAT_ID=xxx");
    return;
  }

  console.log("✔️ 成功讀取環境變數");
  
  // 讀取目前的 latest.json 作為測試資料發送
  const latestPath = path.join(__dirname, 'dashboard', 'public', 'data', 'latest.json');
  if (!fs.existsSync(latestPath)) {
    console.error("❌ 找不到 latest.json 測試資料");
    return;
  }

  const latestData = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
  const mockResults = [];

  for (const target of targets) {
    const holdings = latestData[target.code];
    if (holdings) {
      // 擷取前 10 名作展示即可，避免洗屏
      mockResults.push({
        target,
        holdings: holdings.slice(0, 10)
      });
    }
  }

  console.log("🚀 正準備推播資料至 Telegram...");
  await sendTelegramNotification(mockResults);
  console.log("✅ 測試腳本執行完畢！請去 Telegram 確認是否收到。");
}

runTest();
