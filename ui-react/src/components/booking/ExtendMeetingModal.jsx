/**
* @file ExtendMeetingModal.js
* @description Modal dialog for extending the current meeting by 15 or 30 minutes.
*/
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { getMeetingActionModalTranslations } from '../../config/display-translations.js';
import { fetchAndApplyBookingButtonColor, fetchWithRetry } from './booking-utils.js';
import { roundUpToQuarterHour } from '../../utils/quarter-hour-rounding.js';

/**
* ExtendMeetingModal - Modal dialog for extending the current meeting
* Supports extending by 15 or 30 minutes
*/
class ExtendMeetingModal extends Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedDuration: 30,
      customDuration: 30,
      isSubmitting: false,
      isEnding: false,
      error: null,
      effectiveNewEndTime: this.calculateEffectiveNewEndTimeFor(30)
    };

    this.refreshTimer = null;
  }

  componentDidMount() {
    // Fetch and apply booking button color when modal opens
    fetchAndApplyBookingButtonColor(this.props.room, this.props.theme === 'dark');

    // Start 30-second interval timer to recalculate effective new end time
    this.refreshTimer = setInterval(() => {
      this.recalculateEffectiveNewEndTime();
    }, 30000);
  }

  componentWillUnmount() {
    // Clear the refresh timer on unmount
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  getTranslations() {
    return getMeetingActionModalTranslations();
  }

  /**
   * Get the current meeting end time from the room's active appointment.
   * Returns a Date object or null if no active appointment exists.
   *
   * @returns {Date|null}
   */
  getCurrentMeetingEnd() {
    const { room } = this.props;
    if (!room || !room.Busy || !room.Appointments || room.Appointments.length === 0) {
      return null;
    }
    const endTimestamp = parseInt(room.Appointments[0].End, 10);
    if (isNaN(endTimestamp)) return null;
    return new Date(endTimestamp);
  }

  /**
   * Calculate the effective (rounded) new end time for a given extension duration.
   * Computes currentMeetingEnd + duration, then applies roundUpToQuarterHour.
   *
   * @param {number} durationMinutes - Extension duration in minutes
   * @returns {Date|null} Rounded new end time, or null if no active meeting
   */
  calculateEffectiveNewEndTimeFor(durationMinutes) {
    const currentEnd = this.getCurrentMeetingEnd();
    if (!currentEnd) return null;
    const rawNewEnd = new Date(currentEnd.getTime() + durationMinutes * 60000);
    return roundUpToQuarterHour(rawNewEnd);
  }

  /**
   * Find the next scheduled meeting after the current one.
   * Returns the start time of the next meeting as a Date, or null if none exists.
   *
   * @returns {Date|null}
   */
  getNextMeetingStart() {
    const { room } = this.props;
    if (!room || !room.Appointments || room.Appointments.length < 2) {
      return null;
    }

    const currentEnd = this.getCurrentMeetingEnd();
    if (!currentEnd) return null;

    // Find the next appointment that starts at or after the current meeting ends
    for (let i = 1; i < room.Appointments.length; i++) {
      const startTimestamp = parseInt(room.Appointments[i].Start, 10);
      if (isNaN(startTimestamp)) continue;
      const startDate = new Date(startTimestamp);
      if (startDate.getTime() >= currentEnd.getTime()) {
        return startDate;
      }
    }

    return null;
  }

  /**
   * Check if the effective new end time conflicts with the next scheduled meeting.
   *
   * @param {Date|null} effectiveNewEndTime - The rounded new end time
   * @returns {boolean} true if there is a conflict
   */
  hasConflictWithNextMeeting(effectiveNewEndTime) {
    if (!effectiveNewEndTime) return false;
    const nextMeetingStart = this.getNextMeetingStart();
    if (!nextMeetingStart) return false;
    return effectiveNewEndTime.getTime() > nextMeetingStart.getTime();
  }

  /**
   * Recalculate the effective new end time based on the currently selected duration.
   * Called by the 30-second interval timer and when duration changes.
   */
  recalculateEffectiveNewEndTime = () => {
    const effectiveNewEndTime = this.calculateEffectiveNewEndTimeFor(this.state.selectedDuration);
    this.setState({ effectiveNewEndTime });
  };

  /**
   * Format a Date as HH:MM string (24h format).
   * @param {Date} date
   * @returns {string} e.g. "10:15"
   */
  formatTimeHHMM(date) {
    if (!date) return '--:--';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  handleQuickExtend = (durationMinutes) => {
    const effectiveNewEndTime = this.calculateEffectiveNewEndTimeFor(durationMinutes);
    this.setState({
      selectedDuration: durationMinutes,
      customDuration: durationMinutes,
      error: null,
      effectiveNewEndTime
    });
  };

  handleCustomDurationChange = (e) => {
    const duration = parseInt(e.target.value, 10);
    const effectiveNewEndTime = this.calculateEffectiveNewEndTimeFor(duration);
    this.setState({
      selectedDuration: duration,
      customDuration: duration,
      error: null,
      effectiveNewEndTime
    });
  };

  handleSubmit = async (e) => {
    e.preventDefault();

    const { room, onClose, onSuccess } = this.props;
    const { selectedDuration } = this.state;
    const t = this.getTranslations();

    if (!room || !room.Busy || !room.Appointments || room.Appointments.length === 0) {
      this.setState({ error: t.noActiveMeeting });
      return;
    }

    const currentAppointment = room.Appointments[0];

    // Calculate the rounded end time at the moment of submission
    const effectiveNewEndTime = this.calculateEffectiveNewEndTimeFor(selectedDuration);

    // Check if the effective new end time conflicts with the next scheduled meeting
    if (this.hasConflictWithNextMeeting(effectiveNewEndTime)) {
      this.setState({ error: t.conflictError });
      return;
    }

    this.setState({ isSubmitting: true, error: null });

    try {
      const response = await fetchWithRetry('/api/extend-meeting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roomEmail: room.Email,
          roomGroup: room.RoomlistAlias,
          appointmentId: currentAppointment.Id,
          minutes: selectedDuration,
          endTime: effectiveNewEndTime ? effectiveNewEndTime.toISOString() : undefined
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (response.status === 403) {
          if (data.error === 'ip_not_whitelisted') throw new Error(t.ipNotWhitelistedError);
          if (data.error === 'origin_not_allowed') throw new Error(t.originNotAllowedError);
        }
        throw new Error(data.error || data.message || t.endGenericError);
      }

      if (onSuccess) {
        onSuccess(data);
      }
      onClose();
    } catch (error) {
      console.error('Extend meeting error:', error);
      this.setState({
        error: error.message || t.genericError,
        isSubmitting: false
      });
    }
  };

  handleEndMeeting = async () => {
    const { room, onClose, onSuccess } = this.props;
    const t = this.getTranslations();

    if (!room || !room.Busy || !room.Appointments || room.Appointments.length === 0) {
      this.setState({ error: t.noActiveMeetingEnd });
      return;
    }

    const currentAppointment = room.Appointments[0];

    this.setState({ isEnding: true, error: null });

    try {
      const response = await fetch('/api/end-meeting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roomEmail: room.Email,
          roomGroup: room.RoomlistAlias,
          appointmentId: currentAppointment.Id
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (response.status === 403) {
          if (data.error === 'ip_not_whitelisted') throw new Error(t.ipNotWhitelistedError);
          if (data.error === 'origin_not_allowed') throw new Error(t.originNotAllowedError);
        }
        throw new Error(data.error || data.message || t.genericError);
      }

      if (onSuccess) {
        onSuccess(data);
      }
      onClose();
    } catch (error) {
      console.error('End meeting error:', error);
      this.setState({
    error: error.message || t.endGenericError,
        isEnding: false
      });
    }
  };

  render() {
    const { onClose, theme } = this.props;
    const { selectedDuration, customDuration, isSubmitting, isEnding, error, effectiveNewEndTime } = this.state;
    const isDark = theme === 'dark';
    const t = this.getTranslations();

    return (
      <div className={`booking-modal-overlay ${isDark ? 'minimal-display' : ''}`} onClick={onClose}>
        <div className={`booking-modal ${isDark ? 'minimal-display' : ''}`} onClick={(e) => e.stopPropagation()}>
          <div className="booking-modal-body">
            {error && (
              <div className="booking-error">
                {error}
              </div>
            )}

            <form onSubmit={this.handleSubmit}>
              <div className="quick-book-section">
                <div className="quick-book-label">{t.extendBy}</div>
                <div className="quick-book-buttons">
                  <button
                    type="button"
                    className={`quick-book-btn ${selectedDuration === 15 ? 'active' : ''}`}
                    onClick={() => this.handleQuickExtend(15)}
                  >
                    15 {t.minutes}
                  </button>
                  <button
                    type="button"
                    className={`quick-book-btn ${selectedDuration === 30 ? 'active' : ''}`}
                    onClick={() => this.handleQuickExtend(30)}
                  >
                    30 {t.minutes}
                  </button>
                  <button
                    type="button"
                    className={`quick-book-btn ${selectedDuration === 60 ? 'active' : ''}`}
                    onClick={() => this.handleQuickExtend(60)}
                  >
                    60 {t.minutes}
                  </button>
                  <button
                    type="button"
                    className={`quick-book-btn ${selectedDuration === 120 ? 'active' : ''}`}
                    onClick={() => this.handleQuickExtend(120)}
                  >
                    120 {t.minutes}
                  </button>
                </div>
              </div>

              <div className="custom-duration-section">
                <label htmlFor="custom-duration">
                  {t.custom}: <span className="duration-value">{customDuration} {t.minutes}</span>
                </label>
                <input
                  type="range"
                  id="custom-duration"
                  className="duration-slider"
                  min="5"
                  max="240"
                  step="5"
                  value={customDuration}
                  onChange={this.handleCustomDurationChange}
                />
                <div className="slider-labels">
                  <span>5 {t.minutes}</span>
                  <span>240 {t.minutes}</span>
                </div>
              </div>

              {/* Effective new end time display */}
              <div className="effective-end-time" data-testid="effective-new-end-time">
                <span className="effective-end-time-label">{t.newEndTime || 'New end time'}:</span>{' '}
                <span className="effective-end-time-value">{this.formatTimeHHMM(effectiveNewEndTime)}</span>
              </div>

              <div className="booking-modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={onClose}
                  disabled={isSubmitting || isEnding}
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  className="btn-end-meeting"
                  onClick={this.handleEndMeeting}
                  disabled={isSubmitting || isEnding}
                >
                  {isEnding ? t.ending : t.endNow}
                </button>
                <button
                  type="submit"
                  className="btn-book"
                  disabled={isSubmitting || isEnding}
                >
                  {isSubmitting ? t.extending : t.extend}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }
}

ExtendMeetingModal.propTypes = {
  room: PropTypes.shape({
    Name: PropTypes.string.isRequired,
    Email: PropTypes.string.isRequired,
    Busy: PropTypes.bool,
    Appointments: PropTypes.arrayOf(PropTypes.shape({
      Id: PropTypes.string,
      Start: PropTypes.string,
      End: PropTypes.string
    }))
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  theme: PropTypes.oneOf(['light', 'dark'])
};

export default ExtendMeetingModal;
