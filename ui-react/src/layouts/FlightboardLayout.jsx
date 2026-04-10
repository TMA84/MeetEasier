/** @file FlightboardLayout.js
*  @description Layout wrapper for the flightboard view, managing room-list filter state, dark/light mode, URL sync, and rendering the Navbar and Flightboard components.
*/
import React from 'react';
import { useSearchParams } from 'react-router-dom';

import Flightboard from '../components/flightboard/Flightboard.jsx';
import Navbar from '../components/flightboard/Navbar.jsx';
import { getFlightboardDisplayTranslations } from '../config/display-translations.js';
import { applyAutoReload, stopAutoReload } from '../utils/auto-reload.js';

function FlightboardLayout() {
  const config = getFlightboardDisplayTranslations();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = React.useState(
    searchParams.get('filter') || config.roomFilter.filterDefault
  );
  const [flightboardDarkMode, setFlightboardDarkMode] = React.useState(true);

  const handleFilter = (filterValue) => {
    setFilter(filterValue);
    if (filterValue && filterValue !== config.roomFilter.filterDefault) {
      setSearchParams({ filter: filterValue });
    } else {
      setSearchParams({});
    }
  };

  // Fetch sidebar config for dark mode setting
  React.useEffect(() => {
    fetch('/api/sidebar')
      .then(response => response.json())
      .then(data => {
        setFlightboardDarkMode(data.flightboardDarkMode !== undefined ? data.flightboardDarkMode : true);
        applyAutoReload({
          autoReloadEnabled: !!data.autoReloadEnabled,
          autoReloadTime: data.autoReloadTime || '03:00'
        });
      })
      .catch(err => {
        console.error('Error fetching sidebar config:', err);
      });
    return () => stopAutoReload();
  }, []);

  // Update filter when URL changes
  React.useEffect(() => {
    const urlFilter = searchParams.get('filter');
    if (urlFilter && urlFilter !== filter) {
      setFilter(urlFilter);
    }
  }, [searchParams]);

  // Set page title
  React.useEffect(() => {
    document.title = config.navbar.title;
  }, [config.navbar.title]);

  // Apply flightboard-light class to body
  React.useEffect(() => {
    if (!flightboardDarkMode) {
      document.body.classList.add('flightboard-light');
    } else {
      document.body.classList.remove('flightboard-light');
    }
    return () => {
      document.body.classList.remove('flightboard-light');
    };
  }, [flightboardDarkMode]);

  const wrapperClass = flightboardDarkMode ? '' : 'flightboard-light';

  return (
    <div id="page-wrap" className={wrapperClass}>
      <Navbar filter={handleFilter} currentFilter={filter}/>
      <Flightboard filter={filter}/>
    </div>
  );
}

export default FlightboardLayout;
