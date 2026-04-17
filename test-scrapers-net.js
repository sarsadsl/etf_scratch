import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('api') || url.includes('.json')) {
      try {
        const text = await response.text();
        if (text.includes('00990A') || text.includes('Lumentum')) {
          console.log(`\n[Yuanta API Found] ${url}\n${text.substring(0, 300)}`);
        }
      } catch (e) {}
    }
  });

  try {
    console.log("--- Testing 00990A (Yuanta) ---");
    await page.goto('https://www.yuantaetfs.com/product/detail/00990A/ratio', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 8000));
    const title = await page.title();
    console.log("Yuanta title:", title);

    // Let's also check EZmoney's exact table HTML again.
    console.log("\n--- Testing 00988A (EZMoney) ---");
    await page.goto('https://www.ezmoney.com.tw/ETF/Fund/Info?fundCode=61YTW', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 8000));
    const ezTableRows = await page.evaluate(() => {
      const rows = [];
      const trs = document.querySelectorAll('#assetBody tr');
      trs.forEach(tr => {
        const tds = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
        if (tds.length > 0) rows.push(tds);
      });
      return rows;
    });
    console.log("EZmoney rows:", ezTableRows.slice(0, 10));

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
