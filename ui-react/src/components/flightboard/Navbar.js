import React, { Component } from 'react';
import PropTypes from 'prop-types';
import io from 'socket.io-client';
import * as config from '../../config/flightboard.config.js';

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
      logoUrl: '/img/logo.W.png'
    };
    this.socket = null;
  }

  componentDidMount() {
    this.fetchLogoConfig();
    
    // Connect to Socket.IO for real-time logo updates
    this.socket = io();
    
    this.socket.on('logoConfigUpdated', (config) => {
      console.log('Logo config updated via Socket.IO:', config);
      this.setState({ logoUrl: config.logoLightUrl });
    });
  }

  componentWillUnmount() {
    // Clean up socket connection
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  /**
   * Fetch current logo configuration from API
   * Uses logoLightUrl for flightboard (dark background)
   */
  fetchLogoConfig = () => {
    fetch('/api/logo')
      .then(response => response.json())
      .then(data => {
        this.setState({ logoUrl: data.logoLightUrl || '/img/logo.W.png' });
      })
      .catch(err => {
        console.error('Error fetching logo config:', err);
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
