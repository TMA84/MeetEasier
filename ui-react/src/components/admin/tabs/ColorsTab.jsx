/**
* @file ColorsTab.js
* @description Admin panel tab for customizing the color theme, including the booking button color and room status colors (available, busy, upcoming, not found) with native color picker and dynamic lightness palette.
*/
import React from 'react';

const ColorsTab = ({
  isActive,
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
  /**
  * Generates 9 lightness variations of the current color (light to dark).
  * Keeps hue and saturation fixed, varies lightness from 90% down to 15%.
  */
  const generatePalette = (hexColor) => {
    const hsl = hexToHSL(hexColor);
    const steps = [90, 80, 68, 56, 45, 38, 30, 22, 15];
    return steps.map(l => hslToHex(hsl.h, hsl.s, l));
  };

  const renderColorPicker = (label, colorKey, currentColor, defaultColor, helpText) => {
    const palette = generatePalette(currentColor);

    return (
      <div className="admin-form-group">
        <label>{label}</label>
        <div className="color-input-row">
          <input
            type="color"
            value={currentColor}
            onChange={(e) => onColorChange(colorKey, e.target.value)}
            className="color-input-picker"
          />
          <input
            type="text"
            value={currentColor}
            onChange={(e) => onColorChange(colorKey, e.target.value)}
            placeholder={defaultColor}
            className="color-input-text"
          />
          <button type="button" onClick={() => onResetColor(colorKey, defaultColor)} className="admin-secondary-button">
            {t.resetToDefaultButton}
          </button>
        </div>
        <div className="color-preset-grid" style={{ marginTop: '0.5rem' }}>
          {palette.map((color, i) => (
            <button
              key={`${colorKey}-${i}`}
              type="button"
              onClick={() => onColorChange(colorKey, color)}
              className={`color-preset-button ${currentColor.toLowerCase() === color.toLowerCase() ? 'color-preset-button--selected' : 'color-preset-button--unselected'}`}
              style={{ backgroundColor: color }}
              title={color}
            >
              {currentColor.toLowerCase() === color.toLowerCase() ? '✓' : ''}
            </button>
          ))}
        </div>
        <small>{helpText}</small>
      </div>
    );
  };

  return (
    <div className={`admin-tab-content ${isActive ? 'active' : ''}`}>
      <div className="admin-section">
        <h2>{t.colorsSectionTitle}</h2>
        
        <div className="admin-current-config">
          <h3>{t.currentConfigTitle}</h3>
          <div className="config-grid">
            {[
              { label: t.bookingButtonColorLabel, color: currentBookingButtonColor },
              { label: t.statusAvailableColorLabel, color: currentStatusAvailableColor },
              { label: t.statusBusyColorLabel, color: currentStatusBusyColor },
              { label: t.statusUpcomingColorLabel, color: currentStatusUpcomingColor },
              { label: t.statusNotFoundColorLabel, color: currentStatusNotFoundColor }
            ].map(({ label, color }) => (
              <div className="config-item" key={label}>
                <span className="config-label">{label}</span>
                <span className="config-value color-value-display">
                  <span className="color-swatch-inline" style={{ backgroundColor: color }}></span>
                  {color}
                </span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={onSubmit}>
          <div className="admin-form-group">
            <label>{t.bookingButtonColorLabel}</label>
            <div className="color-input-row">
              <input
                type="color"
                value={bookingButtonColor}
                onChange={(e) => onColorChange('bookingButtonColor', e.target.value)}
                className="color-input-picker"
              />
              <input
                type="text"
                value={bookingButtonColor}
                onChange={(e) => onColorChange('bookingButtonColor', e.target.value)}
                placeholder="#334155"
                className="color-input-text"
              />
              <button type="button" onClick={() => onResetColor('bookingButtonColor', '#334155')} className="admin-secondary-button">
                {t.resetToDefaultButton}
              </button>
            </div>
            <small>{t.bookingButtonColorHelp}</small>
          </div>

          {renderColorPicker(t.statusAvailableColorLabel, 'statusAvailableColor', statusAvailableColor, '#22c55e', t.statusAvailableColorHelp)}
          {renderColorPicker(t.statusBusyColorLabel, 'statusBusyColor', statusBusyColor, '#ef4444', t.statusBusyColorHelp)}
          {renderColorPicker(t.statusUpcomingColorLabel, 'statusUpcomingColor', statusUpcomingColor, '#f59e0b', t.statusUpcomingColorHelp)}
          {renderColorPicker(t.statusNotFoundColorLabel, 'statusNotFoundColor', statusNotFoundColor, '#6b7280', t.statusNotFoundColorHelp)}

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
          <div className={`admin-message admin-message-${colorMessageType}`}>{colorMessage}</div>
        )}
      </div>
    </div>
  );
};

export default ColorsTab;
