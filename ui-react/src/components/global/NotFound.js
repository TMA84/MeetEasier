import React from 'react';

/**
 * NotFound component - 404 error page
 * Displayed when user navigates to a non-existent route
 */
const NotFound = () => (
  <div id="error-text">
    <div id="error-header">Sorry :(</div>
    Either there was an error in processing or this page does not exist.
  </div>
);

export default NotFound;
