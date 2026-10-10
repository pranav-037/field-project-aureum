import React, { useState } from 'react';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isInstitution, setIsInstitution] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // TODO: Implement actual login logic
    // This would call the backend API

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // On success, redirect based on user type
      if (isInstitution) {
        // Redirect to institution dashboard
        window.location.href = '/institution/dashboard';
      } else {
        // Redirect to collector dashboard
        window.location.href = '/collector/dashboard';
      }
    } catch (err) {
      setError('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>Aureum Login</h1>
          <p>Access your account to manage artwork provenance</p>
        </div>

        <div className="login-tabs">
          <button
            className={isInstitution ? 'tab-active' : ''}
            onClick={() => setIsInstitution(true)}
          >
            Institution Login
          </button>
          <button
            className={!isInstitution ? 'tab-active' : ''}
            onClick={() => setIsInstitution(false)}
          >
            Collector Login
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {isInstitution && (
            <div className="form-group">
              <label htmlFor="totp">
                Two-Factor Authentication Code
              </label>
              <input
                type="text"
                id="totp"
                placeholder="Enter 6-digit code from your authenticator app"
                disabled={loading}
              />
            </div>
          )}

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Sign In'}
            </button>
          </div>

          <div className="login-footer">
            <p>
              Don't have an account?{' '}
              <a href="/register">Register here</a>
            </p>
            <p>
              <a href="/forgot-password">Forgot password?</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;