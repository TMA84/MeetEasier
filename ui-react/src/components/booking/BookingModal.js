import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { getBookingModalTranslations } from '../../config/displayTranslations.js';
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
      error: null
    };
  }

  componentDidMount() {
    // Fetch and apply booking button color when modal opens
    const roomEmail = this.props.room?.Email;
    const roomGroup = this.props.room?.RoomlistAlias;
    const endpoint = roomEmail
      ? `/api/booking-config?roomEmail=${encodeURIComponent(roomEmail)}${roomGroup ? `&roomGroup=${encodeURIComponent(roomGroup)}` : ''}`
      : '/api/booking-config';

    fetch(endpoint)
      .then(response => response.json())
      .then(data => {
        const buttonColor = data.buttonColor || '#334155';
        document.documentElement.style.setProperty('--booking-button-color', buttonColor);
      })
      .catch(err => {
        console.error('Error fetching booking config:', err);
      });
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
      error: null
    });
  };

  // Handle custom duration slider change
  handleCustomDurationChange = (e) => {
    const duration = parseInt(e.target.value, 10);
    this.setState({
      selectedDuration: duration,
      customDuration: duration,
      error: null
    });
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    
    const { subject, selectedDuration } = this.state;
    const { room, onClose, onSuccess } = this.props;

    // Calculate start and end times (start now, end = now + duration)
    const now = new Date();
    const start = now;
    const end = new Date(now.getTime() + selectedDuration * 60000);

    this.setState({ isSubmitting: true, error: null });

    try {
      // Retry helper for network errors (e.g. unstable WiFi on Raspberry Pi)
      const fetchWithRetry = async (url, options, retries = 2) => {
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            return await fetch(url, options);
          } catch (err) {
            if (attempt < retries) {
              console.warn(`Booking fetch attempt ${attempt + 1} failed, retrying...`, err.message);
              await new Promise(r => setTimeout(r, 1000));
            } else {
              throw err;
            }
          }
        }
      };

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
    const { room, onClose, theme } = this.props;
    const { selectedDuration, customDuration, isSubmitting, error } = this.state;
    
    const isDark = theme === 'dark';
    const t = this.getTranslations();

    // Generate duration options in 5-minute intervals (5 to 240 minutes / 4 hours)
    const durationOptions = [];
    for (let i = 5; i <= 240; i += 5) {
      durationOptions.push(i);
    }

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
    Email: PropTypes.string.isRequired
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  theme: PropTypes.oneOf(['light', 'dark'])
};

export default BookingModal;
