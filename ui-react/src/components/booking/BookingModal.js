import React, { Component } from 'react';
import PropTypes from 'prop-types';
import './BookingModal.scss';

/**
 * BookingModal - Modal dialog for booking a room
 * Supports quick booking (15/30/60 min) and custom time selection
 * Time selection in 15-minute intervals
 */
class BookingModal extends Component {
  constructor(props) {
    super(props);
    
    const now = new Date();
    const defaultEnd = new Date(now.getTime() + 30 * 60000); // 30 min default
    
    this.state = {
      subject: this.getDefaultSubject(),
      startTime: this.formatDateTimeLocal(now),
      endTime: this.formatDateTimeLocal(defaultEnd),
      isSubmitting: false,
      error: null,
      showCustomTime: false
    };
  }

  // Get default meeting subject based on browser language
  getDefaultSubject() {
    const lang = navigator.language || navigator.userLanguage || 'en';
    const langCode = lang.split('-')[0].toLowerCase();
    
    const translations = {
      en: 'Meeting',
      de: 'Besprechung',
      fr: 'Réunion',
      es: 'Reunión',
      it: 'Riunione',
      pt: 'Reunião',
      nl: 'Vergadering',
      pl: 'Spotkanie',
      ru: 'Встреча',
      ja: '会議',
      zh: '会议',
      ko: '회의',
      ar: 'اجتماع',
      tr: 'Toplantı',
      sv: 'Möte',
      da: 'Møde',
      no: 'Møte',
      fi: 'Kokous',
      cs: 'Schůzka',
      hu: 'Találkozó',
      ro: 'Întâlnire',
      el: 'Συνάντηση',
      he: 'פגישה',
      th: 'การประชุม',
      vi: 'Cuộc họp',
      id: 'Pertemuan',
      ms: 'Mesyuarat',
      uk: 'Зустріч',
      bg: 'Среща',
      hr: 'Sastanak',
      sk: 'Stretnutie',
      sl: 'Sestanek',
      lt: 'Susitikimas',
      lv: 'Tikšanās',
      et: 'Kohtumine'
    };
    
    return translations[langCode] || translations.en;
  }

  // Get translations for UI text
  getTranslations() {
    const lang = navigator.language || navigator.userLanguage || 'en';
    const langCode = lang.split('-')[0].toLowerCase();
    
    const translations = {
      en: {
        title: 'Book Room',
        quickBook: 'Quick Book:',
        custom: 'Custom',
        startTime: 'Start Time:',
        endTime: 'End Time:',
        subject: 'Meeting Subject:',
        cancel: 'Cancel',
        bookRoom: 'Book Room',
        booking: 'Booking...',
        conflictError: 'This room is already booked during the selected time. Please choose a different time.',
        genericError: 'Failed to book room. Please try again.'
      },
      de: {
        title: 'Raum buchen',
        quickBook: 'Schnellbuchung:',
        custom: 'Benutzerdefiniert',
        startTime: 'Startzeit:',
        endTime: 'Endzeit:',
        subject: 'Besprechungsthema:',
        cancel: 'Abbrechen',
        bookRoom: 'Raum buchen',
        booking: 'Wird gebucht...',
        conflictError: 'Dieser Raum ist während der ausgewählten Zeit bereits gebucht. Bitte wählen Sie eine andere Zeit.',
        genericError: 'Raumbuchung fehlgeschlagen. Bitte versuchen Sie es erneut.'
      }
    };
    
    return translations[langCode] || translations.en;
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
  // Starts immediately (now), not rounded to next 15-minute interval
  handleQuickBook = (durationMinutes) => {
    const now = new Date();
    const end = new Date(now.getTime() + durationMinutes * 60000);
    
    this.setState({
      startTime: this.formatDateTimeLocal(now),
      endTime: this.formatDateTimeLocal(end),
      showCustomTime: false
    });
  };

  handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // If start time is changed, automatically set end time to +15 minutes
    if (name === 'startTime') {
      const newStart = new Date(value);
      const newEnd = new Date(newStart.getTime() + 15 * 60000); // +15 minutes
      this.setState({ 
        startTime: value,
        endTime: this.formatDateTimeLocal(newEnd),
        error: null 
      });
    } else {
      this.setState({ [name]: value, error: null });
    }
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    
    const { subject, startTime, endTime } = this.state;
    const { room, onClose, onSuccess } = this.props;

    // Validate
    if (!subject.trim()) {
      this.setState({ error: 'Please enter a meeting subject' });
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      this.setState({ error: 'End time must be after start time' });
      return;
    }

    // Allow bookings that start within the last minute (to account for processing time)
    const oneMinuteAgo = new Date(Date.now() - 60000);
    if (start < oneMinuteAgo) {
      this.setState({ error: 'Cannot book in the past' });
      return;
    }

    this.setState({ isSubmitting: true, error: null });

    try {
      const response = await fetch(`/api/rooms/${encodeURIComponent(room.Email)}/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject: subject.trim(),
          startTime: start.toISOString(),
          endTime: end.toISOString()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        const t = this.getTranslations();
        // Handle specific error cases
        if (response.status === 409) {
          throw new Error(t.conflictError);
        }
        throw new Error(data.message || t.genericError);
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
    const { subject, startTime, endTime, isSubmitting, error, showCustomTime } = this.state;
    
    const isDark = theme === 'dark';
    const t = this.getTranslations();

    return (
      <div className={`booking-modal-overlay ${isDark ? 'minimal-display' : ''}`} onClick={onClose}>
        <div className={`booking-modal ${isDark ? 'minimal-display' : ''}`} onClick={(e) => e.stopPropagation()}>
          <div className="booking-modal-header">
            <h2>{t.title}</h2>
            <button className="booking-modal-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>

          <div className="booking-modal-body">
            {error && (
              <div className="booking-error">
                {error}
              </div>
            )}

            <form onSubmit={this.handleSubmit}>
              {/* Quick Book Buttons */}
              <div className="quick-book-section">
                <label>{t.quickBook}</label>
                <div className="quick-book-buttons">
                  <button
                    type="button"
                    className="quick-book-btn"
                    onClick={() => this.handleQuickBook(15)}
                  >
                    15 min
                  </button>
                  <button
                    type="button"
                    className="quick-book-btn"
                    onClick={() => this.handleQuickBook(30)}
                  >
                    30 min
                  </button>
                  <button
                    type="button"
                    className="quick-book-btn"
                    onClick={() => this.handleQuickBook(60)}
                  >
                    60 min
                  </button>
                  <button
                    type="button"
                    className="quick-book-btn quick-book-btn-custom"
                    onClick={() => this.setState({ showCustomTime: !showCustomTime })}
                  >
                    {t.custom}
                  </button>
                </div>
              </div>

              {/* Custom Time Selection */}
              {showCustomTime && (
                <div className="custom-time-section">
                  <div className="form-group">
                    <label htmlFor="startTime">{t.startTime}</label>
                    <input
                      type="datetime-local"
                      id="startTime"
                      name="startTime"
                      value={startTime}
                      onChange={this.handleInputChange}
                      step="900"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="endTime">{t.endTime}</label>
                    <input
                      type="datetime-local"
                      id="endTime"
                      name="endTime"
                      value={endTime}
                      onChange={this.handleInputChange}
                      step="900"
                      required
                    />
                  </div>
                </div>
              )}

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
