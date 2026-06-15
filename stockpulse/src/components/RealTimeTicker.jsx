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
