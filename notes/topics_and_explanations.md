# StockPulse - Topics and Explanations

This document provides a detailed breakdown of the technical concepts and React patterns implemented in the StockPulse case study. Organized by depth — from architecture to individual optimizations.

---

## 1. Project Architecture

### App Composition (Parent-Child Structure)
The entry point (`main.jsx`) uses `createRoot` to mount `<App />` into the DOM. `App` wraps `Dashboard` inside `InvestorProvider`, giving the entire dashboard access to shared state via React Context. `Dashboard` consumes `useInvestor` at the top level and renders a tab-based layout with 5 views: Overview, Watchlist, Trade, History, and Account.

### Tab-Based Conditional Rendering
The `activeTab` state (a simple `useState` string) determines which component is visible. React simply returns `null` for non-matching branches and renders only the active tab's JSX. This is efficient because React's reconciliation diff handles it natively — no router library needed for a single-page tool.

### Error Boundary Wrapping Pattern
Every section rendered inside a tab is wrapped with `<CalculationSafetyNet>`. This means if any component crashes during rendering (e.g., a financial calculation goes wrong), the error boundary catches it and shows a fallback UI instead of crashing the entire app.

---

## 2. Data Layer (mockData.js)

The project uses a synthetic data module instead of a real backend:
- **8 stocks** (AAPL, GOOGL, MSFT, AMZN, TSLA, NVDA, META, JPM) with real-world-approximate prices and daily change percentages.
- **`generateTransactions(count)`**: Generates N random transactions across a 30-day window. Each transaction has a random stock, random BUY/SELL type, random shares (1-50), and a price near the stock's base (±10%). This gives us realistic-looking data for testing virtual scrolling and portfolio calculations.

---

## 3. React Hooks in Detail

### `useState` — Local Component State
Used extensively for local UI state:
- `activeTab` in `Dashboard` — tracks which tab is selected
- `filter` in `TransactionHistory` — BUY/SELL/ALL filter
- `scrollTop` in `TransactionHistory` — tracks scroll position for virtual scrolling
- `shares`, `selectedStock`, `tradeType`, `result` in `TradeLimitChecker` — form state
- `flash` in `TickerItem` — controls CSS animation class

### `useEffect` — Side Effects
- **Interval setup**: `RealTimeTicker` creates an 800ms interval to simulate price updates. The cleanup function clears the interval on unmount to prevent memory leaks.
- **Flash animation**: `TickerItem` compares current vs previous price, sets a flash class, and auto-clears it after 400ms via `setTimeout`.
- **ResizeObserver**: `TransactionHistory` measures the container's actual height and updates state when layout changes.

### `useMemo` — Expensive Calculation Caching
- **Portfolio value** (`InvestorAccountDetails`): Iterates over 8 stocks, filters ALL transactions (500+) for BUY and SELL per stock, computes owned shares, multiplies by current price. This O(n) operation is memoized so it only re-runs when `stockPrices` or `transactions` change — not on every tab switch.
- **Filtered transactions** (`TransactionHistory`): Memoized to avoid re-scanning 500 items on every scroll event.
- **Visible rows slice**: The `.slice(startIndex, endIndex)` call is memoized to avoid creating new array references on re-renders that don't change scroll position.
- **Chart data** (`PriceChart`): Random-walk data generation is memoized per stock — only recalculates when `basePrice` changes.

### `useCallback` — Stable Function References
- `updatePrice`, `simulatePriceUpdate`, `executeTrade`, `reorderWatchlist`, `setLimit` — all wrapped in `useCallback` in the context provider to maintain stable references, preventing cascading re-renders in child consumers.
- `handleScroll` — stable scroll handler prevents the `useEffect`/`useMemo` chain from re-running unnecessarily.

### `useRef` — Mutable Non-State Values
- **`prevPriceRef`** (`TickerItem`): Holds the previous price value. Updating it does NOT trigger a re-render, unlike `useState`. This is crucial because we want to detect direction without causing an infinite render loop.
- **`containerRef`** (`TransactionHistory`): Direct reference to the scrollable DOM node to read `scrollTop` and observe with `ResizeObserver`.
- **`intervalRef`** (`RealTimeTicker`): Stores the interval ID for cleanup.
- **`priceTimestamps` / `lastUpdateRef`** (Context): Guards against rapid price updates — throttles to minimum 100ms between updates for the same stock.

### `useContext` — Consuming Global State
`useInvestor` is a custom hook that calls `useContext(InvestorContext)`. The context provides: `balance`, `profile`, `transactions`, `watchlist`, `stockPrices`, `tradeLimit`, and all action functions. If used outside the provider, it throws a descriptive error.

---

## 4. Performance Optimization Deep Dive

### 4.1 Virtual Scrolling (TransactionHistory)
The most significant performance feature. The problem: rendering 500+ transaction rows as real DOM nodes is slow and memory-heavy.

**How it works:**
1. Each row has a fixed height (`ROW_HEIGHT = 44px`).
2. Total scrollable height = `filtered.length × ROW_HEIGHT` — sets the inner spacer div's height to get the right scrollbar size.
3. On scroll, calculate `startIndex = scrollTop / ROW_HEIGHT`.
4. Visible count = `containerHeight / ROW_HEIGHT + VISIBLE_BUFFER(5) × 2`.
5. Slice `filtered.slice(startIndex, endIndex)` — only these rows are rendered.
6. Position them absolutely using `translateY(${startIndex × ROW_HEIGHT}px)`.

**Result**: Only ~25-30 DOM nodes exist at any time regardless of total transaction count. The `ResizeObserver` ensures window resizes are handled dynamically.

### 4.2 React.memo — Component-Level Bailout
`TransactionRow` is wrapped in `React.memo`. Even though `TransactionHistory` re-renders on every scroll event, an individual row only re-renders if its `txn` object reference changed. Since the rows come from a `.slice()` of memoized filtered data, existing rows keep their identity.

### 4.3 SmartWrapper — Targeted Re-render Isolation
The `SmartWrapper` component (`SmartWrapper.jsx`) uses `React.useMemo(() => children, deps)` to prevent its children from re-rendering unless the dependency array changes. In `RealTimeTicker`, each `TickerItem` is wrapped:

```jsx
<SmartWrapper key={stock.id} deps={[stockPrices[stock.id]]}>
  <TickerItem stock={stock} price={stockPrices[stock.id]} />
</SmartWrapper>
```

When `simulatePriceUpdate` changes a random stock's price, only THAT stock's `TickerItem` re-renders — the other 7 tickers stay untouched.

### 4.4 Context Value Pitfall (Known Issue)
**Important:** The `value` prop in `InvestorContext.Provider` is a plain object literal `{ balance, profile, transactions... }`. Every time the provider re-renders (e.g., on any state update), this creates a new object reference. This means ALL components consuming the context re-render, partially defeating the `useCallback` optimizations. In production, the value should be wrapped in `useMemo`.

---

## 5. Third-Party Library Integrations

### @dnd-kit (Watchlist Drag-and-Drop)
- `DndContext` wraps the sortable area, configures collision detection (`closestCenter`) and pointer sensors (with a 5px activation distance to prevent accidental drags).
- `SortableContext` with `verticalListSortingStrategy` enables vertical reordering.
- `useSortable` hook provides: `setNodeRef` (DOM ref), `attributes`/`listeners` (drag handle), `transform`/`transition` (CSS for smooth animation), and `isDragging` (styling).
- `arrayMove` utility handles the actual reorder logic — swapping items in the array.
- The handle is a dedicated button element (⠿), giving users a clear grab target.

### Recharts (PriceChart Sparklines)
- `LineChart` inside `ResponsiveContainer` (120×40px) renders a small SVG line.
- Y-axis is hidden — `domain={['dataMin', 'dataMax']}` auto-scales the chart to the data range.
- Line color is dynamically set: green (`#22c55e`) if last price ≥ first price, red (`#ef4444`) if below.
- `isAnimationActive={false}` keeps the chart snappy during rapid price updates.

---

## 6. App-Wide Patterns

### Event Loop Timing & setInterval
The 800ms interval in `RealTimeTicker` simulates a WebSocket or polling connection. Important viva point: `useEffect` cleanup (`clearInterval`) prevents the interval from persisting after unmount — a common source of memory leaks in React apps.

### Flash Animation Cycle (TickerItem)
1. `useRef` stores previous price.
2. `useEffect` compares new price vs ref.
3. Sets `flash` state to `'flash-up'` or `'flash-down'`.
4. CSS class applies a green or red background flash.
5. `setTimeout(→ '', 400)` clears the flash after 400ms.
6. `prevPriceRef.current = price` updates for next comparison.

### Portfolio Valuation (InvestorAccountDetails)
The portfolio calculation:
```
for each stock:
    totalBought = sum(transactions.filter(BUY).shares)
    totalSold   = sum(transactions.filter(SELL).shares)
    owned       = totalBought - totalSold
    value      += owned × currentPrice
netWorth = cashBalance + portfolioValue
```
This uses `useMemo` with `[stockPrices, transactions]` dependencies.

### Trade Execution Logic (TradeLimitChecker + Context)
When a user executes a trade:
1. **Limit check**: `total > tradeLimit` → reject with "exceeds limit" 
2. **Balance check** (BUY only): `total > balance` → reject with "insufficient balance"
3. **Ownership check** (SELL only): `shares > owned` (computed from BUY minus SELL history) → reject with "not enough shares"
4. **Success**: Updates balance (subtract for BUY, add for SELL), prepends new transaction to array, returns success.

### React StrictMode
`main.jsx` wraps the app in `<StrictMode>`. In development, StrictMode double-invokes effects and renders to help detect side-effect bugs. This is why intervals might appear to fire twice in dev — they don't in production builds.

---

## 7. Tooling (Vite + React 19)
- **Vite 8** for dev server (HMR) and production builds (Rollup-based bundling).
- **ESLint 10** with `react-hooks` plugin to catch hook dependency array violations.
- **No TypeScript**: The project uses `.jsx` files — simpler for a case study.
