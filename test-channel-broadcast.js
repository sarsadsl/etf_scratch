// 檔案：test-channel-broadcast.js
// 讀取由 token.bat 匯入的環境變數
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

async function testBroadcastToChannel() {
  if (!BOT_TOKEN || BOT_TOKEN === '您的機器人TOKEN' || !BOT_TOKEN.trim()) {
    console.error('[環境錯誤] 請檢測 token.bat，您尚未填寫有效的 TELEGRAM_BOT_TOKEN');
    return;
  }
  if (!CHANNEL_ID || CHANNEL_ID === '@您的頻道名稱' || !CHANNEL_ID.trim()) {
    console.error('[環境錯誤] 請檢測 token.bat，您尚未填寫有效的 TELEGRAM_CHANNEL_ID');
    return;
  }

  const apiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: CHANNEL_ID,
    text: '系統通知：測試廣播連線。若您看到此訊息，代表網頁後端對頻道的發送權限已完全打通。'
  };

  try {
    console.log(`[執行] 正在嘗試發送訊息至 ${CHANNEL_ID}...`);
    
    // 使用 Node.js 18+ 內建的 fetch API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`狀態碼: ${response.status} | 錯誤原因: ${result.description}`);
    }

    console.log('[結果] 發送成功！請檢查您的 Telegram 頻道。');
  } catch (error) {
    console.error('[發送失敗]', error.message);
  }
}

testBroadcastToChannel();
