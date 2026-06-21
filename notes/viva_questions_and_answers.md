# StockPulse - Viva Questions and Answers

56 questions covering architecture, hooks, performance, data flow, third-party libs, and edge cases. Organized by category.

---

## Architecture & Component Design

### Q1. Why does `App.jsx` split into two components (`App` and `Dashboard`)?
**Answer:** `App` is the root component that sets up the context provider (`InvestorProvider`). `Dashboard` is the consumer — it calls `useInvestor()`. If `Dashboard` were merged into `App`, the component calling `useContext` would be the same as the one providing it, which would be redundant. The split keeps concerns clean: `App` = wiring, `Dashboard` = UI logic.

### Q2. How does the tab system work without React Router?
**Answer:** It uses a simple `useState('overview')` for `activeTab`. The render method conditionally returns JSX based on the string value. React's reconciliation handles unmounting the old tab's tree and mounting the new one. This works fine for small apps — no need for a router library.

### Q3. What happens to the 800ms interval when the user switches to the Account tab?
**Answer:** The interval is in `RealTimeTicker.jsx`, which is rendered in the header — OUTSIDE the tabbed main area. It stays mounted and keeps running regardless of which tab is active, ensuring stock prices continue updating in the background.

### Q4. Why is `TransactionHistory` virtual scrolling triggered inside the History tab?
**Answer:** Yes, it's inside the tab condition. When switching tabs, `TransactionHistory` unmounts and remounts. Each remount runs the `ResizeObserver` again. The `useEffect` for ResizeObserver handles reconnecting cleanly via the cleanup function.

### Q5. Why are all sections wrapped in `CalculationSafetyNet`?
**Answer:** This is defensive design. If ANY component crashes due to a rendering error (e.g., `stockPrices[id]` is undefined, causing a `.toFixed()` crash), the Error Boundary catches it. Without it, the crash would propagate and unmount the entire React tree, showing a white screen.

---

## React Hooks

### Q6. Why does `TickerItem` use `useRef` for the previous price instead of `useState`?
**Answer:** Because updating the previous price should NOT trigger a re-render. If we used `useState`, setting the previous price would cause a second render loop immediately after the price update render. `useRef` gives us a mutable container that survives renders without causing new ones.

### Q7. What's the `useEffect` cleanup function doing in `RealTimeTicker`?
**Answer:** `useEffect` returns `() => clearInterval(intervalRef.current)`. This cleanup runs when the component unmounts (or before the effect re-runs). Without it, the interval would keep firing after unmount, trying to `setState` on an unmounted component — a classic React memory leak.

### Q8. Why does `useEffect` in `TransactionHistory` use a `ResizeObserver`?
**Answer:** Virtual scrolling needs to know the exact visible height to calculate how many rows fit. A `ResizeObserver` dynamically measures the container's height and updates state whenever the layout changes (window resize, tab switch, etc.), keeping the virtual scroll math accurate.

### Q9. What happens to `useMemo` in `PriceChart` when prices update every 800ms?
**Answer:** The chart data is memoized on `[stockId, basePrice]`. Since `basePrice` is `stockPrices[stock.id]`, it changes when the stock price updates. So chart data IS recalculated on every price update. The memo is still useful because it prevents recalculations on unrelated re-renders (tab switches, other stocks updating via `SmartWrapper`).

### Q10. Why is `handleScroll` wrapped in `useCallback`?
**Answer:** Without `useCallback`, every `TransactionHistory` re-render would create a new function reference. This function is assigned to `onScroll` on the scroll container. React would see a new handler and might re-attach the event listener. More importantly, if this callback were used in a dependency array elsewhere, it would trigger unnecessary re-executions.

### Q11. Why does `useInvestor()` throw an error if used outside the provider?
**Answer:** If a developer accidentally renders a component using `useInvestor` outside of `<InvestorProvider>`, `useContext` returns `null` and the app would crash with a confusing "cannot read property of null" error. The explicit check `if (!ctx) throw new Error(...)` gives a clear, debuggable message instead.

### Q12. How does `StrictMode` affect the app's behavior during development?
**Answer:** React StrictMode double-invokes effects (useEffect, useMemo, etc.) to help catch side-effect bugs. This means the 800ms interval fires twice in dev, the ResizeObserver connects twice, etc. This only happens in development — production builds run effects once.

### Q13. Can you name a place where `useRef` is used to throttle updates?
**Answer:** In `InvestorContext.jsx`, `priceTimestamps.current[stockId]` stores the timestamp of the last price update for each stock. The `updatePrice` function checks `if (now - lastTime < 100) return;`, which prevents multiple rapid updates to the same stock within 100ms — a manual throttle.

---

## Performance Optimizations

### Q14. Walk me through the virtual scrolling math.
**Answer:**
```
totalHeight = filtered.length × 44px       → the spacer div
startIndex = floor(scrollTop / 44) - 5     → 5 buffer above
endIndex = startIndex + visibleCount + 5   → 5 buffer below
offsetY = startIndex × 44px                → translateY
```
Only rows from `startIndex` to `endIndex` are rendered (~25-30 rows instead of 500+). The scrollbar feels correct because the inner spacer has the full height.

### Q15. What does `React.memo` actually compare for `TransactionRow`?
**Answer:** By default, `React.memo` does a shallow comparison of props. For `{ txn }`, it compares the `txn` object reference. Since the rows come from `filtered.slice(startIndex, endIndex)`, React creates new array references on each scroll. This means `React.memo` alone doesn't help much here — BUT combined with `useMemo` on `visibleRows`, the slice result stays stable between scroll events.

### Q16. How does `SmartWrapper` work internally?
**Answer:** `SmartWrapper` literally calls `React.useMemo(() => children, deps)`. It takes a `deps` array and a `children` prop, and returns the memoized children. In `RealTimeTicker`, each `TickerItem` is wrapped with `deps={[stockPrices[stock.id]]}`, so when any single stock price changes, only that one item re-renders.

### Q17. Could you use `useMemo` on the context `value` prop to fix the re-render issue?
**Answer:** Yes. If you wrap the entire `value` object in `useMemo(() => ({...}), [balance, profile, transactions, etc])`, then components consuming the context would only re-render when the specific value they use actually changes. Currently, every context update causes ALL consumers to re-render because a new object reference is created each time.

### Q18. Why is `isAnimationActive={false}` set on the Recharts Line?
**Answer:** Recharts has built-in mount animations. With prices updating every 800ms, the chart data changes frequently. Mount animations would cause visual flicker and unnecessary CPU work. Disabling animation keeps the sparkline snappy and performant.

---

## Data Flow & State

### Q19. How is `portfolioValue` calculated in `InvestorAccountDetails`?
**Answer:** It iterates over all 8 stocks. For each stock, it calculates `owned = totalBought - totalSold` from the transaction history, then multiplies by the current market price from `stockPrices`. The total across all stocks gives the portfolio value. `netWorth = cashBalance + portfolioValue`.

### Q20. Why does `executeTrade` prepend to the transaction array instead of appending?
**Answer:** The transactions are displayed in `TransactionHistory` which scrolls from top to bottom. Newest transactions should appear first. `[{newTransaction}, ...prev]` adds the latest trade to the top of the list, which matches the typical financial dashboard UX.

### Q21. How does the SELL validation work in `executeTrade`?
**Answer:** It calculates ownership by subtracting total SELL shares from total BUY shares for that specific stock:
```js
bought = sum(transactions.filter(BUY).shares)
sold = sum(transactions.filter(SELL).shares)
owned = bought - sold
if (shares > owned) → reject
```
This ensures users can't sell more shares than they've accumulated.

### Q22. Where does the stock price data for the interval come from?
**Answer:** `simulatePriceUpdate` picks a random stock from the initial array, applies a random delta of `(Math.random() - 0.5) × 4` (±$2), and calls `updatePrice` with the new value. It's a pseudo-random walk that simulates real-world price fluctuations.

### Q23. Why does `simulatePriceUpdate` use `(Math.random() - 0.5) * 4`?
**Answer:** `Math.random()` returns 0 to 1. Subtracting 0.5 gives -0.5 to 0.5. Multiplying by 4 gives -2 to +2. This creates realistic small price movements (±$2 per tick) that make the simulation feel natural.

---

## Third-Party Libraries

### Q24. Why use `@dnd-kit` instead of native HTML5 drag and drop?
**Answer:** Native HTML5 drag and drop has inconsistent browser behavior, no touch support, and no built-in sorting logic. `@dnd-kit` gives us touch-ready pointer detection, collision algorithms (`closestCenter`), smooth CSS transitions via `useSortable`, and utilities like `arrayMove`.

### Q25. What does `activationConstraint: { distance: 5 }` do for the drag sensor?
**Answer:** It prevents accidental drags. The user must move the pointer at least 5px before the drag starts. Without this, a simple click on the drag handle would trigger a drag, which is a poor UX.

### Q26. How does `arrayMove` work in the context of the watchlist?
**Answer:** Given `arrayMove(array, oldIndex, newIndex)`, it removes the item at `oldIndex` and inserts it at `newIndex`. The result is a new array with the reordered items. This new array replaces the old `watchlist` state via `reorderWatchlist`.

### Q27. Why is the PriceChart size fixed at 120×40px?
**Answer:** Sparkline charts are meant to be small, glanceable indicators of trend direction. 120×40 is large enough to show meaningful movement but small enough to fit inline next to stock names. The `ResponsiveContainer` ensures responsiveness within those dimensions.

### Q28. What does `YAxis domain={['dataMin', 'dataMax']}` do in Recharts?
**Answer:** It sets the Y-axis scale to only cover the range of the actual data points, instead of starting from 0. This magnifies small price movements visually, making the sparkline look more dramatic and informative. Without it, all charts would look flat.

---

## Component-Specific Deep Dives

### Q29. How does the flash animation CSS work in `TickerItem`?
**Answer:** When price increases, the component gets class `flash-up` which triggers a CSS `background-color: #22c55e` (green) animation that fades out over 400ms. When price decreases, `flash-down` triggers `background-color: #ef4444` (red). The CSS `transition` or `@keyframes` handles the smooth fade.

### Q30. What happens if `stockPrices[id]` is undefined when `TickerItem` tries to render?
**Answer:** The ticker would show `$NaN.toFixed(2)` which renders as `$NaN`. This happens if the context hasn't initialized prices yet. The initial state sets all stock prices from the mock data, so in practice this shouldn't occur — but an Error Boundary is in place as a safety net.

### Q31. Why does `TradeLimitChecker` have three validation messages (exceedsLimit, exceedsBalance, and the result message)?
**Answer:** They serve different purposes:
1. **exceedsLimit** — shows a red alert when the total exceeds the user-defined trade limit
2. **exceedsBalance** — shows an amber alert when buying costs more than available cash
3. **result** — shows either green success or red error AFTER the trade is attempted
Each can appear independently or simultaneously, giving the user full visibility.

### Q32. How does `TradeLimitChecker` allow adjusting the limit?
**Answer:** It renders an `<input type="number">` with the current `tradeLimit` value. On change, it calls `setLimit(+e.target.value || 0)` from the context, which updates the global trade limit. This is a controlled input pattern — the input reads from state and writes to state.

### Q33. What's the difference between `tradeLimit` validation and `balance` validation in a trade?
**Answer:** `tradeLimit` is a user-configurable safety cap that applies to both BUY and SELL. `balance` is the actual cash available, checked only for BUY orders. A SELL order adds to the balance, so it doesn't exceed it. Both must pass for a BUY to succeed.

---

## React 19 Specifics

### Q34. What's new in React 19 that this project uses?
**Answer:** The project uses React 19's `createRoot` API (not the legacy `ReactDOM.render`). It also benefits from React 19's improved hook behavior and StrictMode improvements. React 19 also ships with better hydration error handling and support for refs as props (not directly leveraged here).

### Q35. What is `createRoot` and why is it used instead of `ReactDOM.render`?
**Answer:** `createRoot` is the React 18+ API that enables concurrent features. `ReactDOM.render` (legacy) is deprecated. `createRoot` creates a React 19 root that can use the new concurrent rendering pipeline, though this app primarily uses synchronous rendering.

### Q36. Why is ESLint configured with `react-hooks/exhaustive-deps`?
**Answer:** The exhaustive-deps rule ensures all values used inside `useEffect`/`useMemo`/`useCallback` are listed in the dependency array. Missing dependencies cause stale closures and hard-to-find bugs. This is the most important React lint rule.

---

## Edge Cases & Defensive Programming

### Q37. What happens if the user types "0" or negative numbers in the shares input?
**Answer:** The `onChange` handler uses `Math.max(1, +e.target.value || 1)`, which clamps to a minimum of 1. If the input is cleared or becomes NaN, it defaults to 1. The "Execute Trade" button is also disabled when `shares < 1`.

### Q38. What if `stocks.find(s => s.id === id)` returns `undefined` in `Watchlist`?
**Answer:** `.filter(Boolean)` at the end of the `watchlistStocks` chain removes any `undefined` entries. So a stock in the watchlist that doesn't exist in the mock data would simply be skipped rather than crashing.

### Q39. What causes the Error Boundary to trigger?
**Answer:** Any error thrown during the render phase of a child component. For example: calling `.toFixed()` on undefined, accessing a property on null, or any exception in a component's `render()` function. The `ErrorBoundary.componentDidCatch` logs the error to console while `getDerivedStateFromError` switches to the fallback UI.

### Q40. What happens if the `ResizeObserver` isn't supported in older browsers?
**Answer:** The `containerHeight` would remain at the default value of `440px`. The virtual scroll would still work but might not fill the exact available space. This is a graceful degradation — not a crash.

### Q41. Why does `updatePrice` have a 100ms throttle guard?
**Answer:** If `simulatePriceUpdate` is somehow called faster than 100ms for the same stock (e.g., if the interval is reduced or multiple triggers fire), the throttle prevents React from receiving too many state updates in quick succession, reducing unnecessary re-renders.

### Q42. How does `filtered.length * ROW_HEIGHT` behave when there are 0 filtered transactions?
**Answer:** Total height becomes 0, and `startIndex` / `endIndex` math produces `NaN` values. However, `Math.max(0, ...)` and `Math.min(filtered.length, ...)` guards handle this — `visibleRows` would be an empty array, and nothing renders. The scrollbar disappears since there's nothing to scroll.

---

## General Viva Questions

### Q43. What problem does this case study solve?
**Answer:** It demonstrates how to build a data-intensive, real-time investment dashboard using modern React patterns. The case study specifically addresses performance challenges: rendering hundreds of transactions without lag (virtual scrolling), updating prices every 800ms without cascading re-renders (SmartWrapper), and computing financial calculations efficiently (useMemo).

### Q44. Why Vite instead of Create React App?
**Answer:** Vite is faster — it uses native ES modules for development (no bundling needed) and Rollup for production builds. CRA is deprecated and uses Webpack which is slower. Vite also has better HMR (Hot Module Replacement) out of the box.

### Q45. How would you connect this to a real backend API?
**Answer:** Replace the `simulatePriceUpdate` interval with a WebSocket connection in a `useEffect`. Replace `generateTransactions` with `fetch("/api/transactions")`. Replace `mockData.js` stocks with an API call. The context structure and all the React patterns would remain the same — showing that the architecture is backend-agnostic.

### Q46. How would you add persistent state (refresh persistence)?
**Answer:** Wrap the context with a `useEffect` that saves state to `localStorage` on every update. On initial load, initialize state from `localStorage` instead of the mock data. Alternatively, use `useSyncExternalStore` (React 18+) for external subscriptions.

### Q47. How would you test this app?
**Answer:** Unit tests for `executeTrade` logic (validation, balance updates), `portfolioValue` calculation, and `filtered` transactions. Component tests for `TransactionHistory` scroll behavior and `TradeLimitChecker` form interactions. Integration tests for the full tab navigation flow. Use Vitest (Vite-native).

### Q48. How would you add TypeScript to this project?
**Answer:** Define interfaces for `Stock`, `Transaction`, `Profile`, and the Context shape. Add type annotations to all hooks and props. This would catch type errors like passing a string where a number is expected (e.g., `shares`).

### Q49. What's a memory leak risk in this app and how is it prevented?
**Answer:** The `setInterval` in `RealTimeTicker` and `setTimeout` for flash animations are memory leak risks. Both are cleaned up in their respective `useEffect` cleanup functions. The `ResizeObserver` also disconnects on unmount.

### Q50. Why use functional components instead of class components?
**Answer:** Hooks (`useState`, `useEffect`, `useMemo`) are only available in functional components. They compose better, have less boilerplate, and the React team has made it clear functional components are the future. The only exception in the codebase is `CalculationSafetyNet` (ErrorBoundary), which must be a class component because there's no hook equivalent for `componentDidCatch` / `getDerivedStateFromError`.

### Q51. How would you scale this to handle 10,000+ stocks?
**Answer:** Currently, all 8 stocks are rendered in the ticker. For 10,000+, you'd need virtual scrolling in the ticker too. The `SmartWrapper` mechanism already isolates per-stock updates, so the rendering architecture would scale. The context would need optimization — currently updating ANY stock price causes the whole context to re-render.

### Q52. Explain the render cycle when a stock price updates.
**Answer:**
1. `simulatePriceUpdate` picks a stock, calculates delta, calls `updatePrice`
2. `updatePrice` calls `setStockPrices(prev => ({...prev, [id]: newPrice}))`
3. Context re-renders (new value object), all consumers get the new `stockPrices`
4. `RealTimeTicker` re-renders, but `SmartWrapper` isolates the update — only ONE `TickerItem` re-renders
5. `InvestorAccountDetails` re-renders because it consumes `stockPrices` — `useMemo` recalculates `portfolioValue`
6. `TradeLimitChecker` re-renders — the selected stock's displayed price updates

### Q53. What's the difference between `render` and `commit` phases?
**Answer:** Render phase: React calls your components, runs hooks, compares the virtual DOM (reconciliation). Commit phase: React applies the changes to the actual DOM and runs `useEffect` cleanup/new effects. Side effects (timers, subscriptions) should only happen in the commit phase, which is why they go in `useEffect`.

### Q54. Why is `priceTimestamps` a `useRef` instead of a state variable?
**Answer:** Because throttle timestamps don't affect the UI — they're purely internal bookkeeping. Using `useRef` avoids unnecessary re-renders when a timestamp is updated. The ref's value persists across renders without being part of the reactive data flow.

### Q55. Why does the header display `balance` from the context?
**Answer:** So the user can always see their current balance, regardless of which tab they're on. This is a UX consideration — financial data should be persistently visible. It also demonstrates that context data can be consumed at any level of the component tree.

### Q56. How would you explain `Recharts` `LineChart`'s `type="monotone"` to a non-technical person?
**Answer:** It draws a smooth line through the data points instead of connecting them with straight lines. "Monotone" means the line won't create unnecessary curves — it produces a clean, natural-looking trend line that doesn't overshoot the actual data points.
