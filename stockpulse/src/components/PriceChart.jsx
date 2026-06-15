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
