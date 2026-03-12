import React from 'react';

const ColorsTab = ({
  t,
  currentBookingButtonColor,
  currentStatusAvailableColor,
  currentStatusBusyColor,
  currentStatusUpcomingColor,
  currentStatusNotFoundColor,
  bookingButtonColor,
  statusAvailableColor,
  statusBusyColor,
  statusUpcomingColor,
  statusNotFoundColor,
  colorMessage,
  colorMessageType,
  hexToHSL,
  hslToHex,
  onColorChange,
  onResetColor,
  onSubmit
}) => {
  const greenColors = ['#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'];
  const redColors = ['#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'];
  const yellowColors = ['#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#a16207', '#854d0e'];
  const grayColors = ['#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937', '#111827'];

  const renderColorPicker = (label, colorKey, currentColor, presetColors, hueMin, hueMax, defaultColor, helpText) => {
    const hsl = hexToHSL(currentColor);
    
    return (
      <div className="admin-form-group">
        <label>{label}</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px', marginBottom: '12px' }}>
          {presetColors.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => onColorChange(colorKey, color)}
              style={{
                width: '45px',
                height: '45px',
                backgroundColor: color,
                border: currentColor === color ? '3px solid #000' : '2px solid #999',
                borderRadius: '4px',
                cursor: 'pointer',
                padding: '0'
              }}
              title={color}
            >
              {currentColor === color ? '✓' : ''}
            </button>
          ))}
        </div>

        <div>
          <div style={{ display: 'flex', gap: '15px', marginBottom: '12px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                {t.colorPickerHue}: {hsl.h}°
              </label>
              <input
                type="range"
                min={hueMin}
                max={hueMax}
                value={hsl.h <= hueMax && hsl.h >= hueMin ? hsl.h : hueMin}
                onChange={(e) => {
                  const newHsl = { h: parseInt(e.target.value), s: hsl.s, l: hsl.l };
                  onColorChange(colorKey, hslToHex(newHsl.h, newHsl.s, newHsl.l));
                }}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
            <div style={{ width: '60px', height: '50px', backgroundColor: currentColor, border: '2px solid #ddd', borderRadius: '4px' }}></div>
          </div>
          
          <div style={{ display: 'flex', gap: '15px', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                {t.colorPickerSaturation}: {hsl.s}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={hsl.s}
                onChange={(e) => {
                  const newHsl = { h: hsl.h, s: parseInt(e.target.value), l: hsl.l };
                  onColorChange(colorKey, hslToHex(newHsl.h, newHsl.s, newHsl.l));
                }}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                {t.colorPickerLightness}: {hsl.l}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={hsl.l}
                onChange={(e) => {
                  const newHsl = { h: hsl.h, s: hsl.s, l: parseInt(e.target.value) };
                  onColorChange(colorKey, hslToHex(newHsl.h, newHsl.s, newHsl.l));
                }}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onResetColor(colorKey, defaultColor)}
          className="admin-secondary-button"
          style={{ marginTop: '8px' }}
        >
          {t.resetToDefaultButton}
        </button>
        <small>{helpText}</small>
      </div>
    );
  };

  return (
    <div className={`admin-tab-content ${true ? 'active' : ''}`}>
      <div className="admin-section">
        <h2>{t.colorsSectionTitle}</h2>
        
        <div className="admin-current-config">
          <h3>{t.currentConfigTitle}</h3>
          <div className="config-grid">
            <div className="config-item">
              <span className="config-label">{t.bookingButtonColorLabel}</span>
              <span className="config-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  display: 'inline-block', 
                  width: '20px', 
                  height: '20px', 
                  backgroundColor: currentBookingButtonColor,
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}></span>
                {currentBookingButtonColor}
              </span>
            </div>
            <div className="config-item">
              <span className="config-label">{t.statusAvailableColorLabel}</span>
              <span className="config-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  display: 'inline-block', 
                  width: '20px', 
                  height: '20px', 
                  backgroundColor: currentStatusAvailableColor,
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}></span>
                {currentStatusAvailableColor}
              </span>
            </div>
            <div className="config-item">
              <span className="config-label">{t.statusBusyColorLabel}</span>
              <span className="config-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  display: 'inline-block', 
                  width: '20px', 
                  height: '20px', 
                  backgroundColor: currentStatusBusyColor,
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}></span>
                {currentStatusBusyColor}
              </span>
            </div>
            <div className="config-item">
              <span className="config-label">{t.statusUpcomingColorLabel}</span>
              <span className="config-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  display: 'inline-block', 
                  width: '20px', 
                  height: '20px', 
                  backgroundColor: currentStatusUpcomingColor,
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}></span>
                {currentStatusUpcomingColor}
              </span>
            </div>
            <div className="config-item">
              <span className="config-label">{t.statusNotFoundColorLabel}</span>
              <span className="config-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  display: 'inline-block', 
                  width: '20px', 
                  height: '20px', 
                  backgroundColor: currentStatusNotFoundColor,
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}></span>
                {currentStatusNotFoundColor}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit}>
          <div className="admin-form-group">
            <label>{t.bookingButtonColorLabel}</label>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: '10px', marginTop: '8px' }}>
              <input
                type="color"
                value={bookingButtonColor}
                onChange={(e) => onColorChange('bookingButtonColor', e.target.value)}
                style={{ width: '60px', height: '40px', cursor: 'pointer', border: '2px solid #ddd', borderRadius: '4px', flexShrink: 0 }}
              />
              <input
                type="text"
                value={bookingButtonColor}
                onChange={(e) => onColorChange('bookingButtonColor', e.target.value)}
                placeholder="#334155"
                style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'monospace', fontSize: '14px' }}
              />
              <button
                type="button"
                onClick={() => onResetColor('bookingButtonColor', '#334155')}
                className="admin-secondary-button"
              >
                {t.resetToDefaultButton}
              </button>
            </div>
            <small>{t.bookingButtonColorHelp}</small>
          </div>

          {renderColorPicker(
            `${t.statusAvailableColorLabel} - ${t.colorPickerGreenVariations}`,
            'statusAvailableColor',
            statusAvailableColor,
            greenColors,
            80,
            150,
            '#22c55e',
            t.statusAvailableColorHelp
          )}

          {renderColorPicker(
            `${t.statusBusyColorLabel} - ${t.colorPickerRedVariations}`,
            'statusBusyColor',
            statusBusyColor,
            redColors,
            0,
            20,
            '#ef4444',
            t.statusBusyColorHelp
          )}

          {renderColorPicker(
            `${t.statusUpcomingColorLabel} - ${t.colorPickerYellowVariations}`,
            'statusUpcomingColor',
            statusUpcomingColor,
            yellowColors,
            20,
            60,
            '#f59e0b',
            t.statusUpcomingColorHelp
          )}

          {renderColorPicker(
            `${t.statusNotFoundColorLabel} - ${t.colorPickerGrayVariations}`,
            'statusNotFoundColor',
            statusNotFoundColor,
            grayColors,
            0,
            360,
            '#6b7280',
            t.statusNotFoundColorHelp
          )}

          <button 
            type="submit" 
            className="admin-submit-button"
            disabled={
              bookingButtonColor === currentBookingButtonColor &&
              statusAvailableColor === currentStatusAvailableColor &&
              statusBusyColor === currentStatusBusyColor &&
              statusUpcomingColor === currentStatusUpcomingColor &&
              statusNotFoundColor === currentStatusNotFoundColor
            }
          >
            {t.submitColorsButton}
          </button>
        </form>

        {colorMessage && (
          <div className={`admin-message admin-message-${colorMessageType}`}>
            {colorMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default ColorsTab;
