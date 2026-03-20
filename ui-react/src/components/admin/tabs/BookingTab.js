/**
 * @file BookingTab.js
 * @description Admin panel tab for configuring room booking settings, including enable/disable booking, meeting extension, check-in options, and per-room or per-room-group feature flag overrides.
 */
import React from 'react';

const BookingTab = ({
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
  currentBookingButtonColor,
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
    <div className={`admin-tab-content ${true ? 'active' : ''}`}>
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
              <div className="config-item">
                <span className="config-label">{t.bookingButtonColorLabel}</span>
                <span className="config-value color-value-display">
                  <span className="color-swatch-inline" style={{ backgroundColor: currentBookingButtonColor }}></span>
                  {currentBookingButtonColor}
                </span>
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

            <div className="admin-form-group">
              <label className="inline-label">
                <span className="label-text">Check-in aktivieren</span>
                <input
                  type="checkbox"
                  checked={checkInEnabled}
                  onChange={(e) => onFieldChange('checkInEnabled', e.target.checked)}
                />
              </label>
              <small>Aktiviert den Check-in-Button für relevante Meetings.</small>
            </div>

            <div className="admin-form-group">
              <label className="inline-label">
                <span className="label-text">Nur externe Meetings benötigen Check-in</span>
                <input
                  type="checkbox"
                  checked={checkInRequiredForExternalMeetings}
                  onChange={(e) => onFieldChange('checkInRequiredForExternalMeetings', e.target.checked)}
                  disabled={!checkInEnabled}
                />
              </label>
              <small>Empfohlen: Display-erstellte Buchungen bleiben ohne Check-in/no-show.</small>
            </div>

            <div className="admin-form-group">
              <label htmlFor="checkInEarlyMinutes">Check-in ab Minuten vor Start</label>
              <input
                id="checkInEarlyMinutes"
                type="number"
                min="0"
                value={checkInEarlyMinutes}
                onChange={(e) => onFieldChange('checkInEarlyMinutes', Math.max(parseInt(e.target.value, 10) || 0, 0))}
                disabled={!checkInEnabled}
              />
              <small>Standard: 5 Minuten vor Terminbeginn.</small>
            </div>

            <div className="admin-form-group">
              <label htmlFor="checkInWindowMinutes">Check-in-Fenster nach Start (Minuten)</label>
              <input
                id="checkInWindowMinutes"
                type="number"
                min="1"
                value={checkInWindowMinutes}
                onChange={(e) => onFieldChange('checkInWindowMinutes', Math.max(parseInt(e.target.value, 10) || 1, 1))}
                disabled={!checkInEnabled}
              />
              <small>Nach Ablauf gilt das Meeting als No-Show (wenn aktiviert).</small>
            </div>

            <div className="admin-form-group">
              <label className="inline-label">
                <span className="label-text">No-Show automatisch freigeben</span>
                <input
                  type="checkbox"
                  checked={checkInAutoReleaseNoShow}
                  onChange={(e) => onFieldChange('checkInAutoReleaseNoShow', e.target.checked)}
                  disabled={!checkInEnabled}
                />
              </label>
              <small>Löscht nicht bestätigte externe Meetings automatisch nach Ablauf des Fensters.</small>
            </div>

            <div className="admin-form-group">
              <label>{t.roomGroupFeatureFlagsLabel || 'Room Group Overrides'}</label>
              <small>{t.roomGroupFeatureFlagsHelp || 'Optional: Override booking/extend per room group alias (e.g. roomlist-building-a).'}</small>

              {availableRoomGroupOptions.length > 0 && (
                <div className="booking-override-select-wrapper">
                  <select
                    value={newRoomGroupOverrideKey}
                    onChange={(e) => onOverrideDraftChange('group', e.target.value)}
                    className="booking-override-select"
                  >
                    <option value="">{t.selectRoomGroupLabel || 'Select room group'}</option>
                    {availableRoomGroupOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="booking-override-add-row">
                <input
                  type="text"
                  value={newRoomGroupOverrideKey}
                  onChange={(e) => onOverrideDraftChange('group', e.target.value)}
                  placeholder={t.roomGroupOverridePlaceholder || 'room group alias'}
                />
                <button type="button" className="admin-secondary-button" onClick={() => onAddOverride('group')}>
                  {t.addOverrideButtonLabel || 'Add'}
                </button>
              </div>

              {roomGroupOverrideEntries.length === 0 ? (
                <div className="admin-locked-message admin-mb-1">
                  <p>{t.noRoomGroupOverridesLabel || 'No room-group overrides configured.'}</p>
                </div>
              ) : roomGroupOverrideEntries.map(([groupKey, groupValue]) => (
                <div key={groupKey} className="booking-override-grid">
                  <input type="text" value={groupKey} readOnly />
                  <select
                    value={toOverrideState(groupValue?.enableBooking)}
                    onChange={(e) => onOverrideStateChange('group', groupKey, 'enableBooking', e.target.value)}
                  >
                    <option value="inherit">{t.inheritOverrideLabel || 'Inherit'}</option>
                    <option value="enabled">{t.enabledOverrideLabel || 'Enabled'}</option>
                    <option value="disabled">{t.disabledOverrideLabel || 'Disabled'}</option>
                  </select>
                  <select
                    value={toOverrideState(groupValue?.enableExtendMeeting)}
                    onChange={(e) => onOverrideStateChange('group', groupKey, 'enableExtendMeeting', e.target.value)}
                  >
                    <option value="inherit">{t.inheritOverrideLabel || 'Inherit'}</option>
                    <option value="enabled">{t.enabledOverrideLabel || 'Enabled'}</option>
                    <option value="disabled">{t.disabledOverrideLabel || 'Disabled'}</option>
                  </select>
                  <button type="button" className="admin-secondary-button" onClick={() => onRemoveOverride('group', groupKey)}>
                    {t.removeOverrideButtonLabel || 'Remove'}
                  </button>
                </div>
              ))}
            </div>

            <div className="admin-form-group">
              <label>{t.roomFeatureFlagsLabel || 'Room Overrides'}</label>
              <small>{t.roomFeatureFlagsHelp || 'Optional: Override booking/extend per room email.'}</small>

              {availableRoomOptions.length > 0 && (
                <div className="booking-override-select-wrapper">
                  <select
                    value={newRoomOverrideKey}
                    onChange={(e) => onOverrideDraftChange('room', e.target.value)}
                    className="booking-override-select"
                  >
                    <option value="">{t.selectRoomLabel || 'Select room'}</option>
                    {availableRoomOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="booking-override-add-row">
                <input
                  type="text"
                  value={newRoomOverrideKey}
                  onChange={(e) => onOverrideDraftChange('room', e.target.value)}
                  placeholder={t.roomOverridePlaceholder || 'room@domain.com'}
                />
                <button type="button" className="admin-secondary-button" onClick={() => onAddOverride('room')}>
                  {t.addOverrideButtonLabel || 'Add'}
                </button>
              </div>

              {roomOverrideEntries.length === 0 ? (
                <div className="admin-locked-message admin-mb-1">
                  <p>{t.noRoomOverridesLabel || 'No room overrides configured.'}</p>
                </div>
              ) : roomOverrideEntries.map(([roomKey, roomValue]) => (
                <div key={roomKey} className="booking-override-grid">
                  <input type="text" value={roomKey} readOnly />
                  <select
                    value={toOverrideState(roomValue?.enableBooking)}
                    onChange={(e) => onOverrideStateChange('room', roomKey, 'enableBooking', e.target.value)}
                  >
                    <option value="inherit">{t.inheritOverrideLabel || 'Inherit'}</option>
                    <option value="enabled">{t.enabledOverrideLabel || 'Enabled'}</option>
                    <option value="disabled">{t.disabledOverrideLabel || 'Disabled'}</option>
                  </select>
                  <select
                    value={toOverrideState(roomValue?.enableExtendMeeting)}
                    onChange={(e) => onOverrideStateChange('room', roomKey, 'enableExtendMeeting', e.target.value)}
                  >
                    <option value="inherit">{t.inheritOverrideLabel || 'Inherit'}</option>
                    <option value="enabled">{t.enabledOverrideLabel || 'Enabled'}</option>
                    <option value="disabled">{t.disabledOverrideLabel || 'Disabled'}</option>
                  </select>
                  <button type="button" className="admin-secondary-button" onClick={() => onRemoveOverride('room', roomKey)}>
                    {t.removeOverrideButtonLabel || 'Remove'}
                  </button>
                </div>
              ))}
            </div>

            {(currentRoomFeatureFlags && Object.keys(currentRoomFeatureFlags).length > 0) || (currentRoomGroupFeatureFlags && Object.keys(currentRoomGroupFeatureFlags).length > 0) ? (
              <div className="admin-current-config admin-mb-15">
                <h3>{t.currentConfigTitle} - {t.overridePreviewLabel || 'Override Preview'}</h3>
                <pre className="admin-json-pre">{JSON.stringify({ roomGroupFeatureFlags: currentRoomGroupFeatureFlags, roomFeatureFlags: currentRoomFeatureFlags }, null, 2)}</pre>
              </div>
            ) : null}

            <button 
              type="submit" 
              className="admin-submit-button"
              disabled={
                bookingPermissionMissing ||
                (enableBooking === currentEnableBooking &&
                 enableExtendMeeting === currentEnableExtendMeeting &&
                 checkInEnabled === currentCheckInEnabled &&
                 checkInRequiredForExternalMeetings === currentCheckInRequiredForExternalMeetings &&
                 parseInt(checkInEarlyMinutes, 10) === currentCheckInEarlyMinutes &&
                 parseInt(checkInWindowMinutes, 10) === currentCheckInWindowMinutes &&
                 checkInAutoReleaseNoShow === currentCheckInAutoReleaseNoShow &&
                 JSON.stringify(roomFeatureFlags) === JSON.stringify(currentRoomFeatureFlags) &&
                 JSON.stringify(roomGroupFeatureFlags) === JSON.stringify(currentRoomGroupFeatureFlags))
              }
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
