/**
* @file DisplayTab.js
* @description Admin panel tab for configuring display appearance settings, including WiFi visibility, upcoming meetings display, meeting titles, dark mode for single-room and flightboard views, and per-client overrides.
*/
import React from 'react';

/** Default translation labels for the Display tab */
const defaultLabels = {
  singleRoomDarkModeLabel: 'Single-Room Dark Mode',
  singleRoomDarkModeHelp: 'Uses the dark visual style for single-room displays.',
  flightboardDarkModeLabel: 'Flightboard Dark Mode',
  flightboardDarkModeHelp: 'Enables the dark visual style for flightboard displays.',
  sidebarTargetClientLabel: 'Target Client',
  sidebarTargetGlobalOption: 'Global default (all displays)',
  sidebarTargetLoading: 'Loading connected clients...',
  sidebarTargetHelp: 'Select a connected client to override Single-Room dark mode only for that client.',
};

/** Resolves a translation key with fallback to default */
function label(t, key) {
  return t[key] || defaultLabels[key] || '';
}

const DisplayTab = ({
  isActive,
  informationLocked,
  t,
  currentShowWiFi,
  currentShowUpcomingMeetings,
  currentShowMeetingTitles,
  currentUpcomingMeetingsCount,
  currentSingleRoomDarkMode,
  currentFlightboardDarkMode,
  currentAutoReloadEnabled,
  currentAutoReloadTime,
  informationLastUpdated,
  sidebarTargetClientId,
  connectedClients,
  connectedClientsLoading,
  showWiFi,
  showUpcomingMeetings,
  showMeetingTitles,
  upcomingMeetingsCount,
  singleRoomDarkMode,
  flightboardDarkMode,
  autoReloadEnabled,
  autoReloadTime,
  informationMessage,
  informationMessageType,
  booleanLabel,
  onTargetClientChange,
  onFieldChange,
  onSubmit
}) => {
  const l = (key) => label(t, key);
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
                <span className="config-label">{l('singleRoomDarkModeLabel')}</span>
                <span className="config-value">{booleanLabel(currentSingleRoomDarkMode)}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{l('flightboardDarkModeLabel')}</span>
                <span className="config-value">{booleanLabel(currentFlightboardDarkMode)}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{l('autoReloadEnabledLabel')}</span>
                <span className="config-value">{currentAutoReloadEnabled ? `${booleanLabel(true)} (${currentAutoReloadTime})` : booleanLabel(false)}</span>
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
                {l('sidebarTargetClientLabel')}
              </label>
              <select
                id="sidebarTargetClientId"
                value={sidebarTargetClientId}
                onChange={onTargetClientChange}
                className="admin-w-full"
              >
                <option value="">{l('sidebarTargetGlobalOption')}</option>
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
                {connectedClientsLoading ? l('sidebarTargetLoading') : l('sidebarTargetHelp')}
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
                <span className="label-text">{l('singleRoomDarkModeLabel')}</span>
                <input
                  type="checkbox"
                  checked={singleRoomDarkMode}
                  onChange={(e) => onFieldChange('singleRoomDarkMode', e.target.checked)}
                />
              </label>
              <small>{l('singleRoomDarkModeHelp')}</small>
            </div>

            <div className="admin-form-group">
              <label className="inline-label">
                <span className="label-text">{l('flightboardDarkModeLabel')}</span>
                <input
                  type="checkbox"
                  checked={flightboardDarkMode}
                  onChange={(e) => onFieldChange('flightboardDarkMode', e.target.checked)}
                />
              </label>
              <small>{l('flightboardDarkModeHelp')}</small>
            </div>

            <hr className="admin-form-divider" />

            <div className="admin-form-group">
              <label className="inline-label">
                <span className="label-text">{l('autoReloadEnabledLabel')}</span>
                <input
                  type="checkbox"
                  checked={autoReloadEnabled}
                  disabled={!!sidebarTargetClientId}
                  onChange={(e) => onFieldChange('autoReloadEnabled', e.target.checked)}
                />
              </label>
              <small>{l('autoReloadEnabledHelp')}</small>
            </div>

            {autoReloadEnabled && (
              <div className="admin-form-group">
                <label htmlFor="autoReloadTime">
                  {l('autoReloadTimeLabel')}
                </label>
                <input
                  id="autoReloadTime"
                  type="time"
                  value={autoReloadTime}
                  disabled={!!sidebarTargetClientId}
                  onChange={(e) => onFieldChange('autoReloadTime', e.target.value)}
                  className="display-time-input"
                />
                <small className="admin-help-text">{l('autoReloadTimeHelp')}</small>
              </div>
            )}
            
            <button 
              type="submit" 
              className="admin-submit-button"
              disabled={
                showWiFi === currentShowWiFi &&
                showUpcomingMeetings === currentShowUpcomingMeetings &&
                showMeetingTitles === currentShowMeetingTitles &&
                parseInt(upcomingMeetingsCount, 10) === currentUpcomingMeetingsCount &&
                singleRoomDarkMode === currentSingleRoomDarkMode &&
                flightboardDarkMode === currentFlightboardDarkMode &&
                autoReloadEnabled === currentAutoReloadEnabled &&
                autoReloadTime === currentAutoReloadTime
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
