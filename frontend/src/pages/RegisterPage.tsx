import React, { useState } from 'react';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'institution' // or 'collector'
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    const { name, value, type } = target;

    if (type === 'checkbox' && target instanceof HTMLInputElement) {
      setFormData(prev => ({
        ...prev,
        [name]: target.checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // TODO: Implement actual registration logic
    // This would call the backend API

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      // On success, redirect to login
      window.location.href = '/login';
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-header">
          <h1>Create Aureum Account</h1>
          <p>Join our network of trusted authenticators and collectors</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="userType">Account Type</label>
            <select
              id="userType"
              name="userType"
              value={formData.userType}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="institution">Institution (Gallery, Auction House, Lab)</option>
              <option value="collector">Collector / Individual</option>
            </select>
          </div>

          {formData.userType === 'institution' && (
            <>
              <div className="form-group">
                <label htmlFor="institutionName">Institution Name</label>
                <input
                  type="text"
                  id="institutionName"
                  placeholder="e.g., Sotheby's, Christie's, or your gallery name"
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="jurisdiction">Jurisdiction</label>
                <input
                  type="text"
                  id="jurisdiction"
                  placeholder="Country and/or state"
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="registrationNumber">Registration Number</label>
                <input
                  type="text"
                  id="registrationNumber"
                  placeholder="Business registration or license number"
                  disabled={loading}
                />
              </div>
            </>
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
              {loading ? 'Creating account...' : 'Register'}
            </button>
          </div>

          <div className="register-footer">
            <p>
              Already have an account?{' '}
              <a href="/login">Sign in here</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;