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
