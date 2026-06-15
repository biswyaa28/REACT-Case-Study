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
