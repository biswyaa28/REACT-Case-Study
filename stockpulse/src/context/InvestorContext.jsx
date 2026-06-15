import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { stocks as initialStocks, generateTransactions } from '../data/mockData';

const InvestorContext = createContext(null);

export function InvestorProvider({ children }) {
  const [balance, setBalance] = useState(50000);
  const [profile] = useState({ name: 'Alex Investor', email: 'alex@example.com', accountLevel: 'Gold' });
  const [transactions, setTransactions] = useState(() => generateTransactions(500));
  const [watchlist, setWatchlist] = useState(() => initialStocks.map(s => s.id));
  const [stockPrices, setStockPrices] = useState(() => {
    const map = {};
    initialStocks.forEach(s => { map[s.id] = s.price; });
    return map;
  });
  const [tradeLimit, setTradeLimit] = useState(10000);
  const priceTimestamps = useRef({});
  const lastUpdateRef = useRef({});

  const updatePrice = useCallback((stockId, newPrice) => {
    const now = Date.now();
    const lastTime = priceTimestamps.current[stockId] || 0;
    if (now - lastTime < 100) return;
    priceTimestamps.current[stockId] = now;
    setStockPrices(prev => ({ ...prev, [stockId]: +newPrice.toFixed(2) }));
  }, []);

  const simulatePriceUpdate = useCallback(() => {
    const stock = initialStocks[Math.floor(Math.random() * initialStocks.length)];
    const delta = (Math.random() - 0.5) * 4;
    const newPrice = stockPrices[stock.id] + delta;
    if (newPrice > 0) updatePrice(stock.id, newPrice);
  }, [stockPrices, updatePrice]);

  const executeTrade = useCallback((stockId, type, shares) => {
    const price = stockPrices[stockId];
    const total = +(shares * price).toFixed(2);
    if (total > tradeLimit) return { success: false, error: `Trade exceeds limit of $${tradeLimit.toLocaleString()}` };
    if (type === 'BUY' && total > balance) return { success: false, error: 'Insufficient balance' };
    if (type === 'SELL') {
      const owned = transactions.filter(t => t.stock === stockId && t.type === 'BUY').reduce((s, t) => s + t.shares, 0)
        - transactions.filter(t => t.stock === stockId && t.type === 'SELL').reduce((s, t) => s + t.shares, 0);
      if (shares > owned) return { success: false, error: 'Not enough shares to sell' };
    }
    setBalance(prev => type === 'BUY' ? +(prev - total).toFixed(2) : +(prev + total).toFixed(2));
    setTransactions(prev => [{ id: Date.now(), stock: stockId, type, shares, price, total, date: new Date().toLocaleDateString() }, ...prev]);
    return { success: true, total };
  }, [stockPrices, tradeLimit, balance, transactions]);

  const reorderWatchlist = useCallback((newOrder) => {
    setWatchlist(newOrder);
  }, []);

  const setLimit = useCallback((limit) => {
    setTradeLimit(limit);
  }, []);

  const getStockData = useCallback((id) => {
    return initialStocks.find(s => s.id === id);
  }, []);

  return (
    <InvestorContext.Provider value={{
      balance, profile, transactions, watchlist, stockPrices, tradeLimit,
      updatePrice, simulatePriceUpdate, executeTrade, reorderWatchlist,
      setLimit, getStockData,
    }}>
      {children}
    </InvestorContext.Provider>
  );
}

export function useInvestor() {
  const ctx = useContext(InvestorContext);
  if (!ctx) throw new Error('useInvestor must be used within InvestorProvider');
  return ctx;
}
