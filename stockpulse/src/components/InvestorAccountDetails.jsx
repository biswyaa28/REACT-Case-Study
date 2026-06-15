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
