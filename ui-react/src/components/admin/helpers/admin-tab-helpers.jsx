/**
* @file AdminTabHelpers.js
* @description Shared UI components for admin tab panels.
*              Extracts common patterns: locked config message and status message display.
*/
import React from 'react';

/**
* Renders the "configured via environment" locked message block.
*
* @param {string} title - Section title (e.g. "Search Configuration")
* @param {string} envMessage - Translation string for "configured via env"
* @returns {JSX.Element}
*/
export const AdminLockedMessage = ({ title, envMessage }) => (
  <>
    <h3>{title}</h3>
    <div className="admin-locked-message">
      <p>{envMessage}</p>
    </div>
    <div className="admin-form-divider"></div>
  </>
);

/**
* Renders a status message (success/error) after form submission.
*
* @param {string} message - Message text (null/empty to hide)
* @param {string} messageType - CSS modifier ('success' or 'error')
* @returns {JSX.Element|null}
*/
export const AdminStatusMessage = ({ message, messageType }) => {
  if (!message) return null;
  return (
    <div className={`admin-message admin-message-${messageType}`}>
      {message}
    </div>
  );
};
