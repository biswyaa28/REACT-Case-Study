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
