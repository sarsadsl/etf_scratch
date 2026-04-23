import { fetchHoldings, closeBrowser } from './src/scraper.js';

async function testMultiple() {
  const targets = [
    { code: '00990A', name: '元大全球AI新經濟', issuer: '元大投信' },
    { code: '00981A', name: '元大全球人工智慧', issuer: '元大投信' },
    { code: '00988A', name: '元大AI資料中心', issuer: '元大投信' },
  ];

  for (const target of targets) {
    console.log(`\n[TEST] === ${target.code} ===`);
    const results = await fetchHoldings(target);
    if (results && !results.error && Array.isArray(results)) {
      console.log(`[TEST] Holdings count: ${results.length}`);
      console.log('[TEST] Top 3:', results.slice(0, 3).map(r => `${r.stockCode}(${r.weight}%)`).join(', '));
    } else {
      console.error(`[TEST] Failed for ${target.code}`);
    }
  }

  await closeBrowser();
}

testMultiple().catch(console.error);
