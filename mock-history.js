import fs from 'fs';
import path from 'path';

// 產生模擬資料 2026/04/16 (將目前 state 作為 04/17 的結果往回推導)
const statePath = path.join(process.cwd(), 'state.json');
const prevDataPath = path.join(process.cwd(), 'data', '20260416.json');
const dashboardDataDir = path.join(process.cwd(), 'dashboard', 'public', 'data');
const prevDashboardPath = path.join(dashboardDataDir, '20260416.json');
const indexJsonPath = path.join(dashboardDataDir, 'index.json');

const currentData = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const prevData = {};

Object.keys(currentData).forEach(etfCode => {
    let holdings = currentData[etfCode] ? [...currentData[etfCode]] : [];
    
    // Sort randomly to pick 2 to "newly buy" on 0417 (meaning they were NOT in 0416)
    holdings.sort(() => 0.5 - Math.random());
    const keepHoldings = holdings.slice(2);
    
    const prevHoldings = keepHoldings.map(item => {
        const ratio = 0.8 + Math.random() * 0.15; // 0.8 ~ 0.95 (0416 is smaller)
        return {
            ...item,
            shares: Math.floor(item.shares * ratio),
            weight: parseFloat((item.weight * ratio).toFixed(2))
        };
    });

    // Add 2 completely fake stocks to 0416, which will be "sold out" on 0417
    prevHoldings.push({
        stockCode: "9998",
        stockName: "模擬賣出股A",
        shares: 5000000,
        weight: 5.5
    });
    prevHoldings.push({
        stockCode: "9999",
        stockName: "模擬賣出股B",
        shares: 2500000,
        weight: 2.3
    });

    // Sort prevHoldings by weight desc
    prevHoldings.sort((a,b) => b.weight - a.weight);
    prevData[etfCode] = prevHoldings;
});

// Update state.json to be 04/16 temporarily so we can run node src/index.js to generate diffs!
fs.writeFileSync(statePath, JSON.stringify(prevData, null, 2), 'utf8');

// For Dashboard 04/16 raw view (without diffs, as it's the seed)
fs.writeFileSync(prevDataPath, JSON.stringify(prevData, null, 2), 'utf8');
fs.writeFileSync(prevDashboardPath, JSON.stringify(prevData, null, 2), 'utf8');

// Update index
let historyList = [];
if (fs.existsSync(indexJsonPath)) {
    historyList = JSON.parse(fs.readFileSync(indexJsonPath, 'utf8'));
}
if (!historyList.includes("20260416")) {
    historyList.push("20260416");
    historyList.sort((a, b) => b.localeCompare(a)); // Descending
    fs.writeFileSync(indexJsonPath, JSON.stringify(historyList, null, 2), 'utf8');
}

console.log("Mock data 04/16 generated. State.json set to 04/16 basis.");
console.log("Please run `node src/index.js` to scrape 04/17 and generate diffs!");
