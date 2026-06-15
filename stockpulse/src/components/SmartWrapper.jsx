import React from 'react';

function SmartWrapper({ children, deps }) {
  return React.useMemo(() => children, deps);
}

const SmartComponent = React.memo(({ stockId, price, change, children }) => {
  return <>{children}</>;
});

export default SmartWrapper;
export { SmartComponent };
