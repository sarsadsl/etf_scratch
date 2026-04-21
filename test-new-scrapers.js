import { fetchHoldings, closeBrowser } from './src/scraper.js';

async function run() {
  console.log("=== Testing Nomura ===");
  const nomuraPayload = await fetchHoldings({ code: '00980A', issuer: '野村投信' });
  console.log("Nomura Result:", JSON.stringify(nomuraPayload, null, 2).slice(0, 500));

  console.log("=== Testing Capital ===");
  const capitalPayload = await fetchHoldings({ code: '00982A', issuer: '群益投信' });
  console.log("Capital Result:", JSON.stringify(capitalPayload, null, 2).slice(0, 500));

  await closeBrowser();
}

run().catch(console.error);
