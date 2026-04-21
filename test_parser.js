import puppeteer from 'puppeteer';
import fs from 'fs';

async function testParser() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Test Nomura
  let html = fs.readFileSync('nomura.html', 'utf-8');
  await page.setContent(html);
  
  const nomuraResults = await page.evaluate(() => {
    const results = [];
    const rows = document.querySelectorAll('table tr');
    for (let i = 1; i < rows.length; i++) {
        const tds = rows[i].querySelectorAll('td');
        if (tds.length >= 4) {
            const stockCode = tds[0].textContent.trim();
            const stockName = tds[1].textContent.trim();
            const sharesStr = tds[2].textContent.replace(/,/g, '');
            const weightStr = tds[3].textContent.replace('%', '');
            const shares = parseInt(sharesStr, 10) || 0;
            const weight = parseFloat(weightStr) || 0;
            if (stockCode && weight > 0 && !stockCode.includes('股票代碼')) {
               results.push({ stockCode, stockName, shares, weight });
            }
        }
    }
    return results;
  });
  console.log("Nomura parsed count:", nomuraResults.length);
  if(nomuraResults.length > 0) console.log(nomuraResults.slice(0,2));

  // Test Capital
  html = fs.readFileSync('capital.html', 'utf-8');
  await page.setContent(html);
  
  const capitalResults = await page.evaluate(() => {
    const results = [];
    const rows = document.querySelectorAll('table tr');
    for (let i = 1; i < rows.length; i++) {
        const tds = rows[i].querySelectorAll('td');
        if (tds.length >= 4) {
            const stockCode = tds[0].textContent.trim();
            const stockName = tds[1].textContent.trim();
            const weightStr = tds[2].textContent.replace('%', '');
            const sharesStr = tds[3].textContent.replace(/,/g, '');
            
            const weight = parseFloat(weightStr) || 0;
            const shares = parseInt(sharesStr, 10) || 0;
            if (stockCode && weight > 0 && !stockCode.includes('股票代號') && !stockCode.includes('現金')) {
               results.push({ stockCode, stockName, shares, weight });
            }
        }
    }
    return results;
  });
  console.log("Capital parsed count:", capitalResults.length);
  if(capitalResults.length > 0) console.log(capitalResults.slice(0,2));

  await browser.close();
}

testParser();
