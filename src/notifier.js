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
  const CHUNK_LIMIT = 3500; // Telegram 限制 4096，留安全邊際
  const messages = [];
  
  let currentMessage = `━━━━━━━━━━━━━━\n`;
  currentMessage += `📊 *主動式 ETF 持股異動報告*\n`;
  currentMessage += `📅 *日期*: ${today}\n`;
  currentMessage += `━━━━━━━━━━━━━━\n`;

  // 處理 00981A, 00403A
  const targetETFs = ['00981A', '00403A'];
  const filteredResults = results.filter(r => targetETFs.includes(r.target.code));

  filteredResults.forEach(result => {
    let etfChunk = `──────────────────\n`;
    etfChunk += `🏷️ *${result.target.code} ${result.target.name.replace('主動', '')}*\n`;
    etfChunk += `──────────────────\n`;
    
    const BLACKLIST = {
      "00981A": ["2357", "2439", "5347"]
    };
    
    if (!result.holdings || result.holdings.length === 0) {
      etfChunk += `  ⚠️ 抓取失敗或無資料\n`;
      if (result.debugError) {
        etfChunk += `  🔴 *Debug*: \`${result.debugError}\`\n`;
      }
      etfChunk += '\n';
      
      if (currentMessage.length + etfChunk.length > CHUNK_LIMIT) {
        messages.push(currentMessage);
        currentMessage = etfChunk;
      } else {
        currentMessage += etfChunk;
      }
      return;
    }

    const mappedHoldings = result.holdings.map((stock, i) => ({ ...stock, rank: i + 1 }));
    let changedHoldings = mappedHoldings.filter(stock => 
      stock.isNew || stock.isSoldOut || (stock.diffShares !== undefined && stock.diffShares !== 0)
    );

    if (BLACKLIST[result.target.code]) {
      changedHoldings = changedHoldings.filter(s => !BLACKLIST[result.target.code].includes(s.stockCode));
    }

    if (changedHoldings.length === 0) {
      etfChunk += `  💤 今日持股無顯著異動\n\n`;
      if (currentMessage.length + etfChunk.length > CHUNK_LIMIT) {
        messages.push(currentMessage);
        currentMessage = etfChunk;
      } else {
        currentMessage += etfChunk;
      }
      return;
    }

    // 分類
    const newPositions = [];
    const addedPositions = [];
    const reducedPositions = [];
    const soldOutPositions = [];

    changedHoldings.forEach(stock => {
      if (stock.isSoldOut) {
        soldOutPositions.push(stock);
      } else if (stock.isNew) {
        newPositions.push(stock);
      } else if (stock.diffShares > 0) {
        addedPositions.push(stock);
      } else if (stock.diffShares < 0) {
        reducedPositions.push(stock);
      }
    });

    // 排序 (以變動張數絕對值由大到小)
    const sortByAbsDiff = (a, b) => Math.abs(b.diffShares || 0) - Math.abs(a.diffShares || 0);
    newPositions.sort(sortByAbsDiff);
    addedPositions.sort(sortByAbsDiff);
    reducedPositions.sort(sortByAbsDiff);
    soldOutPositions.sort(sortByAbsDiff);

    const categories = [
      { title: '✨ 新建倉', items: newPositions },
      { title: '📈 加碼', items: addedPositions },
      { title: '📉 減碼', items: reducedPositions },
      { title: '👋 出清', items: soldOutPositions }
    ];

    categories.forEach(cat => {
      if (cat.items.length === 0) return;
      etfChunk += `\n【${cat.title}】\n`;
      
      const MAX_CHANGES_PER_CAT = 10;
      const isCatTruncated = cat.items.length > MAX_CHANGES_PER_CAT;
      
      cat.items.slice(0, MAX_CHANGES_PER_CAT).forEach((stock, idx) => {
        let weightIcon = '➖';
        let sharesIcon = '';
        if (stock.diffWeight > 0) weightIcon = '🔺';
        if (stock.diffWeight < 0) weightIcon = '🔻';
        if (stock.diffShares > 0) sharesIcon = '+';
        
        const sharesLot = Math.round((stock.shares || 0) / 1000);
        const diffSharesLot = Math.round((stock.diffShares || 0) / 1000);
        const prevLot = sharesLot - diffSharesLot;
        
        let sharesStr = '';
        if (diffSharesLot === 0 && stock.diffShares !== 0) {
           const curT = ((stock.shares || 0) / 1000).toFixed(1);
           const diffT = ((stock.diffShares || 0) / 1000).toFixed(1);
           const prevT = (parseFloat(curT) - parseFloat(diffT)).toFixed(1);
           sharesStr = `${prevT} -> ${curT} 張 (${sharesIcon}${diffT})`;
        } else {
           sharesStr = `${prevLot.toLocaleString()} -> ${sharesLot.toLocaleString()} 張 (${sharesIcon}${diffSharesLot.toLocaleString()})`;
        }
        
        const safeStockName = stock.stockName.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
        const lineIcon = stock.diffShares >= 0 ? '📈' : '📉';

        etfChunk += `${idx + 1}. *${safeStockName}* (\`${stock.stockCode}\`)\n`;
        etfChunk += `   ${lineIcon} 權重: ${stock.weight}% (${weightIcon}${stock.diffWeight > 0 ? '+' : ''}${stock.diffWeight}%)\n`;
        etfChunk += `   📦 持倉: ${sharesStr}\n\n`;
      });

      if (isCatTruncated) {
        etfChunk += `  ... 以及其他 ${cat.items.length - MAX_CHANGES_PER_CAT} 筆異動\n\n`;
      }
    });
    
    if (currentMessage.length + etfChunk.length > CHUNK_LIMIT) {
      messages.push(currentMessage);
      currentMessage = etfChunk;
    } else {
      currentMessage += etfChunk;
    }
  });

  currentMessage += `━━━━━━━━━━━━━━\n`;
  currentMessage += `🌐 [即時視覺化儀表板](https://stocktrack.morningjoy.cc)`;
  messages.push(currentMessage);

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    for (let i = 0; i < messages.length; i++) {
      await axios.post(url, {
        chat_id: chatId,
        text: messages[i],
        parse_mode: 'Markdown'
      });
      if (i < messages.length - 1) {
        await new Promise(res => setTimeout(res, 1000)); // 避免觸發 rate limit
      }
    }
    console.log(`[Notifier] Telegram 推播發送成功！共發送 ${messages.length} 則訊息。`);
  } catch (error) {
    console.error('[Notifier] Telegram 推播發送失敗:', error.response?.data || error.message);
  }
}
