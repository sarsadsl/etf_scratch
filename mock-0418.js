import fs from 'fs';
import path from 'path';

// Generate 04/18 (Smaller than 04/17, to simulate decreasing shares)
// Since `index.js` currently treats scraping from web as "current", to purely mock a new day
// WITHOUT running `index.js` (which would hit websites and mess up dates), we directly
// construct the `20260418.json` in the dashboard folder & update index.json.

const dashboardDataDir = path.join(process.cwd(), 'dashboard', 'public', 'data');
const currentDataPath = path.join(dashboardDataDir, 'latest.json'); // Basis is 0417 with diffs
const newDatePath = path.join(dashboardDataDir, '20260418.json');
const latestPath = path.join(dashboardDataDir, 'latest.json');
const indexJsonPath = path.join(dashboardDataDir, 'index.json');

const currentData = JSON.parse(fs.readFileSync(currentDataPath, 'utf8'));
const newData = {};

Object.keys(currentData).forEach(etfCode => {
    let holdings = currentData[etfCode] || [];
    let nextHoldings = [];

    holdings.forEach((item, idx) => {
        // Complete Sell: randomly drop 1 or 2 items to simulate selling off
        if (Math.random() < 0.15 && holdings.length > 5) return;

        // Mixed Action: 50% chance to increase, 50% to decrease
        const isIncrease = Math.random() > 0.5;
        const ratio = isIncrease 
            ? (1.02 + Math.random() * 0.08) // 1.02 ~ 1.10 (Increase)
            : (0.85 + Math.random() * 0.10); // 0.85 ~ 0.95 (Decrease)
            
        const previousShares = item.shares;
        const previousWeight = item.weight;
        
        const newShares = Math.floor(previousShares * ratio);
        const newWeight = parseFloat((previousWeight * ratio).toFixed(2));

        nextHoldings.push({
            stockCode: item.stockCode,
            stockName: item.stockName,
            shares: newShares,
            weight: newWeight,
            diffShares: newShares - previousShares, // negative
            diffWeight: parseFloat((newWeight - previousWeight).toFixed(2)), // negative
            isNew: false
        });
    });

    // New Buy: Add 1 entirely new stock
    nextHoldings.push({
        stockCode: "9991",
        stockName: "測試強勢新股",
        shares: 4500000,
        weight: 4.8,
        diffShares: 4500000,
        diffWeight: 4.8,
        isNew: true
    });

    nextHoldings.sort((a, b) => b.weight - a.weight);
    newData[etfCode] = nextHoldings;
});

// Save 04/18 and latest
fs.writeFileSync(newDatePath, JSON.stringify(newData, null, 2), 'utf8');
fs.writeFileSync(latestPath, JSON.stringify(newData, null, 2), 'utf8');

// Update index
let historyList = [];
if (fs.existsSync(indexJsonPath)) {
    historyList = JSON.parse(fs.readFileSync(indexJsonPath, 'utf8'));
}
if (!historyList.includes("20260418")) {
    historyList.push("20260418");
    historyList.sort((a, b) => b.localeCompare(a));
    fs.writeFileSync(indexJsonPath, JSON.stringify(historyList, null, 2), 'utf8');
}

console.log("Mock data 04/18 (Decreasing) generated directly into dashboard folder.");
