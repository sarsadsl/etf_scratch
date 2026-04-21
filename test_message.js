import fs from 'fs';
import path from 'path';

// Mock targets for length test
const targets = [
  { code: '00981A', name: '主動統一台股增長' },
  { code: '00988A', name: '主動統一全球創新' },
  { code: '00991A', name: '主動復華未來50' },
  { code: '00990A', name: '主動元大未來' },
  { code: '00980A', name: '主動野村台灣優選' },
  { code: '00985A', name: '主動野村台灣50' },
  { code: '00982A', name: '主動群益台灣強棒' }
];

const dashboardDataPath = path.join('dashboard', 'public', 'data', 'latest.json');
const dashboardState = JSON.parse(fs.readFileSync(dashboardDataPath, 'utf-8'));

let results = [];
for (const target of targets) {
  results.push({
    target,
    holdings: dashboardState[target.code] || []
  });
}

const today = new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' });
let message = `📊 *主動式 ETF 持股異動報告* (${today})\n\n`;

results.forEach(result => {
  message += `🔹 *${result.target.code} ${result.target.name}*\n`;
  if (!result.holdings || result.holdings.length === 0) {
    message += `  ⚠️ 抓取失敗或無資料\n\n`;
    return;
  }
  
  result.holdings.forEach((stock, index) => {
    let weightIcon = '➖';
    let sharesIcon = '';
    if (stock.diffWeight > 0) weightIcon = '🔺';
    if (stock.diffWeight < 0) weightIcon = '🔻';
    if (stock.diffShares > 0) sharesIcon = '+';
    
    const newTag = stock.isNew ? ' 🆕' : '';
    const sharesLot = Math.round(stock.shares / 1000);
    const diffSharesLot = Math.round(stock.diffShares / 1000);
    
    message += `  ${index + 1}. \`${stock.stockCode}\` ${stock.stockName}${newTag}\n`;
    message += `     ${stock.weight}% (${weightIcon}${stock.diffWeight > 0 ? '+' : ''}${stock.diffWeight}%) | ${sharesLot}張 (${sharesIcon}${diffSharesLot})\n`;
  });
  message += '\n';
});

console.log('Message length:', message.length);

const markdownSpecialChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
let hasIssues = false;
results.forEach(result => {
  result.holdings.forEach(stock => {
     if (stock.stockName.includes('_') || stock.stockName.includes('*') || stock.stockName.includes('`')) {
        console.log('Potential Markdown issue in stock name:', stock.stockName);
        hasIssues = true;
     }
  });
});
if (!hasIssues) console.log('No obvious unescaped markdown characters in stock names.');
