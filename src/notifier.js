import axios from 'axios';

/**
 * 將比對結果格式化並發送至 Telegram
 * @param {Array} results - 包含多檔 ETF 比對結果的陣列
 */
export async function sendTelegramNotification(results) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('[Notifier] 尚未設定 TELEGRAM_BOT_TOKEN 或 TELEGRAM_CHAT_ID，跳過發送推播。');
    return;
  }

  const today = new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' });
  let message = `📊 *主動式 ETF 持股異動報告* (${today})\n\n`;

  results.forEach(result => {
    message += `🔹 *${result.target.code} ${result.target.name}*\n`;
    
    if (!result.holdings || result.holdings.length === 0) {
      message += `  ⚠️ 抓取失敗或無資料\n`;
      if (result.debugError) {
        message += `  🔴 *Debug*: \`${result.debugError}\`\n`;
      }
      if (result.debugPayload && result.debugPayload.title) {
        message += `  💬 *Page Title*: ${result.debugPayload.title}\n`;
      }
      message += '\n';
      return;
    }

    result.holdings.forEach((stock, index) => {
      // 判斷增減符號
      let weightIcon = '➖';
      let sharesIcon = '';
      if (stock.diffWeight > 0) weightIcon = '🔺';
      if (stock.diffWeight < 0) weightIcon = '🔻';
      if (stock.diffShares > 0) sharesIcon = '+';
      
      const newTag = stock.isNew ? ' 🆕' : '';
      
      const sharesLot = Math.round(stock.shares / 1000);
      const diffSharesLot = Math.round(stock.diffShares / 1000);
      
      // 格式: 1. 2330 台積電 35.5% (🔺0.5%) | 5000張 (+100) 🆕
      const safeStockName = stock.stockName.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
      message += `  ${index + 1}. \`${stock.stockCode}\` ${safeStockName}${newTag}\n`;
      message += `     ${stock.weight}% (${weightIcon}${stock.diffWeight > 0 ? '+' : ''}${stock.diffWeight}%) | ${sharesLot}張 (${sharesIcon}${diffSharesLot})\n`;
    });
    message += '\n';
  });

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    await axios.post(url, {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown'
    });
    console.log('[Notifier] Telegram 推播發送成功！');
  } catch (error) {
    console.error('[Notifier] Telegram 推播發送失敗:', error.response?.data || error.message);
  }
}
