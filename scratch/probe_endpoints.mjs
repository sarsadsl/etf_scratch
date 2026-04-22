import axios from 'axios';
const h = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0', 'Referer': 'https://www.yuantaetfs.com/' };

// Try ExportToExcel with fundid=1233 and save the content type
const r = await axios.get('https://www.yuantaetfs.com/api/StkWeights/ExportToExcel?fundid=1233', {
  headers: h, responseType: 'arraybuffer', timeout: 20000
});
console.log('Content-Type:', r.headers['content-type']);
console.log('Content-Disposition:', r.headers['content-disposition']);
console.log('Size (bytes):', r.data.byteLength);

// Try to find the fund list API
const r2 = await axios.get('https://www.yuantaetfs.com/api/Fund/GetFundList', { headers: h }).catch(() => null);
if (r2) {
  const funds = r2.data?.data || r2.data;
  const target = (Array.isArray(funds) ? funds : []).find(f => JSON.stringify(f).includes('00990A'));
  console.log('Fund list find 00990A:', target);
}

// Check Capital download API
const r3 = await axios.post('https://www.capitalfund.com.tw/CFWeb/api/etf/holdingExcel', 
  { fundId: 399 },
  { headers: { ...h, 'Content-Type': 'application/json', 'Referer': 'https://www.capitalfund.com.tw/' }, responseType: 'arraybuffer', timeout: 20000 }
).catch(e => { console.log('Capital holdingExcel POST failed:', e.response?.status, e.message); return null; });
if (r3) console.log('Capital holdingExcel success, size:', r3.data.byteLength, 'type:', r3.headers['content-type']);

// Try Capital download as GET
const r4 = await axios.get('https://www.capitalfund.com.tw/CFWeb/api/etf/downloadHolding?fundId=399', {
  headers: { ...h, 'Referer': 'https://www.capitalfund.com.tw/' }, responseType: 'arraybuffer', timeout: 20000
}).catch(e => { console.log('Capital GET failed:', e.response?.status, e.message); return null; });
if (r4) console.log('Capital GET success, size:', r4.data.byteLength);
