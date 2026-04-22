import fs from 'fs';

// Mock some results to demonstrate sorting and "isNew" label
const mockHoldings = [
  { stockCode: '2330', stockName: '台積電', shares: 8218000, diffShares: 150000, weight: 8.75, diffWeight: 0.2, isNew: false },
  { stockCode: '2317', stockName: '鴻海', shares: 6715000, diffShares: 6715000, weight: 0.77, diffWeight: 0.77, isNew: true },
  { stockCode: '2383', stockName: '台光電', shares: 3681000, diffShares: 323000, weight: 7.77, diffWeight: 0.5, isNew: false },
  { stockCode: '2454', stockName: '聯發科', shares: 3194000, diffShares: 520000, weight: 3.81, diffWeight: 0.7, isNew: false },
  { stockCode: '3711', stockName: '日月光投控', shares: 7419000, diffShares: -50000, weight: 1.79, diffWeight: -0.1, isNew: false },
];

console.log('📊 *主動式 ETF 持股異動報告 (測試展示)*\n');
console.log('🔹 *00981A 測試樣例*');

// 根據張數異動由大到小排序
const changedHoldings = mockHoldings.filter(s => s.isNew || (s.diffShares !== undefined && s.diffShares !== 0));
changedHoldings.sort((a, b) => b.diffShares - a.diffShares);

changedHoldings.forEach((stock, idx) => {
  let weightIcon = '➖';
  let sharesIcon = '';
  if (stock.diffWeight > 0) weightIcon = '🔺';
  if (stock.diffWeight < 0) weightIcon = '🔻';
  if (stock.diffShares > 0) sharesIcon = '+';
  
  const newTag = stock.isNew ? ' 🆕新進榜' : '';
  
  const diffLot = Math.round(stock.diffShares / 1000);
  const sharesLot = Math.round(stock.shares / 1000);
  
  let sharesStr = `${sharesLot}張 (${sharesIcon}${diffLot})`;
  
  console.log(`  #${idx + 1} \`${stock.stockCode}\` ${stock.stockName}${newTag}`);
  console.log(`     ${stock.weight}% (${weightIcon}${stock.diffWeight > 0 ? '+' : ''}${stock.diffWeight}%) | ${sharesStr}`);
});
