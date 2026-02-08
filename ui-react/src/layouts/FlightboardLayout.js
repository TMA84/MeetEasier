import React, { Component } from 'react';
import { useSearchParams } from 'react-router-dom';

import Flightboard from '../components/flightboard/Flightboard';
import Navbar from '../components/flightboard/Navbar';
import * as config from '../config/flightboard.config.js';

function FlightboardLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = React.useState(
    searchParams.get('filter') || config.roomFilter.filterDefault
  );

  const handleFilter = (filterValue) => {
    setFilter(filterValue);
    // Update URL with new filter
    if (filterValue && filterValue !== config.roomFilter.filterDefault) {
      setSearchParams({ filter: filterValue });
    } else {
      setSearchParams({});
    }
  };

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
  }, []);

  return (
    <div id="page-wrap">
      <Navbar filter={handleFilter} currentFilter={filter}/>
      <Flightboard filter={filter}/>
    </div>
  );
}

export default FlightboardLayout;
