/**
 * @file DisplayTab.js
 * @description Admin panel tab for configuring display appearance settings, including WiFi visibility, upcoming meetings display, meeting titles, dark mode for single-room and flightboard views, and per-client overrides.
 */
import React from 'react';

const DisplayTab = ({
  isActive,
  informationLocked,
  t,
  currentShowWiFi,
  currentShowUpcomingMeetings,
  currentShowMeetingTitles,
  currentUpcomingMeetingsCount,
  currentMinimalHeaderStyle,
  currentSingleRoomDarkMode,
  currentFlightboardDarkMode,
  informationLastUpdated,
  sidebarTargetClientId,
  connectedClients,
  connectedClientsLoading,
  showWiFi,
  showUpcomingMeetings,
  showMeetingTitles,
  upcomingMeetingsCount,
  minimalHeaderStyle,
  singleRoomDarkMode,
  flightboardDarkMode,
  informationMessage,
  informationMessageType,
  booleanLabel,
  onTargetClientChange,
  onFieldChange,
  onSubmit
}) => {
  return (
    <div className={`admin-tab-content ${isActive ? 'active' : ''}`}>
      {!informationLocked && (
        <div className="admin-section">
          <h2>{t.sidebarSectionTitle}</h2>
          
          <div className="admin-current-config">
            <h3>{t.currentConfigTitle}</h3>
            <div className="config-grid">
              <div className="config-item">
                <span className="config-label">{t.showWiFiLabel}</span>
                <span className="config-value">{booleanLabel(currentShowWiFi)}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{t.showUpcomingMeetingsLabel}</span>
                <span className="config-value">{booleanLabel(currentShowUpcomingMeetings)}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{t.showMeetingTitlesLabel}</span>
                <span className="config-value">{booleanLabel(currentShowMeetingTitles)}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{t.upcomingMeetingsCountLabel}</span>
                <span className="config-value">{currentUpcomingMeetingsCount}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{t.minimalHeaderStyleLabel}</span>
                <span className="config-value">{currentMinimalHeaderStyle === 'filled' ? t.minimalHeaderStyleFilled : t.minimalHeaderStyleTransparent}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{t.singleRoomDarkModeLabel || 'Single-Room Dark Mode'}</span>
                <span className="config-value">{booleanLabel(currentSingleRoomDarkMode)}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{t.flightboardDarkModeLabel || 'Flightboard Dark Mode'}</span>
                <span className="config-value">{booleanLabel(currentFlightboardDarkMode)}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{t.lastUpdatedLabel}</span>
                <span className="config-value">{informationLastUpdated}</span>
              </div>
            </div>
          </div>

          <form onSubmit={onSubmit}>
            <div className="admin-form-group">
              <label htmlFor="sidebarTargetClientId">
                {t.sidebarTargetClientLabel || 'Target Client'}
              </label>
              <select
                id="sidebarTargetClientId"
                value={sidebarTargetClientId}
                onChange={onTargetClientChange}
                className="admin-w-full"
              >
                <option value="">{t.sidebarTargetGlobalOption || 'Global default (all displays)'}</option>
                {(connectedClients || []).map((client) => {
                  const clientId = String(client?.clientId || '');
                  const displayType = String(client?.displayType || 'unknown');
                  const roomAlias = String(client?.roomAlias || '').trim();
                  const roomInfo = roomAlias ? ` · ${roomAlias}` : '';
                  return (
                    <option key={clientId} value={clientId}>
                      {`${clientId} (${displayType}${roomInfo})`}
                    </option>
                  );
                })}
              </select>
              <small className="admin-help-text">
                {connectedClientsLoading
                  ? (t.sidebarTargetLoading || 'Loading connected clients...')
                  : (t.sidebarTargetHelp || 'Select a connected client to override Single-Room dark mode only for that client.')}
              </small>
            </div>

            <hr className="admin-form-divider" />

            <div className="admin-form-group">
              <label className="inline-label">
                <span className="label-text">{t.showWiFiLabel}</span>
                <input
                  type="checkbox"
                  checked={showWiFi}
                  disabled={!!sidebarTargetClientId}
                  onChange={(e) => onFieldChange('showWiFi', e.target.checked)}
                />
              </label>
            </div>
            
            <div className="admin-form-group">
              <label className="inline-label">
                <span className="label-text">{t.showUpcomingMeetingsLabel}</span>
                <input
                  type="checkbox"
                  checked={showUpcomingMeetings}
                  disabled={!!sidebarTargetClientId}
                  onChange={(e) => onFieldChange('showUpcomingMeetings', e.target.checked)}
                />
              </label>
            </div>
            
            <hr className="admin-form-divider" />
            
            <div className="admin-form-group">
              <label className="inline-label">
                <span className="label-text">{t.showMeetingTitlesLabel}</span>
                <input
                  type="checkbox"
                  checked={showMeetingTitles}
                  disabled={!!sidebarTargetClientId}
                  onChange={(e) => onFieldChange('showMeetingTitles', e.target.checked)}
                />
              </label>
              <small>{t.showMeetingTitlesHelp}</small>
            </div>

            <div className="admin-form-group">
              <label htmlFor="upcomingMeetingsCount">
                {t.upcomingMeetingsCountLabel}
              </label>
              <input
                id="upcomingMeetingsCount"
                type="number"
                min="1"
                max="10"
                value={upcomingMeetingsCount}
                disabled={!!sidebarTargetClientId}
                onChange={(e) => onFieldChange('upcomingMeetingsCount', e.target.value)}
                className="display-input-narrow"
              />
              <small className="admin-help-text">{t.upcomingMeetingsCountHelp}</small>
            </div>
            
            <hr className="admin-form-divider" />
            
            <div className="admin-form-group">
              <label className="inline-label">
                <span className="label-text">{t.singleRoomDarkModeLabel || 'Single-Room Dark Mode'}</span>
                <input
                  type="checkbox"
                  checked={singleRoomDarkMode}
                  onChange={(e) => onFieldChange('singleRoomDarkMode', e.target.checked)}
                />
              </label>
              <small>{t.singleRoomDarkModeHelp || 'Uses the dark visual style for single-room displays.'}</small>
            </div>

            {singleRoomDarkMode && (
              <div className="admin-form-group">
                <label>
                  {t.minimalHeaderStyleLabel}
                </label>
                <small className="display-header-style-help">
                  {t.minimalHeaderStyleHelp}
                </small>
                <label className="inline-label">
                  <span className="label-text">{t.minimalHeaderStyleFilled}</span>
                  <input
                    type="radio"
                    name="minimalHeaderStyle"
                    value="filled"
                    checked={minimalHeaderStyle === 'filled'}
                    disabled={!!sidebarTargetClientId}
                    onChange={(e) => onFieldChange('minimalHeaderStyle', e.target.value)}
                  />
                </label>
                <label className="inline-label admin-inline-label-mt">
                  <span className="label-text">{t.minimalHeaderStyleTransparent}</span>
                  <input
                    type="radio"
                    name="minimalHeaderStyle"
                    value="transparent"
                    checked={minimalHeaderStyle === 'transparent'}
                    disabled={!!sidebarTargetClientId}
                    onChange={(e) => onFieldChange('minimalHeaderStyle', e.target.value)}
                  />
                </label>
              </div>
            )}

            {!singleRoomDarkMode && (
              <div className="admin-form-group">
                <small className="display-dark-mode-hint">
                  {t.minimalHeaderStyleDarkModeRequired}
                </small>
              </div>
            )}

            <hr className="admin-form-divider" />

            <div className="admin-form-group">
              <label className="inline-label">
                <span className="label-text">{t.flightboardDarkModeLabel || 'Flightboard Dark Mode'}</span>
                <input
                  type="checkbox"
                  checked={flightboardDarkMode}
                  onChange={(e) => onFieldChange('flightboardDarkMode', e.target.checked)}
                />
              </label>
              <small>{t.flightboardDarkModeHelp || 'Enables the dark visual style for flightboard displays.'}</small>
            </div>
            
            <button 
              type="submit" 
              className="admin-submit-button"
              disabled={
                showWiFi === currentShowWiFi &&
                showUpcomingMeetings === currentShowUpcomingMeetings &&
                showMeetingTitles === currentShowMeetingTitles &&
                parseInt(upcomingMeetingsCount, 10) === currentUpcomingMeetingsCount &&
                minimalHeaderStyle === currentMinimalHeaderStyle &&
                singleRoomDarkMode === currentSingleRoomDarkMode &&
                flightboardDarkMode === currentFlightboardDarkMode
              }
            >
              {t.submitSidebarButton}
            </button>
          </form>

          {informationMessage && (
            <div className={`admin-message admin-message-${informationMessageType}`}>
              {informationMessage}
            </div>
          )}
        </div>
      )}

      {informationLocked && (
        <div className="admin-section">
          <h2>{t.sidebarSectionTitle}</h2>
          <div className="admin-locked-message">
            <p>{t.configuredViaEnv}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisplayTab;
