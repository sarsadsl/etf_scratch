import puppeteer from 'puppeteer';

async function inspect981Full() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  await page.goto('https://www.yuantaetfs.com/tradeInfo/pcf/00981A', { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));

  const result = await page.evaluate(() => {
    return {
      bodyLength: document.body.innerText.length,
      hasExpandBtn: document.querySelectorAll('.expandBtn').length,
      hasTr: document.querySelectorAll('.tr').length,
      bodyText: document.body.innerText.substring(0, 2000),
      allClasses: Array.from(new Set(
        Array.from(document.querySelectorAll('[class]'))
          .flatMap(el => Array.from(el.classList))
      )).slice(0, 80),
    };
  });

  console.log('Has .expandBtn:', result.hasExpandBtn);
  console.log('Has .tr:', result.hasTr);
  console.log('Body length:', result.bodyLength);
  console.log('\nAll classes:', result.allClasses.join(', '));
  console.log('\nBody text snippet:\n', result.bodyText);

  await browser.close();
}

inspect981Full().catch(console.error);
