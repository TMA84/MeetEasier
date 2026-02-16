import React, { Component } from 'react';
import PropTypes from 'prop-types';
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
        date: 'Date:',
        startTime: 'Start Time:',
        duration: 'Duration:',
        endTime: 'End Time:',
        today: 'Today',
        tomorrow: 'Tomorrow',
        minutes: 'min',
        hours: 'hours',
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
        date: 'Datum:',
        startTime: 'Startzeit:',
        duration: 'Dauer:',
        endTime: 'Endzeit:',
        today: 'Heute',
        tomorrow: 'Morgen',
        minutes: 'Min',
        hours: 'Std',
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
