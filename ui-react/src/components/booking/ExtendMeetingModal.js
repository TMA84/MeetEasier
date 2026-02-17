import React, { Component } from 'react';
import PropTypes from 'prop-types';

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
      error: null
    };
  }

  componentDidMount() {
    // Fetch and apply booking button color when modal opens
    fetch('/api/booking-config')
      .then(response => response.json())
      .then(data => {
        const buttonColor = data.buttonColor || '#334155';
        document.documentElement.style.setProperty('--booking-button-color', buttonColor);
      })
      .catch(err => {
        console.error('Error fetching booking config:', err);
      });
  }

  getTranslations() {
    const lang = navigator.language || navigator.userLanguage || 'en';
    const langCode = lang.split('-')[0].toLowerCase();

    const translations = {
      en: {
        title: 'Extend Meeting',
        extendBy: 'Extend by:',
        custom: 'Custom',
        minutes: 'min',
        cancel: 'Cancel',
        extend: 'Extend Meeting',
        extending: 'Extending...',
        noActiveMeeting: 'No active meeting to extend.',
        genericError: 'Failed to extend meeting. Please try again.'
      },
      de: {
        title: 'Meeting verlängern',
        extendBy: 'Verlängern um:',
        custom: 'Benutzerdefiniert',
        minutes: 'Min',
        cancel: 'Abbrechen',
        extend: 'Meeting verlängern',
        extending: 'Wird verlängert...',
        noActiveMeeting: 'Kein aktives Meeting zum Verlängern.',
        genericError: 'Meeting konnte nicht verlängert werden. Bitte erneut versuchen.'
      }
    };

    return translations[langCode] || translations.en;
  }

  handleQuickExtend = (durationMinutes) => {
    this.setState({
      selectedDuration: durationMinutes,
      customDuration: durationMinutes,
      error: null
    });
  };

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

    const { room, onClose, onSuccess } = this.props;
    const { selectedDuration } = this.state;
    const t = this.getTranslations();

    if (!room || !room.Busy || !room.Appointments || room.Appointments.length === 0) {
      this.setState({ error: t.noActiveMeeting });
      return;
    }

    const currentAppointment = room.Appointments[0];

    this.setState({ isSubmitting: true, error: null });

    try {
      const response = await fetch('/api/extend-meeting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roomEmail: room.Email,
          appointmentId: currentAppointment.Id,
          minutes: selectedDuration
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || t.genericError);
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

  render() {
    const { onClose, theme } = this.props;
    const { selectedDuration, customDuration, isSubmitting, error } = this.state;
    const isDark = theme === 'dark';
    const t = this.getTranslations();

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
      Id: PropTypes.string
    }))
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  theme: PropTypes.oneOf(['light', 'dark'])
};

export default ExtendMeetingModal;
