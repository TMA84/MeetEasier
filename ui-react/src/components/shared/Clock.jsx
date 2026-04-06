/** @file Clock.js
*  @description Shared Clock component that displays the current localized time and date, refreshing every second.
*  Used by both flightboard navbar and single-room sidebar.
*/
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { formatTime } from '../../utils/time-format.js';

/**
* Shared Clock component
* Displays current time and date, updates every second
* Supports localization based on browser language
*
* @param {string} variant - 'sidebar' for single-room sidebar layout, 'navbar' for flightboard navbar layout
*/
class Clock extends Component {
  constructor(props) {
    super(props);
    this.state = {
      date: new Date()
    };

    this.tick = this.tick.bind(this);
  }

  /**
  * Update the current time
  * Called every second by interval timer
  */
  tick() {
    this.setState({
      date: new Date()
    });
  }

  componentDidMount() {
    // Update clock every second
    this.timerID = setInterval(this.tick, 1000);
  }

  componentWillUnmount() {
    // Clean up interval timer
    clearInterval(this.timerID);
  }

  /**
  * Get browser language for date formatting
  * @returns {string} Language code (e.g., 'en', 'de')
  */
  getLanguage = () => {
    const browserLang = navigator.language || navigator.userLanguage;
    return browserLang.split('-')[0];
  }

  render() {
    const lang = this.getLanguage();
    const { variant } = this.props;
    const dateOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    const locale = lang === 'de' ? 'de-DE' : 'en-US';

    if (variant === 'navbar') {
      return (
        <span id="clock">
          {/* Date display */}
          <span style={{ marginRight: '1rem' }}>
            {this.state.date.toLocaleDateString(locale, dateOptions)}
          </span>
          {/* Time display */}
          {formatTime(this.state.date)}
        </span>
      );
    }

    // Default: sidebar variant
    return (
      <>
        {/* Time display */}
        <div className="clock-time">
          {formatTime(this.state.date, { hour: '2-digit', minute: '2-digit' })}
        </div>
        
        {/* Date display */}
        <div className="clock-date">
          {this.state.date.toLocaleDateString(locale, dateOptions)}
        </div>
      </>
    );
  }
}

Clock.propTypes = {
  variant: PropTypes.oneOf(['sidebar', 'navbar'])
};

Clock.defaultProps = {
  variant: 'sidebar'
};

export default Clock;
