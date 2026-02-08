import React, { Component } from 'react';
import './Admin.scss';

class Admin extends Component {
  constructor(props) {
    super(props);
    this.state = {
      // WiFi state
      currentSsid: '',
      currentPassword: '',
      wifiLastUpdated: '',
      ssid: '',
      password: '',
      wifiMessage: null,
      wifiMessageType: null,
      
      // Logo state
      currentLogoDarkUrl: '',
      currentLogoLightUrl: '',
      logoLastUpdated: '',
      logoDarkUrl: '',
      logoLightUrl: '',
      logoDarkFile: null,
      logoLightFile: null,
      logoMessage: null,
      logoMessageType: null,
      uploadMode: 'url', // 'url' or 'file'
      
      // Sidebar state
      currentShowWiFi: true,
      currentShowUpcomingMeetings: false,
      currentShowMeetingTitles: false,
      sidebarLastUpdated: '',
      showWiFi: true,
      showUpcomingMeetings: false,
      showMeetingTitles: false,
      sidebarMessage: null,
      sidebarMessageType: null,
      
      // Config locks (which settings are configured via .env)
      wifiLocked: false,
      logoLocked: false,
      sidebarLocked: false,
      bookingLocked: false,
      
      // Booking state
      currentEnableBooking: true,
      bookingLastUpdated: '',
      enableBooking: true,
      bookingMessage: null,
      bookingMessageType: null,
      bookingPermissionMissing: false,
      
      // Auth
      apiToken: ''
    };
  }

  componentDidMount() {
    this.loadConfigLocks();
    this.loadCurrentConfig();
    
    // Set page title
    const t = this.getTranslations();
    document.title = t.title;
  }

  loadConfigLocks = () => {
    fetch('/api/config-locks')
      .then(response => response.json())
      .then(data => {
        this.setState({
          wifiLocked: data.wifiLocked || false,
          logoLocked: data.logoLocked || false,
          sidebarLocked: data.sidebarLocked || false,
          bookingLocked: data.bookingLocked || false
        });
      })
      .catch(err => {
        console.error('Error loading config locks:', err);
      });
  }

  getTranslations() {
    const browserLang = navigator.language || navigator.userLanguage;
    const lang = browserLang.split('-')[0];
    
    const translations = {
      de: {
        title: 'Admin Panel',
        wifiSectionTitle: 'WiFi Konfiguration',
        logoSectionTitle: 'Logo Konfiguration',
        sidebarSectionTitle: 'Informationen Konfiguration',
        bookingSectionTitle: 'Buchungs Konfiguration',
        currentConfigTitle: 'Aktuelle Konfiguration',
        ssidLabel: 'SSID:',
        passwordLabel: 'Passwort:',
        lastUpdatedLabel: 'Zuletzt aktualisiert:',
        logoUrlLabel: 'Logo URL:',
        logoDarkUrlLabel: 'Logo URL (Dunkel):',
        logoLightUrlLabel: 'Logo URL (Hell):',
        apiTokenLabel: 'API Token:',
        apiTokenPlaceholder: 'API Token eingeben',
        apiTokenHelp: 'Erforderlich zum Aktualisieren der Einstellungen',
        wifiSsidLabel: 'WiFi SSID:',
        wifiSsidPlaceholder: 'WiFi-Netzwerkname eingeben',
        wifiPasswordLabel: 'WiFi Passwort:',
        wifiPasswordPlaceholder: 'WiFi-Passwort eingeben (optional)',
        logoUrlInputLabel: 'Logo URL:',
        logoUrlPlaceholder: 'Logo URL eingeben (z.B. /img/logo.B.png)',
        logoUrlHelp: 'Relativer oder absoluter Pfad zum Logo',
        logoDarkFileLabel: 'Dunkles Logo hochladen:',
        logoLightFileLabel: 'Helles Logo hochladen:',
        logoFileHelp: 'Erlaubte Formate: JPG, PNG, GIF, SVG, WebP (max. 5MB)',
        uploadModeUrl: 'URL eingeben',
        uploadModeFile: 'Datei hochladen',
        submitWifiButton: 'WiFi aktualisieren',
        submitLogoButton: 'Logo aktualisieren',
        wifiSuccessMessage: 'WiFi-Konfiguration erfolgreich aktualisiert!',
        logoSuccessMessage: 'Logo-Konfiguration erfolgreich aktualisiert!',
        sidebarSuccessMessage: 'Informationen-Konfiguration erfolgreich aktualisiert!',
        showWiFiLabel: 'WiFi-Informationen anzeigen',
        showUpcomingMeetingsLabel: 'Anstehende Meetings anzeigen',
        showMeetingTitlesLabel: 'Meeting-Titel anzeigen',
        showMeetingTitlesHelp: 'Gilt für Statusanzeige und anstehende Meetings',
        submitSidebarButton: 'Informationen aktualisieren',
        sidebarHelp: 'Wählen Sie aus, was in der Sidebar der Raumanzeigen angezeigt werden soll',
        enableBookingLabel: 'Buchungsfunktion aktivieren',
        enableBookingHelp: 'Ermöglicht Benutzern, Räume direkt über die Anzeige zu buchen',
        submitBookingButton: 'Buchung aktualisieren',
        bookingSuccessMessage: 'Buchungs-Konfiguration erfolgreich aktualisiert!',
        errorUnauthorized: 'Nicht autorisiert: Ungültiger oder fehlender API-Token',
        errorPrefix: 'Fehler:',
        errorUnknown: 'Unbekannter Fehler',
        loading: 'Lädt...',
        configuredViaEnv: 'Diese Einstellungen sind über Umgebungsvariablen konfiguriert und können hier nicht geändert werden.'
      },
      en: {
        title: 'Admin Panel',
        wifiSectionTitle: 'WiFi Configuration',
        logoSectionTitle: 'Logo Configuration',
        sidebarSectionTitle: 'Information Configuration',
        bookingSectionTitle: 'Booking Configuration',
        currentConfigTitle: 'Current Configuration',
        ssidLabel: 'SSID:',
        passwordLabel: 'Password:',
        lastUpdatedLabel: 'Last Updated:',
        logoUrlLabel: 'Logo URL:',
        logoDarkUrlLabel: 'Logo URL (Dark):',
        logoLightUrlLabel: 'Logo URL (Light):',
        apiTokenLabel: 'API Token:',
        apiTokenPlaceholder: 'Enter API token',
        apiTokenHelp: 'Required to update settings',
        wifiSsidLabel: 'WiFi SSID:',
        wifiSsidPlaceholder: 'Enter WiFi network name',
        wifiPasswordLabel: 'WiFi Password:',
        wifiPasswordPlaceholder: 'Enter WiFi password (optional)',
        logoUrlInputLabel: 'Logo URL:',
        logoUrlPlaceholder: 'Enter logo URL (e.g. /img/logo.B.png)',
        logoUrlHelp: 'Relative or absolute path to logo',
        logoDarkFileLabel: 'Upload Dark Logo:',
        logoLightFileLabel: 'Upload Light Logo:',
        logoFileHelp: 'Allowed formats: JPG, PNG, GIF, SVG, WebP (max. 5MB)',
        uploadModeUrl: 'Enter URL',
        uploadModeFile: 'Upload File',
        submitWifiButton: 'Update WiFi',
        submitLogoButton: 'Update Logo',
        wifiSuccessMessage: 'WiFi configuration updated successfully!',
        logoSuccessMessage: 'Logo configuration updated successfully!',
        sidebarSuccessMessage: 'Information configuration updated successfully!',
        showWiFiLabel: 'Show WiFi Information',
        showUpcomingMeetingsLabel: 'Show Upcoming Meetings',
        showMeetingTitlesLabel: 'Show Meeting Titles',
        showMeetingTitlesHelp: 'Applies to both status panel and upcoming meetings list',
        submitSidebarButton: 'Update Information',
        sidebarHelp: 'Choose what to display in the sidebar of room displays',
        enableBookingLabel: 'Enable Booking Feature',
        enableBookingHelp: 'Allows users to book rooms directly from the display',
        submitBookingButton: 'Update Booking',
        bookingSuccessMessage: 'Booking configuration updated successfully!',
        errorUnauthorized: 'Unauthorized: Invalid or missing API token',
        errorPrefix: 'Error:',
        errorUnknown: 'Unknown error',
        loading: 'Loading...',
        configuredViaEnv: 'These settings are configured via environment variables and cannot be changed here.'
      }
    };
    
    return translations[lang] || translations.en;
  }

  loadCurrentConfig = () => {
    // Load WiFi config
    fetch('/api/wifi')
      .then(response => response.json())
      .then(data => {
        this.setState({
          currentSsid: data.ssid || '-',
          currentPassword: data.password || '-',
          wifiLastUpdated: data.lastUpdated 
            ? new Date(data.lastUpdated).toLocaleString(navigator.language || 'de-DE')
            : '-',
          ssid: data.ssid || '',
          password: data.password || ''
        });
      })
      .catch(err => {
        console.error('Error loading WiFi config:', err);
      });
    
    // Load Logo config
    fetch('/api/logo')
      .then(response => response.json())
      .then(data => {
        this.setState({
          currentLogoDarkUrl: data.logoDarkUrl || '-',
          currentLogoLightUrl: data.logoLightUrl || '-',
          logoLastUpdated: data.lastUpdated 
            ? new Date(data.lastUpdated).toLocaleString(navigator.language || 'de-DE')
            : '-',
          logoDarkUrl: data.logoDarkUrl || '',
          logoLightUrl: data.logoLightUrl || ''
        });
      })
      .catch(err => {
        console.error('Error loading logo config:', err);
      });
    
    // Load Sidebar config
    fetch('/api/sidebar')
      .then(response => response.json())
      .then(data => {
        this.setState({
          currentShowWiFi: data.showWiFi !== undefined ? data.showWiFi : true,
          currentShowUpcomingMeetings: data.showUpcomingMeetings !== undefined ? data.showUpcomingMeetings : false,
          currentShowMeetingTitles: data.showMeetingTitles !== undefined ? data.showMeetingTitles : false,
          sidebarLastUpdated: data.lastUpdated 
            ? new Date(data.lastUpdated).toLocaleString(navigator.language || 'de-DE')
            : '-',
          showWiFi: data.showWiFi !== undefined ? data.showWiFi : true,
          showUpcomingMeetings: data.showUpcomingMeetings !== undefined ? data.showUpcomingMeetings : false,
          showMeetingTitles: data.showMeetingTitles !== undefined ? data.showMeetingTitles : false
        });
      })
      .catch(err => {
        console.error('Error loading sidebar config:', err);
      });
    
    // Load Booking config
    fetch('/api/booking-config')
      .then(response => response.json())
      .then(data => {
        this.setState({
          currentEnableBooking: data.enableBooking !== undefined ? data.enableBooking : true,
          bookingLastUpdated: data.lastUpdated 
            ? new Date(data.lastUpdated).toLocaleString(navigator.language || 'de-DE')
            : '-',
          enableBooking: data.enableBooking !== undefined ? data.enableBooking : true,
          bookingPermissionMissing: data.permissionMissing || false
        });
      })
      .catch(err => {
        console.error('Error loading booking config:', err);
      });
  }

  handleWiFiSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const { apiToken, ssid, password } = this.state;
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`;
    }
    
    fetch('/api/wifi', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ ssid, password })
    })
    .then(response => {
      if (response.status === 401) {
        throw new Error(t.errorUnauthorized);
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        this.setState({
          wifiMessage: t.wifiSuccessMessage,
          wifiMessageType: 'success'
        });
        this.loadCurrentConfig();
        
        setTimeout(() => {
          this.setState({ wifiMessage: null, wifiMessageType: null });
        }, 5000);
      } else {
        this.setState({
          wifiMessage: `${t.errorPrefix} ${data.error || t.errorUnknown}`,
          wifiMessageType: 'error'
        });
      }
    })
    .catch(err => {
      this.setState({
        wifiMessage: `${t.errorPrefix} ${err.message}`,
        wifiMessageType: 'error'
      });
    });
  }

  handleLogoSubmit = async (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const { apiToken, logoDarkUrl, logoLightUrl, logoDarkFile, logoLightFile, uploadMode } = this.state;
    
    const headers = {};
    
    if (apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`;
    }
    
    try {
      let finalLogoDarkUrl = logoDarkUrl;
      let finalLogoLightUrl = logoLightUrl;
      
      // Handle file uploads
      if (uploadMode === 'file') {
        // Upload dark logo if provided
        if (logoDarkFile) {
          const formData = new FormData();
          formData.append('logo', logoDarkFile);
          formData.append('logoType', 'dark');
          
          const response = await fetch('/api/logo/upload', {
            method: 'POST',
            headers: headers,
            body: formData
          });
          
          if (response.status === 401) {
            throw new Error(t.errorUnauthorized);
          }
          
          const data = await response.json();
          if (data.success) {
            finalLogoDarkUrl = data.logoUrl;
          } else {
            throw new Error(data.error || t.errorUnknown);
          }
        }
        
        // Upload light logo if provided
        if (logoLightFile) {
          const formData = new FormData();
          formData.append('logo', logoLightFile);
          formData.append('logoType', 'light');
          
          const response = await fetch('/api/logo/upload', {
            method: 'POST',
            headers: headers,
            body: formData
          });
          
          if (response.status === 401) {
            throw new Error(t.errorUnauthorized);
          }
          
          const data = await response.json();
          if (data.success) {
            finalLogoLightUrl = data.logoUrl;
          } else {
            throw new Error(data.error || t.errorUnknown);
          }
        }
        
        if (!logoDarkFile && !logoLightFile) {
          throw new Error('Please select at least one logo file to upload');
        }
      }
      
      // Update logo configuration with URLs (either from input or from uploads)
      headers['Content-Type'] = 'application/json';
      
      const response = await fetch('/api/logo', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ 
          logoDarkUrl: finalLogoDarkUrl, 
          logoLightUrl: finalLogoLightUrl 
        })
      });
      
      if (response.status === 401) {
        throw new Error(t.errorUnauthorized);
      }
      
      const data = await response.json();
      
      if (data.success) {
        this.setState({
          logoMessage: t.logoSuccessMessage,
          logoMessageType: 'success',
          logoDarkFile: null,
          logoLightFile: null
        });
        this.loadCurrentConfig();
        
        // Reset file inputs
        const darkFileInput = document.getElementById('logoDarkFile');
        const lightFileInput = document.getElementById('logoLightFile');
        if (darkFileInput) darkFileInput.value = '';
        if (lightFileInput) lightFileInput.value = '';
        
        setTimeout(() => {
          this.setState({ logoMessage: null, logoMessageType: null });
        }, 5000);
      } else {
        throw new Error(data.error || t.errorUnknown);
      }
    } catch (err) {
      this.setState({
        logoMessage: `${t.errorPrefix} ${err.message}`,
        logoMessageType: 'error'
      });
    }
  }

  handleSidebarSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const { apiToken, showWiFi, showUpcomingMeetings, showMeetingTitles } = this.state;
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`;
    }
    
    fetch('/api/sidebar', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ showWiFi, showUpcomingMeetings, showMeetingTitles })
    })
    .then(response => {
      if (response.status === 401) {
        throw new Error(t.errorUnauthorized);
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        this.setState({
          sidebarMessage: t.sidebarSuccessMessage,
          sidebarMessageType: 'success'
        });
        this.loadCurrentConfig();
        
        setTimeout(() => {
          this.setState({ sidebarMessage: null, sidebarMessageType: null });
        }, 5000);
      } else {
        this.setState({
          sidebarMessage: `${t.errorPrefix} ${data.error || t.errorUnknown}`,
          sidebarMessageType: 'error'
        });
      }
    })
    .catch(err => {
      this.setState({
        sidebarMessage: `${t.errorPrefix} ${err.message}`,
        sidebarMessageType: 'error'
      });
    });
  }

  handleBookingSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const { apiToken, enableBooking } = this.state;
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`;
    }
    
    fetch('/api/booking-config', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ enableBooking })
    })
    .then(response => {
      if (response.status === 401) {
        throw new Error(t.errorUnauthorized);
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        this.setState({
          bookingMessage: t.bookingSuccessMessage,
          bookingMessageType: 'success'
        });
        this.loadCurrentConfig();
        
        setTimeout(() => {
          this.setState({ bookingMessage: null, bookingMessageType: null });
        }, 5000);
      } else {
        this.setState({
          bookingMessage: `${t.errorPrefix} ${data.error || t.errorUnknown}`,
          bookingMessageType: 'error'
        });
      }
    })
    .catch(err => {
      this.setState({
        bookingMessage: `${t.errorPrefix} ${err.message}`,
        bookingMessageType: 'error'
      });
    });
  }

  render() {
    const { 
      currentSsid, currentPassword, wifiLastUpdated, 
      currentLogoDarkUrl, currentLogoLightUrl, logoLastUpdated,
      currentShowWiFi, currentShowUpcomingMeetings, currentShowMeetingTitles, sidebarLastUpdated,
      currentEnableBooking, bookingLastUpdated,
      apiToken, ssid, password, logoDarkUrl, logoLightUrl, logoDarkFile, logoLightFile, uploadMode,
      showWiFi, showUpcomingMeetings, showMeetingTitles,
      enableBooking,
      wifiMessage, wifiMessageType, logoMessage, logoMessageType, sidebarMessage, sidebarMessageType,
      bookingMessage, bookingMessageType,
      wifiLocked, logoLocked, sidebarLocked, bookingLocked,
      bookingPermissionMissing
    } = this.state;
    const t = this.getTranslations();

    return (
      <div className="admin-page">
        <div className="admin-container">
          <div className="admin-logo">
            <img src={currentLogoLightUrl || "/img/logo.W.png"} alt="Logo" onError={(e) => { e.target.src = "/img/logo.W.png"; }} />
          </div>

          <h1>{t.title}</h1>
          
          {/* API Token Section */}
          <div className="admin-token-section">
            <div className="admin-form-group">
              <label htmlFor="apiToken">{t.apiTokenLabel}</label>
              <input
                type="password"
                id="apiToken"
                value={apiToken}
                onChange={(e) => this.setState({ apiToken: e.target.value })}
                placeholder={t.apiTokenPlaceholder}
                autoComplete="off"
              />
              <small>{t.apiTokenHelp}</small>
            </div>
          </div>

          {/* WiFi Configuration Section */}
          {!wifiLocked && (
          <div className="admin-section">
            <h2>{t.wifiSectionTitle}</h2>
            
            <div className="admin-current-config">
              <h3>{t.currentConfigTitle}</h3>
              <p><strong>{t.ssidLabel}</strong> {currentSsid}</p>
              <p><strong>{t.passwordLabel}</strong> {currentPassword}</p>
              <p><strong>{t.lastUpdatedLabel}</strong> {wifiLastUpdated}</p>
            </div>

            <form onSubmit={this.handleWiFiSubmit}>
              <div className="admin-form-group">
                <label htmlFor="ssid">{t.wifiSsidLabel}</label>
                <input
                  type="text"
                  id="ssid"
                  value={ssid}
                  onChange={(e) => this.setState({ ssid: e.target.value })}
                  required
                  placeholder={t.wifiSsidPlaceholder}
                />
              </div>
              
              <div className="admin-form-group">
                <label htmlFor="password">{t.wifiPasswordLabel}</label>
                <input
                  type="text"
                  id="password"
                  value={password}
                  onChange={(e) => this.setState({ password: e.target.value })}
                  placeholder={t.wifiPasswordPlaceholder}
                />
              </div>
              
              <button type="submit" className="admin-submit-button">
                {t.submitWifiButton}
              </button>
            </form>

            {wifiMessage && (
              <div className={`admin-message admin-message-${wifiMessageType}`}>
                {wifiMessage}
              </div>
            )}

            <div className="admin-qr-preview">
              <img 
                src={`/img/wifi-qr.png?t=${Date.now()}`} 
                alt="WiFi QR Code" 
                onError={(e) => e.target.style.display = 'none'}
              />
            </div>
          </div>
          )}

          {wifiLocked && (
          <div className="admin-section">
            <h2>{t.wifiSectionTitle}</h2>
            <div className="admin-locked-message">
              <p>{t.configuredViaEnv}</p>
            </div>
          </div>
          )}

          {/* Logo Configuration Section */}
          {!logoLocked && (
          <div className="admin-section">
            <h2>{t.logoSectionTitle}</h2>
            
            <div className="admin-current-config">
              <h3>{t.currentConfigTitle}</h3>
              <p><strong>{t.logoDarkUrlLabel}</strong> {currentLogoDarkUrl}</p>
              <p><strong>{t.logoLightUrlLabel}</strong> {currentLogoLightUrl}</p>
              <p><strong>{t.lastUpdatedLabel}</strong> {logoLastUpdated}</p>
            </div>

            {/* Upload Mode Toggle */}
            <div className="admin-upload-mode">
              <button 
                type="button"
                className={`admin-mode-button ${uploadMode === 'url' ? 'active' : ''}`}
                onClick={() => this.setState({ uploadMode: 'url', logoDarkFile: null, logoLightFile: null })}
              >
                {t.uploadModeUrl}
              </button>
              <button 
                type="button"
                className={`admin-mode-button ${uploadMode === 'file' ? 'active' : ''}`}
                onClick={() => this.setState({ uploadMode: 'file' })}
              >
                {t.uploadModeFile}
              </button>
            </div>

            <form onSubmit={this.handleLogoSubmit}>
              {uploadMode === 'url' ? (
                <>
                  <div className="admin-form-group">
                    <label htmlFor="logoDarkUrl">{t.logoDarkUrlLabel}</label>
                    <input
                      type="text"
                      id="logoDarkUrl"
                      value={logoDarkUrl}
                      onChange={(e) => this.setState({ logoDarkUrl: e.target.value })}
                      placeholder={t.logoUrlPlaceholder}
                    />
                    <small>{t.logoUrlHelp}</small>
                  </div>
                  <div className="admin-form-group">
                    <label htmlFor="logoLightUrl">{t.logoLightUrlLabel}</label>
                    <input
                      type="text"
                      id="logoLightUrl"
                      value={logoLightUrl}
                      onChange={(e) => this.setState({ logoLightUrl: e.target.value })}
                      placeholder={t.logoUrlPlaceholder}
                    />
                    <small>{t.logoUrlHelp}</small>
                  </div>
                </>
              ) : (
                <>
                  <div className="admin-form-group">
                    <label htmlFor="logoDarkFile">{t.logoDarkFileLabel}</label>
                    <input
                      type="file"
                      id="logoDarkFile"
                      accept="image/*"
                      onChange={(e) => this.setState({ logoDarkFile: e.target.files[0] })}
                      className="admin-file-input"
                    />
                    <small>{t.logoFileHelp}</small>
                    {logoDarkFile && (
                      <div className="admin-file-preview">
                        Selected: {logoDarkFile.name} ({(logoDarkFile.size / 1024).toFixed(2)} KB)
                      </div>
                    )}
                  </div>
                  <div className="admin-form-group">
                    <label htmlFor="logoLightFile">{t.logoLightFileLabel}</label>
                    <input
                      type="file"
                      id="logoLightFile"
                      accept="image/*"
                      onChange={(e) => this.setState({ logoLightFile: e.target.files[0] })}
                      className="admin-file-input"
                    />
                    <small>{t.logoFileHelp}</small>
                    {logoLightFile && (
                      <div className="admin-file-preview">
                        Selected: {logoLightFile.name} ({(logoLightFile.size / 1024).toFixed(2)} KB)
                      </div>
                    )}
                  </div>
                </>
              )}
              
              <button type="submit" className="admin-submit-button">
                {t.submitLogoButton}
              </button>
            </form>

            {logoMessage && (
              <div className={`admin-message admin-message-${logoMessageType}`}>
                {logoMessage}
              </div>
            )}

            <div className="admin-logo-preview">
              <h3>Preview:</h3>
              <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>Dark Logo:</p>
                  <img 
                    src={logoDarkUrl || currentLogoDarkUrl} 
                    alt="Dark Logo Preview" 
                    onError={(e) => { e.target.src = "/img/logo.B.png"; }}
                  />
                </div>
                <div>
                  <p style={{ marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>Light Logo:</p>
                  <img 
                    src={logoLightUrl || currentLogoLightUrl} 
                    alt="Light Logo Preview" 
                    onError={(e) => { e.target.src = "/img/logo.W.png"; }}
                  />
                </div>
              </div>
            </div>
          </div>
          )}

          {logoLocked && (
          <div className="admin-section">
            <h2>{t.logoSectionTitle}</h2>
            <div className="admin-locked-message">
              <p>{t.configuredViaEnv}</p>
            </div>
          </div>
          )}

          {/* Sidebar Configuration Section */}
          {!sidebarLocked && (
          <div className="admin-section">
            <h2>{t.sidebarSectionTitle}</h2>
            
            <div className="admin-current-config">
              <h3>{t.currentConfigTitle}</h3>
              <p><strong>{t.showWiFiLabel}:</strong> {currentShowWiFi ? 'Yes' : 'No'}</p>
              <p><strong>{t.showUpcomingMeetingsLabel}:</strong> {currentShowUpcomingMeetings ? 'Yes' : 'No'}</p>
              <p><strong>{t.showMeetingTitlesLabel}:</strong> {currentShowMeetingTitles ? 'Yes' : 'No'}</p>
              <p><strong>{t.lastUpdatedLabel}</strong> {sidebarLastUpdated}</p>
            </div>

            <form onSubmit={this.handleSidebarSubmit}>
              <div className="admin-form-group">
                <label className="inline-label">
                  <span className="label-text">{t.showWiFiLabel}</span>
                  <input
                    type="radio"
                    name="sidebarDisplay"
                    checked={showWiFi && !showUpcomingMeetings}
                    onChange={() => this.setState({ showWiFi: true, showUpcomingMeetings: false })}
                  />
                </label>
              </div>
              
              <div className="admin-form-group">
                <label className="inline-label">
                  <span className="label-text">{t.showUpcomingMeetingsLabel}</span>
                  <input
                    type="radio"
                    name="sidebarDisplay"
                    checked={!showWiFi && showUpcomingMeetings}
                    onChange={() => this.setState({ showWiFi: false, showUpcomingMeetings: true })}
                  />
                </label>
              </div>
              
              <div className="admin-form-group" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                <label className="inline-label">
                  <span className="label-text">{t.showMeetingTitlesLabel}</span>
                  <input
                    type="checkbox"
                    checked={showMeetingTitles}
                    onChange={(e) => this.setState({ showMeetingTitles: e.target.checked })}
                  />
                </label>
                <small style={{ display: 'block', marginTop: '0.5rem', marginLeft: '1rem', color: 'rgba(255,255,255,0.6)' }}>
                  {t.showMeetingTitlesHelp || 'Applies to both status panel and upcoming meetings list'}
                </small>
              </div>
              
              <small style={{ display: 'block', marginBottom: '1rem', color: 'rgba(255,255,255,0.7)' }}>
                {t.sidebarHelp}
              </small>
              
              <button type="submit" className="admin-submit-button">
                {t.submitSidebarButton}
              </button>
            </form>

            {sidebarMessage && (
              <div className={`admin-message admin-message-${sidebarMessageType}`}>
                {sidebarMessage}
              </div>
            )}
          </div>
          )}

          {sidebarLocked && (
          <div className="admin-section">
            <h2>{t.sidebarSectionTitle}</h2>
            <div className="admin-locked-message">
              <p>{t.configuredViaEnv}</p>
            </div>
          </div>
          )}

          {/* Booking Configuration Section */}
          {!bookingLocked && (
          <div className="admin-section">
            <h2>{t.bookingSectionTitle}</h2>
            
            {bookingPermissionMissing && (
              <div className="admin-message admin-message-warning" style={{ marginBottom: '1rem' }}>
                <strong>⚠️ Permission Missing:</strong> Calendars.ReadWrite permission is not granted in Azure AD. 
                The booking feature is automatically disabled. Please grant this permission to enable room booking.
              </div>
            )}
            
            <div className="admin-current-config">
              <h3>{t.currentConfigTitle}</h3>
              <p><strong>{t.enableBookingLabel}:</strong> {currentEnableBooking ? 'Yes' : 'No'}</p>
              {bookingPermissionMissing && (
                <p style={{ color: '#f59e0b' }}><strong>Status:</strong> Disabled (Permission Missing)</p>
              )}
              <p><strong>{t.lastUpdatedLabel}</strong> {bookingLastUpdated}</p>
            </div>

            <form onSubmit={this.handleBookingSubmit}>
              <div className="admin-form-group">
                <label className="inline-label">
                  <span className="label-text">{t.enableBookingLabel}</span>
                  <input
                    type="checkbox"
                    checked={enableBooking}
                    onChange={(e) => this.setState({ enableBooking: e.target.checked })}
                    disabled={bookingPermissionMissing}
                  />
                </label>
                <small style={{ display: 'block', marginTop: '0.5rem', marginLeft: '1rem', color: 'rgba(255,255,255,0.6)' }}>
                  {bookingPermissionMissing 
                    ? 'Cannot enable: Calendars.ReadWrite permission is missing'
                    : t.enableBookingHelp
                  }
                </small>
              </div>
              
              <button 
                type="submit" 
                className="admin-submit-button"
                disabled={bookingPermissionMissing}
              >
                {t.submitBookingButton}
              </button>
            </form>

            {bookingMessage && (
              <div className={`admin-message admin-message-${bookingMessageType}`}>
                {bookingMessage}
              </div>
            )}
          </div>
          )}

          {bookingLocked && (
          <div className="admin-section">
            <h2>{t.bookingSectionTitle}</h2>
            <div className="admin-locked-message">
              <p>{t.configuredViaEnv}</p>
            </div>
          </div>
          )}
        </div>
      </div>
    );
  }
}

export default Admin;
