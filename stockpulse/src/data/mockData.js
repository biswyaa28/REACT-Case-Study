const stocks = [
  { id: 'AAPL', name: 'Apple Inc.', price: 178.50, change: 2.3 },
  { id: 'GOOGL', name: 'Alphabet Inc.', price: 141.20, change: -0.8 },
  { id: 'MSFT', name: 'Microsoft Corp.', price: 378.90, change: 1.5 },
  { id: 'AMZN', name: 'Amazon.com Inc.', price: 178.30, change: 0.6 },
  { id: 'TSLA', name: 'Tesla Inc.', price: 245.60, change: -1.2 },
  { id: 'NVDA', name: 'NVIDIA Corp.', price: 875.40, change: 3.8 },
  { id: 'META', name: 'Meta Platforms', price: 505.10, change: 2.1 },
  { id: 'JPM', name: 'JPMorgan Chase', price: 198.70, change: 0.3 },
];

const generateTransactions = (count) => {
  const types = ['BUY', 'SELL'];
  const txns = [];
  for (let i = 0; i < count; i++) {
    const stock = stocks[Math.floor(Math.random() * stocks.length)];
    const type = types[Math.floor(Math.random() * 2)];
    const shares = Math.floor(Math.random() * 50) + 1;
    const price = +(stock.price * (0.9 + Math.random() * 0.2)).toFixed(2);
    txns.push({
      id: i + 1,
      stock: stock.id,
      type,
      shares,
      price,
      total: +(shares * price).toFixed(2),
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    });
  }
  return txns;
};

export { stocks, generateTransactions };
