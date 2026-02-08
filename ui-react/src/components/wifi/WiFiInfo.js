import React, { Component } from 'react';
import io from 'socket.io-client';
import './WiFi.scss';

class WiFiInfo extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      error: null,
      ssid: '',
      password: ''
    };
    this.socket = null;
  }

  componentDidMount() {
    this.loadWiFiInfo();
    
    // Connect to Socket.IO for real-time updates
    this.socket = io();
    
    // Listen for WiFi config updates
    if (this.socket && this.socket.on) {
      this.socket.on('wifiConfigUpdated', (config) => {
        console.log('WiFi config updated via Socket.IO:', config);
        this.setState({
          ssid: config.ssid || '-',
          password: config.password || '-',
          loading: false
        });
        
        // Force QR code image reload
        const qrImage = document.querySelector('.wifi-qr-container img');
        if (qrImage) {
          qrImage.src = `/img/wifi-qr.png?t=${Date.now()}`;
        }
      });
    }
    
    // Reload every 30 seconds as backup
    this.interval = setInterval(() => this.loadWiFiInfo(), 30000);
    
    // Set page title
    const t = this.getTranslations();
    document.title = t.title;
  }

  componentWillUnmount() {
    if (this.interval) {
      clearInterval(this.interval);
    }
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  loadWiFiInfo = () => {
    fetch('/api/wifi')
      .then(response => response.json())
      .then(data => {
        this.setState({
          loading: false,
          ssid: data.ssid || '-',
          password: data.password || '-'
        });
      })
      .catch(err => {
        this.setState({
          loading: false,
          error: err.message
        });
      });
  }

  getTranslations() {
    const browserLang = navigator.language || navigator.userLanguage;
    const lang = browserLang.split('-')[0];
    
    const translations = {
      de: {
        title: 'WiFi Informationen',
        ssidLabel: 'SSID:',
        passwordLabel: 'Passwort:',
        loading: 'Lade WiFi-Informationen...',
        errorPrefix: 'Fehler beim Laden der WiFi-Informationen:'
      },
      en: {
        title: 'WiFi Information',
        ssidLabel: 'SSID:',
        passwordLabel: 'Password:',
        loading: 'Loading WiFi information...',
        errorPrefix: 'Error loading WiFi information:'
      }
    };
    
    return translations[lang] || translations.en;
  }

  render() {
    const { loading, error, ssid, password } = this.state;
    const t = this.getTranslations();

    return (
      <div className="wifi-page">
        <div className="wifi-container">
          <div className="wifi-logo">
            <img src="/img/logo.W.png" alt="Logo" onError={(e) => e.target.style.display = 'none'} />
          </div>

          <h1>{t.title}</h1>

          {loading ? (
            <div className="wifi-loading">{t.loading}</div>
          ) : error ? (
            <div className="wifi-error">
              {t.errorPrefix} {error}
            </div>
          ) : (
            <>
              <div className="wifi-details">
                <div className="wifi-row">
                  <span className="wifi-label">{t.ssidLabel}</span>
                  <span className="wifi-value">{ssid}</span>
                </div>
                <div className="wifi-row">
                  <span className="wifi-label">{t.passwordLabel}</span>
                  <span className="wifi-value">{password}</span>
                </div>
              </div>

              <div className="wifi-qr-container">
                <img 
                  src={`/img/wifi-qr.png?t=${Date.now()}`} 
                  alt="WiFi QR Code" 
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
}

export default WiFiInfo;
