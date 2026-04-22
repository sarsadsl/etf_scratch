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

  if (process.env.SKIP_TELEGRAM === 'true') {
    console.log('[Notifier] 偵測到 SKIP_TELEGRAM 設定，跳過推播發送。');
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

    // 為所有股票加上原始排行名次，再過濾出有實質異動的股票
    const mappedHoldings = result.holdings.map((stock, i) => ({ ...stock, rank: i + 1 }));
    const changedHoldings = mappedHoldings.filter(stock => 
      stock.isNew || (stock.diffShares !== undefined && stock.diffShares !== 0)
    );

    if (changedHoldings.length === 0) {
      message += `  💤 今日前十大持股無任何增減變化\n\n`;
      return;
    }

    // 根據張數異動由大到小排序
    changedHoldings.sort((a, b) => b.diffShares - a.diffShares);

    changedHoldings.forEach((stock) => {
      // 判斷增減符號
      let weightIcon = '➖';
      let sharesIcon = '';
      if (stock.diffWeight > 0) weightIcon = '🔺';
      if (stock.diffWeight < 0) weightIcon = '🔻';
      if (stock.diffShares > 0) sharesIcon = '+';
      
      const newTag = stock.isNew ? ' 🆕新進榜' : '';
      
      const sharesLot = Math.round(stock.shares / 1000);
      const diffSharesLot = Math.round(stock.diffShares / 1000);
      
      let sharesStr = '';
      if (diffSharesLot === 0 && stock.diffShares !== 0) {
         sharesStr = `${(stock.shares / 1000).toFixed(1)}張 (${sharesIcon}${(stock.diffShares / 1000).toFixed(1)})`;
      } else {
         sharesStr = `${sharesLot}張 (${sharesIcon}${diffSharesLot})`;
      }
      
      // 格式: #5 2330 台積電 35.5% (🔺0.5%) | 5000張 (+100) 🆕
      const safeStockName = stock.stockName.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
      message += `  #${stock.rank} \`${stock.stockCode}\` ${safeStockName}${newTag}\n`;
      message += `     ${stock.weight}% (${weightIcon}${stock.diffWeight > 0 ? '+' : ''}${stock.diffWeight}%) | ${sharesStr}\n`;
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
