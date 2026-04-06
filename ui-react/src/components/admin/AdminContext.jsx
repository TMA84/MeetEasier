/** @file AdminContext.js
*  @description React context provider for admin panel state management, exposing shared state, update helpers, and auto-clearing status messages to admin child components.
*/
import React, { createContext, useContext, useState, useCallback } from 'react';

const AdminContext = createContext();

/**
* Hook to access the admin context.
* @returns {Object} Admin context value
*/
export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
};

/**
* Provider component for admin panel state.
* @param {Object} props - Component props
* @param {React.ReactNode} props.children - Child components
* @param {Object} props.initialState - Initial admin state
* @returns {React.ReactElement} Provider element
*/
export const AdminProvider = ({ children, initialState = {} }) => {
  const [state, setState] = useState({
    // API Token
    apiToken: initialState.apiToken || '',
    
    // Active Tab
    activeTab: initialState.activeTab || 'display',
    activeSection: initialState.activeSection || 'displays',
    
    // Messages
    connectedDisplaysMessage: null,
    connectedDisplaysMessageType: null,
    
    // Loading states
    connectedDisplaysLoading: false,
    
    // Data
    connectedDisplays: [],
    
    // Modals
    showPowerManagementModal: false,
    powerManagementClientId: null,
    powerManagementMode: 'browser',
    powerManagementMqttHostname: '',
    powerManagementScheduleEnabled: false,
    powerManagementStartTime: '20:00',
    powerManagementEndTime: '07:00',
    powerManagementWeekendMode: false,
    powerManagementMessage: null,
    powerManagementMessageType: null,
    
    showTouchkioModal: false,
    touchkioModalDisplay: null,
    touchkioModalMessage: null,
    touchkioModalMessageType: null,
    touchkioModalBrightness: undefined,
    touchkioModalVolume: undefined,
    touchkioModalZoom: undefined,
    
    ...initialState
  });

  const updateState = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const setMessage = useCallback((message, type = 'success', key = 'connectedDisplays') => {
    updateState({
      [`${key}Message`]: message,
      [`${key}MessageType`]: type
    });
    
    // Auto-clear after 3 seconds
    setTimeout(() => {
      updateState({
        [`${key}Message`]: null,
        [`${key}MessageType`]: null
      });
    }, 3000);
  }, [updateState]);

  const value = {
    state,
    updateState,
    setMessage
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};
