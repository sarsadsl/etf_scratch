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
  let message = `━━━━━━━━━━━━━━\n`;
  message += `📊 *主動式 ETF 持股異動報告*\n`;
  message += `📅 *日期*: ${today}\n`;
  message += `━━━━━━━━━━━━━━\n\n`;

  // 暫時只處理 00981A
  const filteredResults = results.filter(r => r.target.code === '00981A');

  filteredResults.forEach(result => {
    message += `🏷️ *${result.target.code} ${result.target.name.replace('主動', '')}*\n`;
    message += `──────────────────\n`;
    
    const BLACKLIST = {
      "00981A": ["2357", "2439", "5347"]
    };
    
    if (!result.holdings || result.holdings.length === 0) {
      message += `  ⚠️ 抓取失敗或無資料\n`;
      if (result.debugError) {
        message += `  🔴 *Debug*: \`${result.debugError}\`\n`;
      }
      message += '\n';
      return;
    }

    const mappedHoldings = result.holdings.map((stock, i) => ({ ...stock, rank: i + 1 }));
    let changedHoldings = mappedHoldings.filter(stock => 
      stock.isNew || (stock.diffShares !== undefined && stock.diffShares !== 0)
    );

    if (BLACKLIST[result.target.code]) {
      changedHoldings = changedHoldings.filter(s => !BLACKLIST[result.target.code].includes(s.stockCode));
    }

    if (changedHoldings.length === 0) {
      message += `  💤 今日持股無顯著異動\n\n`;
      return;
    }

    changedHoldings.sort((a, b) => b.diffShares - a.diffShares);

    const MAX_CHANGES = 10;
    const isTruncated = changedHoldings.length > MAX_CHANGES;

    changedHoldings.slice(0, MAX_CHANGES).forEach((stock, idx) => {
      let weightIcon = '➖';
      let sharesIcon = '';
      if (stock.diffWeight > 0) weightIcon = '🔺';
      if (stock.diffWeight < 0) weightIcon = '🔻';
      if (stock.diffShares > 0) sharesIcon = '+';
      
      const newTag = stock.isNew ? ' ✨*新進榜*' : '';
      const sharesLot = Math.round(stock.shares / 1000);
      const diffSharesLot = Math.round(stock.diffShares / 1000);
      const prevLot = sharesLot - diffSharesLot;
      
      let sharesStr = '';
      if (diffSharesLot === 0 && stock.diffShares !== 0) {
         const curT = (stock.shares / 1000).toFixed(1);
         const diffT = (stock.diffShares / 1000).toFixed(1);
         const prevT = (parseFloat(curT) - parseFloat(diffT)).toFixed(1);
         sharesStr = `${prevT} -> ${curT} 張 (${sharesIcon}${diffT})`;
      } else {
         sharesStr = `${prevLot.toLocaleString()} -> ${sharesLot.toLocaleString()} 張 (${sharesIcon}${diffSharesLot.toLocaleString()})`;
      }
      
      const safeStockName = stock.stockName.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
      const lineIcon = stock.diffShares >= 0 ? '📈' : '📉';

      message += `${idx + 1}. *${safeStockName}* (\`${stock.stockCode}\`)${newTag}\n`;
      message += `   ${lineIcon} 權重: ${stock.weight}% (${weightIcon}${stock.diffWeight > 0 ? '+' : ''}${stock.diffWeight}%)\n`;
      message += `   📦 持倉: ${sharesStr}\n\n`;
    });

    if (isTruncated) {
      message += `  ... 以及其他 ${changedHoldings.length - MAX_CHANGES} 筆異動\n`;
    }
  });

  message += `━━━━━━━━━━━━━━\n`;
  message += `🌐 [即時視覺化儀表板](https://stocktrack.morningjoy.cc)`;

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
