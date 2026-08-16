import React from 'react';
import './polish.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Uncaught error:', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.assign('/dashboard');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-page" role="alert">
          <h2>Something went wrong</h2>
          <p>An unexpected error occurred while rendering this page. You can try going back to your dashboard.</p>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              width: 200,
              background: '#0e9394',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: 12,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Back to Dashboard
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
