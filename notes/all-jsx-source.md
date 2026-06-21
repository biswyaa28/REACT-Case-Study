# StockPulse JSX Source Files

---

## `src/main.jsx`

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

---

## `src/App.jsx`

```jsx
import { useState } from 'react';
import { InvestorProvider, useInvestor } from './context/InvestorContext';
import RealTimeTicker from './components/RealTimeTicker';
import TradeLimitChecker from './components/TradeLimitChecker';
import Watchlist from './components/Watchlist';
import TransactionHistory from './components/TransactionHistory';
import InvestorAccountDetails from './components/InvestorAccountDetails';
import CalculationSafetyNet from './components/ErrorBoundary';
import './App.css';

function Dashboard() {
  const { balance } = useInvestor();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1 className="logo">StockPulse</h1>
          <span className="subtitle">Real-Time Investment Tracker</span>
        </div>
        <div className="header-right">
          <span className="balance-display">Balance: <strong>${balance.toLocaleString()}</strong></span>
        </div>
      </header>

      <nav className="tabs">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'watchlist', label: 'Watchlist' },
          { id: 'trade', label: 'Trade' },
          { id: 'history', label: 'History' },
          { id: 'account', label: 'Account' },
        ].map(tab => (
          <button key={tab.id} className={`tab ${activeTab === tab.id ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </nav>

      <RealTimeTicker />

      <main className="main">
        {activeTab === 'overview' && (
          <div className="grid-2col">
            <CalculationSafetyNet><Watchlist /></CalculationSafetyNet>
            <CalculationSafetyNet><InvestorAccountDetails /></CalculationSafetyNet>
          </div>
        )}
        {activeTab === 'watchlist' && (
          <div className="grid-1col">
            <CalculationSafetyNet><Watchlist /></CalculationSafetyNet>
          </div>
        )}
        {activeTab === 'trade' && (
          <div className="grid-1col">
            <CalculationSafetyNet><TradeLimitChecker /></CalculationSafetyNet>
          </div>
        )}
        {activeTab === 'history' && (
          <div className="grid-1col">
            <CalculationSafetyNet><TransactionHistory /></CalculationSafetyNet>
          </div>
        )}
        {activeTab === 'account' && (
          <div className="grid-1col">
            <CalculationSafetyNet><InvestorAccountDetails /></CalculationSafetyNet>
          </div>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <InvestorProvider>
      <Dashboard />
    </InvestorProvider>
  );
}

export default App;
```

---

## `src/context/InvestorContext.jsx`

```jsx
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
```

---

## `src/components/Watchlist.jsx`

```jsx
import { useMemo } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useInvestor } from '../context/InvestorContext';
import { stocks } from '../data/mockData';
import PriceChart from './PriceChart';

function SortableStock({ stock, price }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stock.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`watchlist-item ${isDragging ? 'dragging' : ''}`}>
      <button className="drag-handle" {...attributes} {...listeners}>⠿</button>
      <div className="watchlist-info">
        <span className="watchlist-symbol">{stock.id}</span>
        <span className="watchlist-name">{stock.name}</span>
      </div>
      <PriceChart stockId={stock.id} basePrice={price} />
      <span className="watchlist-price">${price.toFixed(2)}</span>
    </div>
  );
}

function Watchlist() {
  const { watchlist, reorderWatchlist, stockPrices } = useInvestor();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const watchlistStocks = useMemo(() => {
    return watchlist.map(id => stocks.find(s => s.id === id)).filter(Boolean);
  }, [watchlist]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = watchlist.indexOf(active.id);
      const newIndex = watchlist.indexOf(over.id);
      reorderWatchlist(arrayMove(watchlist, oldIndex, newIndex));
    }
  };

  return (
    <div className="card">
      <h2 className="section-title">Custom Watchlist Organizer</h2>
      <p className="card-hint">Drag the handles to reorder your favorite stocks</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={watchlist} strategy={verticalListSortingStrategy}>
          <div className="watchlist">
            {watchlistStocks.map(stock => (
              <SortableStock key={stock.id} stock={stock} price={stockPrices[stock.id]} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

export default Watchlist;
```

---

## `src/components/PriceChart.jsx`

```jsx
import { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts';

const COLORS = {
  positive: '#22c55e',
  negative: '#ef4444',
};

function PriceChart({ stockId, basePrice }) {
  const data = useMemo(() => {
    const points = [];
    let price = basePrice || 100;
    for (let i = 20; i >= 0; i--) {
      price += (Math.random() - 0.5) * 6;
      points.push({ t: i, p: +price.toFixed(2) });
    }
    return points;
  }, [stockId, basePrice]);

  const lastPrice = data[data.length - 1]?.p || 0;
  const firstPrice = data[0]?.p || 0;
  const color = lastPrice >= firstPrice ? COLORS.positive : COLORS.negative;

  return (
    <div className="mini-chart">
      <ResponsiveContainer width={120} height={40}>
        <LineChart data={data}>
          <YAxis domain={['dataMin', 'dataMax']} hide />
          <Tooltip
            contentStyle={{ fontSize: 11, padding: '4px 8px', background: '#1e293b', border: '1px solid #334155', borderRadius: 4 }}
            labelStyle={{ display: 'none' }}
            formatter={(value) => [`$${value}`, 'Price']}
          />
          <Line type="monotone" dataKey="p" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default PriceChart;
```

---

## `src/components/RealTimeTicker.jsx`

```jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useInvestor } from '../context/InvestorContext';
import { stocks } from '../data/mockData';
import SmartWrapper from './SmartWrapper';
import PriceChart from './PriceChart';

function TickerItem({ stock, price }) {
  const prevPriceRef = useRef(price);
  const [flash, setFlash] = useState('');

  useEffect(() => {
    if (price !== prevPriceRef.current) {
      setFlash(price > prevPriceRef.current ? 'flash-up' : 'flash-down');
      prevPriceRef.current = price;
      const t = setTimeout(() => setFlash(''), 400);
      return () => clearTimeout(t);
    }
  }, [price]);

  return (
    <div className={`ticker-item ${flash}`}>
      <span className="ticker-symbol">{stock.id}</span>
      <span className="ticker-price">${price.toFixed(2)}</span>
      <span className={`ticker-change ${price >= stock.price ? 'positive' : 'negative'}`}>
        {((price - stock.price) / stock.price * 100).toFixed(2)}%
      </span>
    </div>
  );
}

function RealTimeTicker() {
  const { stockPrices, simulatePriceUpdate } = useInvestor();
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      simulatePriceUpdate();
    }, 800);
    return () => clearInterval(intervalRef.current);
  }, [simulatePriceUpdate]);

  return (
    <div className="ticker-container">
      <h2 className="section-title">Real-Time Price Ticker</h2>
      <div className="ticker-track">
        {stocks.map(stock => (
          <SmartWrapper key={stock.id} deps={[stockPrices[stock.id]]}>
            <TickerItem stock={stock} price={stockPrices[stock.id]} />
          </SmartWrapper>
        ))}
      </div>
    </div>
  );
}

export default RealTimeTicker;
```

---

## `src/components/TradeLimitChecker.jsx`

```jsx
import { useState } from 'react';
import { useInvestor } from '../context/InvestorContext';
import { stocks } from '../data/mockData';

function TradeLimitChecker() {
  const { balance, tradeLimit, executeTrade, stockPrices, setLimit } = useInvestor();
  const [selectedStock, setSelectedStock] = useState(stocks[0].id);
  const [tradeType, setTradeType] = useState('BUY');
  const [shares, setShares] = useState(1);
  const [result, setResult] = useState(null);

  const total = +(shares * (stockPrices[selectedStock] || 0)).toFixed(2);
  const exceedsLimit = total > tradeLimit;
  const exceedsBalance = tradeType === 'BUY' && total > balance;

  const handleTrade = () => {
    const res = executeTrade(selectedStock, tradeType, shares);
    setResult(res);
    if (res.success) {
      setTimeout(() => setResult(null), 3000);
    }
  };

  return (
    <div className="card">
      <h2 className="section-title">Trade Limit Checker</h2>

      <div className="limit-info">
        <span>Trade Limit: <strong>${tradeLimit.toLocaleString()}</strong></span>
        <label>
          Adjust Limit: $
          <input type="number" value={tradeLimit} onChange={e => setLimit(+e.target.value || 0)} className="limit-input" />
        </label>
      </div>

      <div className="trade-form">
        <select value={selectedStock} onChange={e => setSelectedStock(e.target.value)} className="select-input">
          {stocks.map(s => (
            <option key={s.id} value={s.id}>{s.id} - ${stockPrices[s.id]?.toFixed(2)}</option>
          ))}
        </select>

        <select value={tradeType} onChange={e => setTradeType(e.target.value)} className="select-input">
          <option value="BUY">BUY</option>
          <option value="SELL">SELL</option>
        </select>

        <input type="number" min={1} value={shares} onChange={e => setShares(Math.max(1, +e.target.value || 1))} className="number-input" />

        <button className="btn btn-primary" onClick={handleTrade}
          disabled={exceedsLimit || exceedsBalance || shares < 1}>
          Execute {tradeType}
        </button>
      </div>

      <div className="trade-summary">
        <span>Total: <strong>${total.toLocaleString()}</strong></span>
      </div>

      {exceedsLimit && (
        <div className="alert alert-danger">
          {'Trade Limit Exceeded! $' + total.toLocaleString() + ' > $' + tradeLimit.toLocaleString()}
        </div>
      )}
      {exceedsBalance && (
        <div className="alert alert-warning">
          Insufficient Balance! Need ${total.toLocaleString()}, have ${balance.toLocaleString()}
        </div>
      )}

      {result && (
        <div className={`alert ${result.success ? 'alert-success' : 'alert-danger'}`}>
          {result.success ? `Trade executed: $${result.total.toLocaleString()}` : result.error}
        </div>
      )}
    </div>
  );
}

export default TradeLimitChecker;
```

---

## `src/components/TransactionHistory.jsx`

```jsx
import { useState, useMemo, useRef, useCallback, memo, useEffect } from 'react';
import { useInvestor } from '../context/InvestorContext';
import { stocks } from '../data/mockData';

const ROW_HEIGHT = 44;
const VISIBLE_BUFFER = 5;

const TransactionRow = memo(({ txn }) => {
  const stock = stocks.find(s => s.id === txn.stock);
  return (
    <div className={`tx-row ${txn.type === 'BUY' ? 'tx-buy' : 'tx-sell'}`} style={{ height: ROW_HEIGHT }}>
      <span className="tx-id">{txn.id}</span>
      <span className="tx-stock">{txn.stock}</span>
      <span className={`tx-type ${txn.type === 'BUY' ? 'badge-buy' : 'badge-sell'}`}>{txn.type}</span>
      <span className="tx-shares">{txn.shares}</span>
      <span className="tx-price">${txn.price.toFixed(2)}</span>
      <span className="tx-total">${txn.total.toLocaleString()}</span>
      <span className="tx-date">{txn.date}</span>
    </div>
  );
});

function TransactionHistory() {
  const { transactions } = useInvestor();
  const [filter, setFilter] = useState('ALL');
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState(440);

  const filtered = useMemo(() => {
    if (filter === 'ALL') return transactions;
    return transactions.filter(t => t.type === filter);
  }, [transactions, filter]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const totalHeight = filtered.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - VISIBLE_BUFFER);
  const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + VISIBLE_BUFFER * 2;
  const endIndex = Math.min(filtered.length, startIndex + visibleCount);
  const offsetY = startIndex * ROW_HEIGHT;

  const visibleRows = useMemo(
    () => filtered.slice(startIndex, endIndex),
    [filtered, startIndex, endIndex]
  );

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  return (
    <div className="card">
      <h2 className="section-title">Lag-Free Transaction History</h2>

      <div className="tx-controls">
        <span className="tx-count">{filtered.length} transactions</span>
        <div className="tx-filters">
          {['ALL', 'BUY', 'SELL'].map(f => (
            <button key={f} className={`btn btn-sm ${filter === f ? 'btn-active' : ''}`} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="tx-header">
        <span className="tx-id">#</span>
        <span className="tx-stock">Stock</span>
        <span className="tx-type">Type</span>
        <span className="tx-shares">Shares</span>
        <span className="tx-price">Price</span>
        <span className="tx-total">Total</span>
        <span className="tx-date">Date</span>
      </div>

      <div className="tx-scroll-container" ref={containerRef} onScroll={handleScroll}
        style={{ height: Math.min(containerHeight, 440), overflow: 'auto' }}>
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: `translateY(${offsetY}px)` }}>
            {visibleRows.map((txn) => (
              <TransactionRow key={txn.id} txn={txn} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TransactionHistory;
```

---

## `src/components/ErrorBoundary.jsx`

```jsx
import React from 'react';

class CalculationSafetyNet extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error, info) {
    console.error('Calculation Safety Net caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-icon">⚠</div>
          <h3>Calculation Safety Net Triggered</h3>
          <p>A financial calculation error was detected and safely handled.</p>
          <pre>{this.state.error}</pre>
          <button className="btn btn-primary" onClick={() => this.setState({ hasError: false, error: null })}>
            Dismiss & Continue
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default CalculationSafetyNet;
```

---

## `src/components/InvestorAccountDetails.jsx`

```jsx
import { useMemo } from 'react';
import { useInvestor } from '../context/InvestorContext';
import { stocks } from '../data/mockData';

function InvestorAccountDetails() {
  const { balance, profile, watchlist, stockPrices, transactions } = useInvestor();

  const portfolioValue = useMemo(() => {
    let value = 0;
    stocks.forEach(stock => {
      const bought = transactions.filter(t => t.stock === stock.id && t.type === 'BUY').reduce((s, t) => s + t.shares, 0);
      const sold = transactions.filter(t => t.stock === stock.id && t.type === 'SELL').reduce((s, t) => s + t.shares, 0);
      const owned = bought - sold;
      if (owned > 0 && stockPrices[stock.id]) {
        value += owned * stockPrices[stock.id];
      }
    });
    return +value.toFixed(2);
  }, [stockPrices, transactions]);

  const netWorth = +(balance + portfolioValue).toFixed(2);

  return (
    <div className="card account-card">
      <h2 className="section-title">Investor Account Details</h2>
      <div className="account-grid">
        <div className="account-field">
          <span className="field-label">Name</span>
          <span className="field-value">{profile.name}</span>
        </div>
        <div className="account-field">
          <span className="field-label">Email</span>
          <span className="field-value">{profile.email}</span>
        </div>
        <div className="account-field">
          <span className="field-label">Account Level</span>
          <span className="field-value badge-gold">{profile.accountLevel}</span>
        </div>
        <div className="account-field">
          <span className="field-label">Cash Balance</span>
          <span className="field-value">${balance.toLocaleString()}</span>
        </div>
        <div className="account-field">
          <span className="field-label">Portfolio Value</span>
          <span className="field-value">${portfolioValue.toLocaleString()}</span>
        </div>
        <div className="account-field">
          <span className="field-label">Net Worth</span>
          <span className="field-value net-worth">${netWorth.toLocaleString()}</span>
        </div>
        <div className="account-field">
          <span className="field-label">Watchlist Stocks</span>
          <span className="field-value">{watchlist.length}</span>
        </div>
        <div className="account-field">
          <span className="field-label">Total Trades</span>
          <span className="field-value">{transactions.length}</span>
        </div>
      </div>
    </div>
  );
}

export default InvestorAccountDetails;
```

---

## `src/components/SmartWrapper.jsx`

```jsx
import React from 'react';

function SmartWrapper({ children, deps }) {
  return React.useMemo(() => children, deps);
}

const SmartComponent = React.memo(({ stockId, price, change, children }) => {
  return <>{children}</>;
});

export default SmartWrapper;
export { SmartComponent };
```
