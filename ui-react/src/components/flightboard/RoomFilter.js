import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import config from '../../config/flightboard.config.js';
import './RoomFilter.scss';

/**
 * RoomFilter component - Dropdown filter for room lists
 * Allows users to filter displayed rooms by building/location
 * Supports keyboard navigation and click-outside-to-close
 */
function RoomFilter({ filter, error, response, roomlists, currentFilter }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState(config.roomFilter.filterAllTitle);
  const dropdownRef = useRef(null);

  /**
   * Update selected filter display when currentFilter prop changes
   * Syncs the dropdown display with the active filter
   */
  useEffect(() => {
    if (currentFilter) {
      // Show "All Rooms" for default filter
      if (currentFilter === 'roomlist-all' || currentFilter === '') {
        setSelectedFilter(config.roomFilter.filterAllTitle);
      } else {
        // Extract roomlist name from filter ID (e.g., "roomlist-frankfurt" -> "Frankfurt")
        const roomlistName = currentFilter.replace('roomlist-', '').replace(/-/g, ' ');
        
        // Find matching roomlist (case-insensitive)
        const matchingRoomlist = roomlists.find(
          item => item.toLowerCase().replace(/\s+/g, '-') === roomlistName.toLowerCase().replace(/\s+/g, '-')
        );
        
        if (matchingRoomlist) {
          setSelectedFilter(matchingRoomlist);
        }
      }
    }
  }, [currentFilter, roomlists]);

  /**
   * Close dropdown when clicking outside
   * Improves UX by allowing users to dismiss dropdown naturally
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  /**
   * Handle filter selection
   * @param {string} filterId - Filter ID to apply (e.g., 'roomlist-all')
   * @param {string} itemName - Display name for the filter
   */
  const handleFilterClick = (filterId, itemName) => {
    filter(filterId);
    setSelectedFilter(itemName);
    setIsOpen(false);
  };

  /**
   * Toggle dropdown open/closed state
   * @param {Event} e - Click event
   */
  const toggleDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <li className="dropdown-container" ref={dropdownRef}>
      {/* Dropdown trigger */}
      <a href="#" className="current-filter" onClick={toggleDropdown}>
        {selectedFilter} <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </a>

      {/* Dropdown menu */}
      {isOpen && (
        <ul className="dropdown-menu">
          {/* "All Rooms" option */}
          <li 
            onClick={() => handleFilterClick('roomlist-all', config.roomFilter.filterAllTitle)}
            className="dropdown-item"
          >
            {config.roomFilter.filterAllTitle}
          </li>

          {/* Room list options */}
          {response && !error ? (
            roomlists.map((item, key) => (
              <li 
                onClick={() => handleFilterClick(
                  `roomlist-${item.toLowerCase().replace(/\s+/g, '-')}`, 
                  item
                )}
                key={key}
                className="dropdown-item"
              >
                {item}
              </li>
            ))
          ) : (
            // Loading state
            <li className="dropdown-item loading">
              Loading ...
            </li>
          )}
        </ul>
      )}
    </li>
  );
}

RoomFilter.propTypes = {
  filter: PropTypes.func.isRequired,
  error: PropTypes.bool,
  response: PropTypes.bool,
  roomlists: PropTypes.array,
  currentFilter: PropTypes.string
};

RoomFilter.defaultProps = {
  error: false,
  response: false,
  roomlists: [],
  currentFilter: ''
};

export default RoomFilter;
