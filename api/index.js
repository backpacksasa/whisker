export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.url === '/api/health') {
    res.status(200).json({ status: 'ok', message: 'WhiskerSwap API is running' });
    return;
  }
  
  if (req.url === '/api/tokens') {
    res.status(200).json([
      { symbol: 'HYPE', name: 'Hyperliquid', price: '48.50' },
      { symbol: 'PURR', name: 'Purr Token', price: '0.22' },
      { symbol: 'WHYPE', name: 'Wrapped HYPE', price: '48.50' }
    ]);
    return;
  }
  
  // Default response
  res.status(200).json({ 
    message: 'WhiskerSwap DEX API', 
    path: req.url,
    method: req.method
  });
}
