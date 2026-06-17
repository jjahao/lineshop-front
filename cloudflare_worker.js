// Cloudflare Worker — GAS CORS Proxy
// 部署到 Cloudflare Workers，讓 GitHub Pages 能 fetch GAS

const GAS_BASE = 'https://script.google.com/macros/s/AKfycbyeE80AkDAGc8UVjG2gMAN0RXFSG72BfObmzXVYEmhWrT545JeRseKBrRFHqzPo5Rx1/exec';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request) {
    // OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);
    // 把所有 query params 轉給 GAS
    const gasUrl = GAS_BASE + url.search;

    let gasReq;
    if (request.method === 'POST') {
      const body = await request.text();
      gasReq = new Request(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' }, // 避免 preflight
        body,
        redirect: 'follow',
      });
    } else {
      gasReq = new Request(gasUrl, {
        method: 'GET',
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
    }

    const gasRes = await fetch(gasReq);
    const text = await gasRes.text();

    return new Response(text, {
      status: gasRes.ok ? 200 : gasRes.status,
      headers: {
        ...CORS,
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }
};
