import { fetchHoldings, closeBrowser } from './src/scraper.js';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

async function run() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');

  console.log("=== Dumping Nomura ===");
  await page.goto('https://www.nomurafunds.com.tw/ETFWEB/pcf?fundNo=00980A', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 5000));
  const nomuraHtml = await page.content();
  fs.writeFileSync('nomura.html', nomuraHtml);

  console.log("=== Dumping Capital ===");
  await page.goto('https://www.capitalfund.com.tw/etf/product/detail/399/portfolio', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 5000));
  const capitalHtml = await page.content();
  fs.writeFileSync('capital.html', capitalHtml);

  await browser.close();
}

run().catch(console.error);
