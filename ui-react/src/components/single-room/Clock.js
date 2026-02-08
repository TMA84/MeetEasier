import React, { Component } from 'react';
import { formatTime } from '../../utils/timeFormat.js';

/**
 * Clock component for single room sidebar
 * Displays current time and date, updates every second
 * Supports localization based on browser language
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
    
    return (
      <>
        {/* Time display */}
        <div className="clock-time">
          {formatTime(this.state.date, { hour: '2-digit', minute: '2-digit' })}
        </div>
        
        {/* Date display */}
        <div className="clock-date">
          {this.state.date.toLocaleDateString(
            lang === 'de' ? 'de-DE' : 'en-US', 
            {
              weekday: 'long', 
              year: 'numeric',
              month: 'long', 
              day: 'numeric'
            }
          )}
        </div>
      </>
    );
  }
}

export default Clock;
