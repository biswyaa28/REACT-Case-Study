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
