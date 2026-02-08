import React from 'react';

/**
 * Spinner component - Loading indicator
 * Displays an animated spinner while data is being fetched
 */
const Spinner = () => (
  <p id="fb__spinner-wrap">
    <img 
      id="fb__spinner" 
      alt="Loading..." 
      src="/svgs/spinner.svg" 
    />
  </p>
);

export default Spinner;
