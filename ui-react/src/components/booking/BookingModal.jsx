/**
* @file BookingModal.js
* @description Modal dialog for booking a room. Supports quick booking
*              (15/30/60 min) and custom time selection with validation.
*/
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { getBookingModalTranslations } from '../../config/display-translations.js';
import { fetchAndApplyBookingButtonColor, fetchWithRetry } from './booking-utils.js';
import { roundUpToQuarterHour } from '../../utils/quarter-hour-rounding.js';
// Styles are loaded from /css/styles.css (compiled.scss from backend)

/**
* BookingModal - Modal dialog for booking a room
* Supports quick booking (15/30/60 min) and custom time selection
* Time selection in 15-minute intervals
*/
class BookingModal extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      subject: this.getDefaultSubject(),
      selectedDuration: 30, // default 30 minutes
      customDuration: 30, // for dropdown selection
      isSubmitting: false,
      error: null,
      effectiveEndTime: this.calculateEffectiveEndTimeFor(30)
    };

    this.refreshTimer = null;
  }

  componentDidMount() {
    // Fetch and apply booking button color when modal opens
    fetchAndApplyBookingButtonColor(this.props.room, this.props.theme === 'dark');

    // Start 30-second interval timer to recalculate effective end time
    this.refreshTimer = setInterval(() => {
      this.recalculateEffectiveEndTime();
    }, 30000);
  }

  componentWillUnmount() {
    // Clear the refresh timer on unmount
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  // Get default meeting subject based on browser language
  getDefaultSubject() {
    const t = getBookingModalTranslations();
    return t.defaultSubject;
  }

  // Get translations for UI text
  getTranslations() {
    return getBookingModalTranslations();
  }

  /**
   * Calculate the effective (rounded) end time for a given duration.
   * Computes now + duration, then applies roundUpToQuarterHour.
   * Used for initial state and can be called statically.
   *
   * @param {number} durationMinutes - Duration in minutes
   * @returns {Date} Rounded end time
   */
  calculateEffectiveEndTimeFor(durationMinutes) {
    const now = new Date();
    const rawEnd = new Date(now.getTime() + durationMinutes * 60000);
    return roundUpToQuarterHour(rawEnd);
  }

  /**
   * Recalculate the effective end time based on the currently selected duration.
   * Called by the 30-second interval timer and when duration changes.
   */
  recalculateEffectiveEndTime = () => {
    const effectiveEndTime = this.calculateEffectiveEndTimeFor(this.state.selectedDuration);
    this.setState({ effectiveEndTime });
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

  // Round time to next 15-minute interval
  roundToNext15Minutes(date) {
    const ms = 1000 * 60 * 15; // 15 minutes in milliseconds
    return new Date(Math.ceil(date.getTime() / ms) * ms);
  }

  // Format date for datetime-local input
  formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // Quick book for specified duration in minutes
  handleQuickBook = (durationMinutes) => {
    this.setState({
      selectedDuration: durationMinutes,
      customDuration: durationMinutes,
      error: null,
      effectiveEndTime: this.calculateEffectiveEndTimeFor(durationMinutes)
    });
  };

  // Handle custom duration slider change
  handleCustomDurationChange = (e) => {
    const duration = parseInt(e.target.value, 10);
    this.setState({
      selectedDuration: duration,
      customDuration: duration,
      error: null,
      effectiveEndTime: this.calculateEffectiveEndTimeFor(duration)
    });
  };

  /**
   * Find the next appointment that starts after the current time.
   * @returns {Object|null} The next appointment or null if none exists
   */
  getNextAppointment() {
    const { room } = this.props;
    if (!room || !room.Appointments || room.Appointments.length === 0) {
      return null;
    }

    const now = Date.now();
    // Find the first appointment whose start time is after now
    const upcoming = room.Appointments
      .filter(appt => parseInt(appt.Start, 10) > now)
      .sort((a, b) => parseInt(a.Start, 10) - parseInt(b.Start, 10));

    return upcoming.length > 0 ? upcoming[0] : null;
  }

  handleSubmit = async (e) => {
    e.preventDefault();
    
    const { subject, selectedDuration } = this.state;
    const { room, onClose, onSuccess } = this.props;

    // Calculate start time and rounded end time
    const now = new Date();
    const start = now;
    const end = roundUpToQuarterHour(new Date(now.getTime() + selectedDuration * 60000));

    // Check for conflict with next appointment
    const nextAppointment = this.getNextAppointment();
    if (nextAppointment) {
      const nextStart = parseInt(nextAppointment.Start, 10);
      if (end.getTime() > nextStart) {
        const t = this.getTranslations();
        this.setState({ error: t.conflictError });
        return;
      }
    }

    this.setState({ isSubmitting: true, error: null });

    try {
      const response = await fetchWithRetry(`/api/rooms/${encodeURIComponent(room.Email)}/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject: subject.trim(),
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          roomGroup: room.RoomlistAlias
        })
      });

      const data = await response.json();

      if (!response.ok) {
        const t = this.getTranslations();
        // Handle specific error cases
        if (response.status === 409) {
          throw new Error(t.conflictError);
        }
        if (response.status === 403) {
          if (data.error === 'ip_not_whitelisted') {
            throw new Error(t.ipNotWhitelistedError);
          }
          if (data.error === 'origin_not_allowed') {
            throw new Error(t.originNotAllowedError);
          }
          if (data.error === 'Booking disabled') {
            throw new Error(t.bookingDisabledError);
          }
        }
        throw new Error(t.genericError);
      }

      // Success
      if (onSuccess) {
        onSuccess(data);
      }
      onClose();
    } catch (error) {
      console.error('Booking error:', error);
      const t = this.getTranslations();
      this.setState({ 
        error: error.message || t.genericError,
        isSubmitting: false 
      });
    }
  };

  render() {
    const { room: _room, onClose, theme } = this.props;
    const { selectedDuration, customDuration, isSubmitting, error, effectiveEndTime } = this.state;
    
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
              {/* Quick Book Buttons */}
              <div className="quick-book-section">
                <div className="quick-book-buttons">
                  <button
                    type="button"
                    className={`quick-book-btn ${selectedDuration === 15 ? 'active' : ''}`}
                    onClick={() => this.handleQuickBook(15)}
                  >
                    15 {t.minutes}
                  </button>
                  <button
                    type="button"
                    className={`quick-book-btn ${selectedDuration === 30 ? 'active' : ''}`}
                    onClick={() => this.handleQuickBook(30)}
                  >
                    30 {t.minutes}
                  </button>
                  <button
                    type="button"
                    className={`quick-book-btn ${selectedDuration === 60 ? 'active' : ''}`}
                    onClick={() => this.handleQuickBook(60)}
                  >
                    60 {t.minutes}
                  </button>
                  <button
                    type="button"
                    className={`quick-book-btn ${selectedDuration === 120 ? 'active' : ''}`}
                    onClick={() => this.handleQuickBook(120)}
                  >
                    120 {t.minutes}
                  </button>
                </div>
              </div>

              {/* Custom Duration Slider */}
              <div className="custom-duration-section">
                <label htmlFor="custom-duration">
                  {t.duration}: <span className="duration-value">{customDuration} {t.minutes}</span>
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

              {/* Effective End Time Display */}
              <div className="effective-end-time-section">
                <span className="effective-end-time-label">{t.endTime || 'End Time:'}</span>
                <span className="effective-end-time-value">{this.formatTimeHHMM(effectiveEndTime)}</span>
              </div>

              {/* Action Buttons */}
              <div className="booking-modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="btn-book"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t.booking : t.bookRoom}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }
}

BookingModal.propTypes = {
  room: PropTypes.shape({
    Name: PropTypes.string.isRequired,
    Email: PropTypes.string.isRequired,
    Appointments: PropTypes.arrayOf(PropTypes.shape({
      Start: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      End: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    }))
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  theme: PropTypes.oneOf(['light', 'dark'])
};

export default BookingModal;
