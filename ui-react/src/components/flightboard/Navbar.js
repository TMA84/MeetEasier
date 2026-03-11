import React, { Component } from 'react';
import PropTypes from 'prop-types';
import io from 'socket.io-client';
import { applyI18nConfig, loadMaintenanceMessages } from '../../config/maintenanceMessages.js';
import { getFlightboardDisplayTranslations } from '../../config/displayTranslations.js';

import Clock from './Clock';
import RoomFilterContainer from './RoomFilterContainer';

/**
 * Navbar component for flightboard display
 * Shows logo, title, room filter dropdown, and clock
 * Supports real-time logo updates via Socket.IO
 */
class Navbar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      logoUrl: '/img/logo.W.png',
      i18nTick: 0,
      flightboardDarkMode: true
    };
    this.socket = null;
  }

  componentDidMount() {
    this.fetchLogoConfig();
    this.fetchSidebarConfig();
    loadMaintenanceMessages().then(() => {
      this.setState({ i18nTick: Date.now() });
    });
    
    // Connect to Socket.IO for real-time logo updates
    this.socket = io();
    
    this.socket.on('logoConfigUpdated', (config) => {
      console.log('Logo config updated via Socket.IO:', config);
      this.updateLogoUrl(config);
    });

    this.socket.on('sidebarConfigUpdated', () => {
      this.fetchSidebarConfig();
    });

    this.socket.on('i18nConfigUpdated', (i18nConfig) => {
      applyI18nConfig(i18nConfig);
      this.setState({ i18nTick: Date.now() });
    });
  }

  componentWillUnmount() {
    // Clean up socket connection
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  /**
   * Update logo URL based on dark mode setting
   * @param {Object} config - Logo configuration object
   */
  updateLogoUrl = (config) => {
    const { flightboardDarkMode } = this.state;
    const logoUrl = flightboardDarkMode 
      ? (config.logoLightUrl || '/img/logo.W.png')
      : (config.logoDarkUrl || '/img/logo.B.png');
    this.setState({ logoUrl });
  }

  /**
   * Fetch current logo configuration from API
   * Uses logoLightUrl for dark mode, logoDarkUrl for light mode
   */
  fetchLogoConfig = () => {
    fetch('/api/logo')
      .then(response => response.json())
      .then(data => {
        this.updateLogoUrl(data);
      })
      .catch(err => {
        console.error('Error fetching logo config:', err);
      });
  }

  /**
   * Fetch sidebar configuration to determine dark/light mode
   */
  fetchSidebarConfig = () => {
    fetch('/api/sidebar')
      .then(response => response.json())
      .then(data => {
        const flightboardDarkMode = data.flightboardDarkMode !== undefined ? data.flightboardDarkMode : true;
        this.setState({ flightboardDarkMode }, () => {
          // Reload logo with correct variant
          this.fetchLogoConfig();
        });
      })
      .catch(err => {
        console.error('Error fetching sidebar config:', err);
      });
  }

  /**
   * Handle filter selection from dropdown
   * @param {string} filterValue - Selected filter ID (e.g., 'roomlist-all', 'roomlist-building1')
   */
  handleFilter = (filterValue) => {
    this.props.filter(filterValue);
  }

  render() {
    const { logoUrl } = this.state;
    const config = getFlightboardDisplayTranslations();
    
    return (
      <div id="title-bar-wrap">
        <div className="title-bar">
          {/* Left side: Logo, Title, Filter */}
          <div className="title-bar-left">
            <ul className="horizontal menu fb__nav-menu">
              <li>
                <img 
                  src={logoUrl} 
                  alt="Logo" 
                  onError={(e) => { e.target.src = '/img/logo.W.png'; }} 
                />
              </li>
              <li>
                <span id="fb__navbar-title">{config.navbar.title}</span>
              </li>
              <li>
                <ul 
                  id="roomlist-filter" 
                  className="dropdown menu fb__dropdown" 
                  data-dropdown-menu
                >
                  <RoomFilterContainer 
                    filter={this.handleFilter} 
                    currentFilter={this.props.currentFilter}
                  />
                </ul>
              </li>
            </ul>
          </div>

          {/* Right side: Clock */}
          <div className="title-bar-right">
            <ul className="horizontal menu fb__nav-menu-right">
              <li id="the-clock">
                <Clock />
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }
}

Navbar.propTypes = {
  filter: PropTypes.func,
  currentFilter: PropTypes.string
};

Navbar.defaultProps = {
  filter: () => {},
  currentFilter: ''
};

export default Navbar;
