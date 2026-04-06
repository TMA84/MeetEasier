/**
* @file BookingTab.js
* @description Admin panel tab for configuring room booking settings, including enable/disable booking, meeting extension, check-in options, and per-room or per-room-group feature flag overrides.
*/
import React from 'react';

/** Default translation labels for the Booking tab override sections */
const overrideDefaults = {
  roomGroupFeatureFlagsLabel: 'Room Group Overrides',
  roomGroupFeatureFlagsHelp: 'Optional: Override booking/extend per room group alias (e.g. roomlist-building-a).',
  roomFeatureFlagsLabel: 'Room Overrides',
  roomFeatureFlagsHelp: 'Optional: Override booking/extend per room email.',
  addOverrideButtonLabel: 'Add',
  inheritOverrideLabel: 'Inherit',
  enabledOverrideLabel: 'Enabled',
  disabledOverrideLabel: 'Disabled',
  removeOverrideButtonLabel: 'Remove',
};

/** Resolves a translation key with fallback to override defaults */
function oLabel(t, key) {
  return t[key] || overrideDefaults[key] || '';
}

const OverrideSection = ({ type, t, entries, availableOptions, newOverrideKey, onOverrideDraftChange, onAddOverride, onOverrideStateChange, onRemoveOverride, toOverrideState, placeholder, selectLabel, noOverridesLabel }) => {
  const isGroup = type === 'group';
  return (
  <div className="admin-form-group">
    <label>{oLabel(t, isGroup ? 'roomGroupFeatureFlagsLabel' : 'roomFeatureFlagsLabel')}</label>
    <small>{oLabel(t, isGroup ? 'roomGroupFeatureFlagsHelp' : 'roomFeatureFlagsHelp')}</small>
    {availableOptions.length > 0 && (
      <div className="booking-override-select-wrapper">
        <select value={newOverrideKey} onChange={(e) => onOverrideDraftChange(type, e.target.value)} className="booking-override-select">
          <option value="">{selectLabel}</option>
          {availableOptions.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
        </select>
      </div>
    )}
    <div className="booking-override-add-row">
      <input type="text" value={newOverrideKey} onChange={(e) => onOverrideDraftChange(type, e.target.value)} placeholder={placeholder} />
      <button type="button" className="admin-secondary-button" onClick={() => onAddOverride(type)}>{oLabel(t, 'addOverrideButtonLabel')}</button>
    </div>
    {entries.length === 0 ? (
      <div className="admin-locked-message admin-mb-1"><p>{noOverridesLabel}</p></div>
    ) : entries.map(([key, value]) => (
      <div key={key} className="booking-override-grid">
        <input type="text" value={key} readOnly />
        <select value={toOverrideState(value?.enableBooking)} onChange={(e) => onOverrideStateChange(type, key, 'enableBooking', e.target.value)}>
          <option value="inherit">{oLabel(t, 'inheritOverrideLabel')}</option>
          <option value="enabled">{oLabel(t, 'enabledOverrideLabel')}</option>
          <option value="disabled">{oLabel(t, 'disabledOverrideLabel')}</option>
        </select>
        <select value={toOverrideState(value?.enableExtendMeeting)} onChange={(e) => onOverrideStateChange(type, key, 'enableExtendMeeting', e.target.value)}>
          <option value="inherit">{oLabel(t, 'inheritOverrideLabel')}</option>
          <option value="enabled">{oLabel(t, 'enabledOverrideLabel')}</option>
          <option value="disabled">{oLabel(t, 'disabledOverrideLabel')}</option>
        </select>
        <button type="button" className="admin-secondary-button" onClick={() => onRemoveOverride(type, key)}>{oLabel(t, 'removeOverrideButtonLabel')}</button>
      </div>
    ))}
  </div>
  );
};

const CheckInSettings = ({ checkInEnabled, checkInRequiredForExternalMeetings, checkInEarlyMinutes, checkInWindowMinutes, checkInAutoReleaseNoShow, onFieldChange }) => (
  <div>
    <div className="admin-form-group">
      <label className="inline-label"><span className="label-text">Check-in aktivieren</span><input type="checkbox" checked={checkInEnabled} onChange={(e) => onFieldChange('checkInEnabled', e.target.checked)} /></label>
      <small>Aktiviert den Check-in-Button für relevante Meetings.</small>
    </div>
    <div className="admin-form-group">
      <label className="inline-label"><span className="label-text">Nur externe Meetings benötigen Check-in</span><input type="checkbox" checked={checkInRequiredForExternalMeetings} onChange={(e) => onFieldChange('checkInRequiredForExternalMeetings', e.target.checked)} disabled={!checkInEnabled} /></label>
      <small>Empfohlen: Display-erstellte Buchungen bleiben ohne Check-in/no-show.</small>
    </div>
    <div className="admin-form-group">
      <label htmlFor="checkInEarlyMinutes">Check-in ab Minuten vor Start</label>
      <input id="checkInEarlyMinutes" type="number" min="0" value={checkInEarlyMinutes} onChange={(e) => onFieldChange('checkInEarlyMinutes', Math.max(parseInt(e.target.value, 10) || 0, 0))} disabled={!checkInEnabled} />
      <small>Standard: 5 Minuten vor Terminbeginn.</small>
    </div>
    <div className="admin-form-group">
      <label htmlFor="checkInWindowMinutes">Check-in-Fenster nach Start (Minuten)</label>
      <input id="checkInWindowMinutes" type="number" min="1" value={checkInWindowMinutes} onChange={(e) => onFieldChange('checkInWindowMinutes', Math.max(parseInt(e.target.value, 10) || 1, 1))} disabled={!checkInEnabled} />
      <small>Nach Ablauf gilt das Meeting als No-Show (wenn aktiviert).</small>
    </div>
    <div className="admin-form-group">
      <label className="inline-label"><span className="label-text">No-Show automatisch freigeben</span><input type="checkbox" checked={checkInAutoReleaseNoShow} onChange={(e) => onFieldChange('checkInAutoReleaseNoShow', e.target.checked)} disabled={!checkInEnabled} /></label>
      <small>Löscht nicht bestätigte externe Meetings automatisch nach Ablauf des Fensters.</small>
    </div>
  </div>
);

/** Checks if the booking form has unchanged values (submit should be disabled) */
function isBookingFormUnchanged(props) {
  const { bookingPermissionMissing, enableBooking, currentEnableBooking, enableExtendMeeting, currentEnableExtendMeeting, checkInEnabled, currentCheckInEnabled, checkInRequiredForExternalMeetings, currentCheckInRequiredForExternalMeetings, checkInEarlyMinutes, currentCheckInEarlyMinutes, checkInWindowMinutes, currentCheckInWindowMinutes, checkInAutoReleaseNoShow, currentCheckInAutoReleaseNoShow, roomFeatureFlags, currentRoomFeatureFlags, roomGroupFeatureFlags, currentRoomGroupFeatureFlags } = props;
  if (bookingPermissionMissing) return true;
  return enableBooking === currentEnableBooking
    && enableExtendMeeting === currentEnableExtendMeeting
    && checkInEnabled === currentCheckInEnabled
    && checkInRequiredForExternalMeetings === currentCheckInRequiredForExternalMeetings
    && parseInt(checkInEarlyMinutes, 10) === currentCheckInEarlyMinutes
    && parseInt(checkInWindowMinutes, 10) === currentCheckInWindowMinutes
    && checkInAutoReleaseNoShow === currentCheckInAutoReleaseNoShow
    && JSON.stringify(roomFeatureFlags) === JSON.stringify(currentRoomFeatureFlags)
    && JSON.stringify(roomGroupFeatureFlags) === JSON.stringify(currentRoomGroupFeatureFlags);
}

/** Default labels for BookingTab override section props */
const bookingDefaults = {
  roomGroupOverridePlaceholder: 'room group alias',
  selectRoomGroupLabel: 'Select room group',
  noRoomGroupOverridesLabel: 'No room-group overrides configured.',
  roomOverridePlaceholder: 'room@domain.com',
  selectRoomLabel: 'Select room',
  noRoomOverridesLabel: 'No room overrides configured.',
  overridePreviewLabel: 'Override Preview',
};

function bLabel(t, key) {
  return t[key] || bookingDefaults[key] || '';
}

const BookingTab = ({
  isActive,
  bookingLocked,
  t,
  bookingPermissionMissing,
  currentEnableBooking,
  currentEnableExtendMeeting,
  currentCheckInEnabled,
  currentCheckInRequiredForExternalMeetings,
  currentCheckInEarlyMinutes,
  currentCheckInWindowMinutes,
  currentCheckInAutoReleaseNoShow,
  bookingLastUpdated,
  currentRoomFeatureFlags,
  currentRoomGroupFeatureFlags,
  enableBooking,
  enableExtendMeeting,
  checkInEnabled,
  checkInRequiredForExternalMeetings,
  checkInEarlyMinutes,
  checkInWindowMinutes,
  checkInAutoReleaseNoShow,
  roomFeatureFlags,
  roomGroupFeatureFlags,
  availableRoomGroupOptions,
  newRoomGroupOverrideKey,
  roomGroupOverrideEntries,
  availableRoomOptions,
  newRoomOverrideKey,
  roomOverrideEntries,
  bookingMessage,
  bookingMessageType,
  booleanLabel,
  toOverrideState,
  onFieldChange,
  onOverrideDraftChange,
  onAddOverride,
  onOverrideStateChange,
  onRemoveOverride,
  onSubmit
}) => {
  return (
    <div className={`admin-tab-content ${isActive ? 'active' : ''}`}>
      {!bookingLocked && (
        <div className="admin-section">
          <h2>{t.bookingSectionTitle}</h2>
          
          {bookingPermissionMissing && (
            <div className="admin-message admin-message-warning admin-mb-1">
              <div>
                <strong>Permission Missing:</strong> Calendars.ReadWrite permission is not granted in Azure AD. 
                The booking feature is automatically disabled. Please grant this permission to enable room booking.
              </div>
            </div>
          )}
          
          <div className="admin-current-config">
            <h3>{t.currentConfigTitle}</h3>
            <div className="config-grid">
              <div className="config-item">
                <span className="config-label">{t.enableBookingLabel}</span>
                <span className="config-value">{booleanLabel(currentEnableBooking)}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{t.enableExtendMeetingLabel}</span>
                <span className="config-value">{booleanLabel(currentEnableExtendMeeting)}</span>
              </div>
              <div className="config-item">
                <span className="config-label">Check-in enabled</span>
                <span className="config-value">{booleanLabel(currentCheckInEnabled)}</span>
              </div>
              <div className="config-item">
                <span className="config-label">Check-in external only</span>
                <span className="config-value">{booleanLabel(currentCheckInRequiredForExternalMeetings)}</span>
              </div>
              <div className="config-item">
                <span className="config-label">Check-in starts before meeting</span>
                <span className="config-value">{currentCheckInEarlyMinutes} min</span>
              </div>
              <div className="config-item">
                <span className="config-label">Check-in window after start</span>
                <span className="config-value">{currentCheckInWindowMinutes} min</span>
              </div>
              <div className="config-item">
                <span className="config-label">Auto-release on no-show</span>
                <span className="config-value">{booleanLabel(currentCheckInAutoReleaseNoShow)}</span>
              </div>

              {bookingPermissionMissing && (
                <div className="config-item">
                  <span className="config-label">Status</span>
                  <span className="config-value booking-permission-status">Disabled (Permission Missing)</span>
                </div>
              )}
              <div className="config-item">
                <span className="config-label">{t.lastUpdatedLabel}</span>
                <span className="config-value">{bookingLastUpdated}</span>
              </div>
            </div>
          </div>

          <form onSubmit={onSubmit}>
            <div className="admin-form-group">
              <label className="inline-label">
                <span className="label-text">{t.enableBookingLabel}</span>
                <input
                  type="checkbox"
                  checked={enableBooking}
                  onChange={(e) => onFieldChange('enableBooking', e.target.checked)}
                  disabled={bookingPermissionMissing}
                />
              </label>
              <small>
                {bookingPermissionMissing 
                  ? 'Cannot enable: Calendars.ReadWrite permission is missing'
                  : t.enableBookingHelp
                }
              </small>
            </div>

            <div className="admin-form-group">
              <label className="inline-label">
                <span className="label-text">{t.enableExtendMeetingLabel}</span>
                <input
                  type="checkbox"
                  checked={enableExtendMeeting}
                  onChange={(e) => onFieldChange('enableExtendMeeting', e.target.checked)}
                />
              </label>
              <small>{t.enableExtendMeetingHelp}</small>
            </div>

            <div className="admin-form-divider"></div>

            <CheckInSettings checkInEnabled={checkInEnabled} checkInRequiredForExternalMeetings={checkInRequiredForExternalMeetings} checkInEarlyMinutes={checkInEarlyMinutes} checkInWindowMinutes={checkInWindowMinutes} checkInAutoReleaseNoShow={checkInAutoReleaseNoShow} onFieldChange={onFieldChange} />

            <OverrideSection type="group" t={t} entries={roomGroupOverrideEntries} availableOptions={availableRoomGroupOptions} newOverrideKey={newRoomGroupOverrideKey} onOverrideDraftChange={onOverrideDraftChange} onAddOverride={onAddOverride} onOverrideStateChange={onOverrideStateChange} onRemoveOverride={onRemoveOverride} toOverrideState={toOverrideState} placeholder={bLabel(t, 'roomGroupOverridePlaceholder')} selectLabel={bLabel(t, 'selectRoomGroupLabel')} noOverridesLabel={bLabel(t, 'noRoomGroupOverridesLabel')} />

            <OverrideSection type="room" t={t} entries={roomOverrideEntries} availableOptions={availableRoomOptions} newOverrideKey={newRoomOverrideKey} onOverrideDraftChange={onOverrideDraftChange} onAddOverride={onAddOverride} onOverrideStateChange={onOverrideStateChange} onRemoveOverride={onRemoveOverride} toOverrideState={toOverrideState} placeholder={bLabel(t, 'roomOverridePlaceholder')} selectLabel={bLabel(t, 'selectRoomLabel')} noOverridesLabel={bLabel(t, 'noRoomOverridesLabel')} />

            {(currentRoomFeatureFlags && Object.keys(currentRoomFeatureFlags).length > 0) || (currentRoomGroupFeatureFlags && Object.keys(currentRoomGroupFeatureFlags).length > 0) ? (
              <div className="admin-current-config admin-mb-15">
                <h3>{t.currentConfigTitle} - {bLabel(t, 'overridePreviewLabel')}</h3>
                <pre className="admin-json-pre">{JSON.stringify({ roomGroupFeatureFlags: currentRoomGroupFeatureFlags, roomFeatureFlags: currentRoomFeatureFlags }, null, 2)}</pre>
              </div>
            ) : null}

            <button 
              type="submit" 
              className="admin-submit-button"
              disabled={isBookingFormUnchanged({ bookingPermissionMissing, enableBooking, currentEnableBooking, enableExtendMeeting, currentEnableExtendMeeting, checkInEnabled, currentCheckInEnabled, checkInRequiredForExternalMeetings, currentCheckInRequiredForExternalMeetings, checkInEarlyMinutes, currentCheckInEarlyMinutes, checkInWindowMinutes, currentCheckInWindowMinutes, checkInAutoReleaseNoShow, currentCheckInAutoReleaseNoShow, roomFeatureFlags, currentRoomFeatureFlags, roomGroupFeatureFlags, currentRoomGroupFeatureFlags })}
            >
              {t.submitBookingButton}
            </button>
          </form>

          {bookingMessage && (
            <div className={`admin-message admin-message-${bookingMessageType}`}>
              {bookingMessage}
            </div>
          )}
        </div>
      )}

      {bookingLocked && (
        <div className="admin-section">
          <h2>{t.bookingSectionTitle}</h2>
          <div className="admin-locked-message">
            <p>{t.configuredViaEnv}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingTab;
