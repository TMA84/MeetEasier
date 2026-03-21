/**
 * @file RateLimitTab.js
 * @description Admin panel tab for configuring rate limiting rules for API, write, and authentication endpoints, including window duration and maximum request counts.
 */
import React from 'react';

const RateLimitTab = ({
  isActive,
  rateLimitLocked,
  t,
  currentRateLimitApiWindowMs,
  currentRateLimitApiMax,
  currentRateLimitWriteWindowMs,
  currentRateLimitWriteMax,
  currentRateLimitAuthWindowMs,
  currentRateLimitAuthMax,
  rateLimitLastUpdated,
  rateLimitApiWindowMs,
  rateLimitApiMax,
  rateLimitWriteWindowMs,
  rateLimitWriteMax,
  rateLimitAuthWindowMs,
  rateLimitAuthMax,
  rateLimitMessage,
  rateLimitMessageType,
  onRateLimitChange,
  onRateLimitSubmit
}) => {
  return (
    <div className={`admin-tab-content ${isActive ? 'active' : ''}`}>
    <div className="admin-card" id="ops-ratelimit">
      {!rateLimitLocked && (
        <>
          <h3>Rate Limit Configuration</h3>
          <div className="admin-current-config">
            <h3>{t.currentConfigTitle}</h3>
            <div className="config-grid">
              <div className="config-item">
                <span className="config-label">API window (ms)</span>
                <span className="config-value">{currentRateLimitApiWindowMs}</span>
              </div>
              <div className="config-item">
                <span className="config-label">API max</span>
                <span className="config-value">{currentRateLimitApiMax}</span>
              </div>
              <div className="config-item">
                <span className="config-label">Write window (ms)</span>
                <span className="config-value">{currentRateLimitWriteWindowMs}</span>
              </div>
              <div className="config-item">
                <span className="config-label">Write max</span>
                <span className="config-value">{currentRateLimitWriteMax}</span>
              </div>
              <div className="config-item">
                <span className="config-label">Auth window (ms)</span>
                <span className="config-value">{currentRateLimitAuthWindowMs}</span>
              </div>
              <div className="config-item">
                <span className="config-label">Auth max</span>
                <span className="config-value">{currentRateLimitAuthMax}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{t.lastUpdatedLabel}</span>
                <span className="config-value">{rateLimitLastUpdated || '-'}</span>
              </div>
            </div>
          </div>

          <form onSubmit={onRateLimitSubmit}>
            <div className="admin-form-group">
              <label htmlFor="rateLimitApiWindowMs">API window (ms)</label>
              <input
                id="rateLimitApiWindowMs"
                type="number"
                min="1000"
                step="1000"
                value={rateLimitApiWindowMs}
                onChange={(e) => onRateLimitChange('rateLimitApiWindowMs', Math.max(parseInt(e.target.value, 10) || 1000, 1000))}
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="rateLimitApiMax">API max requests</label>
              <input
                id="rateLimitApiMax"
                type="number"
                min="1"
                value={rateLimitApiMax}
                onChange={(e) => onRateLimitChange('rateLimitApiMax', Math.max(parseInt(e.target.value, 10) || 1, 1))}
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="rateLimitWriteWindowMs">Write window (ms)</label>
              <input
                id="rateLimitWriteWindowMs"
                type="number"
                min="1000"
                step="1000"
                value={rateLimitWriteWindowMs}
                onChange={(e) => onRateLimitChange('rateLimitWriteWindowMs', Math.max(parseInt(e.target.value, 10) || 1000, 1000))}
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="rateLimitWriteMax">Write max requests</label>
              <input
                id="rateLimitWriteMax"
                type="number"
                min="1"
                value={rateLimitWriteMax}
                onChange={(e) => onRateLimitChange('rateLimitWriteMax', Math.max(parseInt(e.target.value, 10) || 1, 1))}
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="rateLimitAuthWindowMs">Auth window (ms)</label>
              <input
                id="rateLimitAuthWindowMs"
                type="number"
                min="1000"
                step="1000"
                value={rateLimitAuthWindowMs}
                onChange={(e) => onRateLimitChange('rateLimitAuthWindowMs', Math.max(parseInt(e.target.value, 10) || 1000, 1000))}
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="rateLimitAuthMax">Auth max requests</label>
              <input
                id="rateLimitAuthMax"
                type="number"
                min="1"
                value={rateLimitAuthMax}
                onChange={(e) => onRateLimitChange('rateLimitAuthMax', Math.max(parseInt(e.target.value, 10) || 1, 1))}
              />
            </div>

            <button 
              type="submit" 
              className="admin-submit-button"
              disabled={
                parseInt(rateLimitApiWindowMs, 10) === currentRateLimitApiWindowMs &&
                parseInt(rateLimitApiMax, 10) === currentRateLimitApiMax &&
                parseInt(rateLimitWriteWindowMs, 10) === currentRateLimitWriteWindowMs &&
                parseInt(rateLimitWriteMax, 10) === currentRateLimitWriteMax &&
                parseInt(rateLimitAuthWindowMs, 10) === currentRateLimitAuthWindowMs &&
                parseInt(rateLimitAuthMax, 10) === currentRateLimitAuthMax
              }
            >
              Save Rate Limit Configuration
            </button>
          </form>

          {rateLimitMessage && (
            <div className={`admin-message admin-message-${rateLimitMessageType}`}>
              {rateLimitMessage}
            </div>
          )}

          <div className="admin-form-divider"></div>
        </>
      )}

      {rateLimitLocked && (
        <>
          <h3>Rate Limit Configuration</h3>
          <div className="admin-locked-message">
            <p>{t.configuredViaEnv}</p>
          </div>
          <div className="admin-form-divider"></div>
        </>
      )}
    </div>
    </div>
  );
};

export default RateLimitTab;
