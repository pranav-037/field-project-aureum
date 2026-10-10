import React, { useState } from 'react';
import { artworkApi } from '../services/api';

const ArtworkRegistration: React.FC = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    year: '',
    medium: '',
    dimensions: '',
    edition: '',
    authenticationMethod: '',
    bindingReference: '',
    images: [],
    documents: []
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target;
    const { name, value, type } = target as { name: string; value: any; type: string };

    if (name === 'images' || name === 'documents') {
      // Handle file input - only HTMLInputElement has files property
      const inputElement = target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: Array.from(inputElement.files || [])
      }));
    } else if (type === 'checkbox') {
      // Only HTMLInputElement has checked property for checkboxes
      const inputElement = target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: inputElement.checked
      }));
    } else {
      // For text, textarea, select elements
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

    try {
      // Prepare artwork data for API submission
      const artworkData = {
        title: formData.title,
        artist: formData.artist,
        year: formData.year || undefined,
        medium: formData.medium,
        dimensions: formData.dimensions,
        // For now, we'll use a fixed ownerId - in a real app this would come from auth
        ownerId: 'cmv2apebh00007u4anbsv0wmj' // This is the test user we created earlier
      };

      // Call the actual API
      await artworkApi.create(artworkData);

      // On success, show confirmation or redirect
      alert('Artwork registration submitted successfully!');
      // Reset form or redirect to step 1
      setStep(1);
      setFormData({
        title: '',
        artist: '',
        year: '',
        medium: '',
        dimensions: '',
        edition: '',
        authenticationMethod: '',
        bindingReference: '',
        images: [],
        documents: []
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goToStep = (stepNumber: number) => {
    setStep(stepNumber);
  };

  return (
    <div className="artwork-registration">
      <div className="registration-header">
        <h1>Register New Artwork</h1>
        <p>Create a Genesis record for a verified artwork</p>
      </div>

      <div className="registration-steps">
        <div className="step-indicators">
          <div className={step >= 1 ? 'step-active' : 'step'}>1. Artwork Details</div>
          <div className="step-separator">→</div>
          <div className={step >= 2 ? 'step-active' : 'step'}>2. Authentication</div>
          <div className="step-separator">→</div>
          <div className={step >= 3 ? 'step-active' : 'step'}>3. Documentation</div>
          <div className="step-separator">→</div>
          <div className={step >= 4 ? 'step-active' : 'step'}>4. Submission</div>
        </div>
      </div>

      <div className="registration-form">
        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}
        {step === 1 && (
          <div className="step-content">
            <h2>Artwork Details</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="title">Title *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="artist">Artist *</label>
                <input
                  type="text"
                  id="artist"
                  name="artist"
                  value={formData.artist}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="year">Year or Date</label>
                <input
                  type="text"
                  id="year"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="e.g., 1889, circa 1490s"
                />
              </div>

              <div className="form-group">
                <label htmlFor="medium">Medium *</label>
                <input
                  type="text"
                  id="medium"
                  name="medium"
                  value={formData.medium}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="dimensions">Dimensions *</label>
                <input
                  type="text"
                  id="dimensions"
                  name="dimensions"
                  value={formData.dimensions}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  placeholder="e.g., 73.7 cm × 92.1 cm"
                />
              </div>

              <div className="form-group">
                <label htmlFor="edition">Edition (if applicable)</label>
                <input
                  type="text"
                  id="edition"
                  name="edition"
                  value={formData.edition}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => goToStep(2)}
                  disabled={loading}
                >
                  Next: Authentication
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 2 && (
          <div className="step-content">
            <h2>Authentication Details</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="authenticationMethod">Authentication Method *</label>
                <select
                  id="authenticationMethod"
                  name="authenticationMethod"
                  value={formData.authenticationMethod}
                  onChange={handleChange}
                  required
                  disabled={loading}
                >
                  <option value="">Select authentication method</option>
                  <option value="connoisseurship">Connoisseurship Review</option>
                  <option value="scientific">Scientific Analysis</option>
                  <option value="catalogue_raisonne">Catalogue Raisonné Match</option>
                  <option value="historical_documentation">Historical Documentation</option>
                  <option value="technical_examination">Technical Examination</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="bindingReference">Binding Reference</label>
                <textarea
                  id="bindingReference"
                  name="bindingReference"
                  value={formData.bindingReference}
                  onChange={handleChange}
                  disabled={loading}
                  rows={4}
                  placeholder="Describe how the physical artwork is linked to its digital identity (e.g., unique label ID, photographic fingerprint set)"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => goToStep(1)}
                  disabled={loading}
                >
                  Previous: Details
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => goToStep(3)}
                  disabled={loading}
                >
                  Next: Documentation
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 3 && (
          <div className="step-content">
            <h2>Supporting Documentation</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="images">Images (JPEG, PNG, TIFF) *</label>
                <input
                  type="file"
                  id="images"
                  name="images"
                  accept=".jpg,.jpeg,.png,.tiff"
                  multiple
                  onChange={handleChange}
                  disabled={loading}
                />
                <p className="help-text">Upload high-resolution images showing the artwork from multiple angles, including details, signatures, and verso/back.</p>
              </div>

              <div className="form-group">
                <label htmlFor="documents">Supporting Documents (PDF) *</label>
                <input
                  type="file"
                  id="documents"
                  name="documents"
                  accept=".pdf"
                  multiple
                  onChange={handleChange}
                  disabled={loading}
                />
                <p className="help-text">Certificates of authenticity, provenance documents, expert reports, etc.</p>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => goToStep(2)}
                  disabled={loading}
                >
                  Previous: Authentication
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  Submit for Review
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 4 && (
          <div className="step-content">
            <h2>Review & Submit</h2>
            <div className="review-summary">
              <div className="review-section">
                <h3>Artwork Details</h3>
                <p><strong>Title:</strong> {formData.title}</p>
                <p><strong>Artist:</strong> {formData.artist}</p>
                <p><strong>Year:</strong> {formData.year || 'Not specified'}</p>
                <p><strong>Medium:</strong> {formData.medium}</p>
                <p><strong>Dimensions:</strong> {formData.dimensions}</p>
                <p><strong>Edition:</strong> {formData.edition || 'Not specified'}</p>
              </div>

              <div className="review-section">
                <h3>Authentication</h3>
                <p><strong>Method:</strong> {formData.authenticationMethod}</p>
                <p><strong>Binding Reference:</strong> {formData.bindingReference || 'Not provided'}</p>
              </div>

              <div className="review-section">
                <h3>Documentation</h3>
                <p><strong>Images:</strong> {formData.images.length} file(s)</p>
                <p><strong>Documents:</strong> {formData.documents.length} file(s)</p>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => goToStep(3)}
                disabled={loading}
              >
                Back to Documentation
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  // Reset form
                  setStep(1);
                  setFormData({
                    title: '',
                    artist: '',
                    year: '',
                    medium: '',
                    dimensions: '',
                    edition: '',
                    authenticationMethod: '',
                    bindingReference: '',
                    images: [],
                    documents: []
                  });
                }}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={loading}
              >
                Create Genesis Record
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtworkRegistration;