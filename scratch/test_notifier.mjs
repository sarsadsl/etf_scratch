import fs from 'fs';

// Helper to simulate the logic in notifier.js
const rawData = fs.readFileSync('dashboard/public/data/latest.json', 'utf-8');
const data = JSON.parse(rawData);

const today = new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' });
let message = `📊 *主動式 ETF 持股異動報告* (${today})\n\n`;

for (const [etfCode, holdings] of Object.entries(data)) {
  message += `🔹 *${etfCode}*\n`;
  if (!holdings || holdings.length === 0) {
    message += `  ⚠️ 無資料\n\n`;
    continue;
  }

  const mappedHoldings = holdings.map((stock, i) => ({ ...stock, rank: i + 1 }));
  const changedHoldings = mappedHoldings.filter(stock => 
    stock.isNew || (stock.diffShares !== undefined && stock.diffShares !== 0)
  );

  if (changedHoldings.length === 0) {
    message += `  💤 今日持股無任何增減變化\n\n`;
    continue;
  }

  changedHoldings.forEach((stock) => {
    let weightIcon = '➖';
    let sharesIcon = '';
    if (stock.diffWeight > 0) weightIcon = '🔺';
    if (stock.diffWeight < 0) weightIcon = '🔻';
    if (stock.diffShares > 0) sharesIcon = '+';
    
    const newTag = stock.isNew ? ' 🆕' : '';
    
    // To handle small shares logic fixed recently
    let sharesStr = '';
    const diffLot = Math.round(stock.diffShares / 1000);
    if (diffLot === 0 && stock.diffShares !== 0) {
       sharesStr = `${(stock.shares / 1000).toFixed(1)}張 (${sharesIcon}${(stock.diffShares / 1000).toFixed(1)})`;
    } else {
       sharesStr = `${Math.round(stock.shares / 1000)}張 (${sharesIcon}${diffLot})`;
    }
    
    message += `  #${stock.rank} \`${stock.stockCode}\` ${stock.stockName}${newTag}\n`;
    message += `     ${stock.weight}% (${weightIcon}${stock.diffWeight > 0 ? '+' : ''}${stock.diffWeight}%) | ${sharesStr}\n`;
  });
  message += '\n';
}

console.log(message);
