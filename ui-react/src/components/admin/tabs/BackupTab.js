/**
 * @file BackupTab.js
 * @description Admin panel tab for exporting and importing configuration backups. Displays a JSON text area for the backup payload and provides export/import actions.
 */
import React from 'react';

const BackupTab = ({
  // Data
  isActive,
  backupPayloadText,
  backupMessage,
  backupMessageType,
  
  // Translations
  t,
  
  // Handlers
  onPayloadChange,
  onExport,
  onImport
}) => {
  return (
    <div className={`admin-tab-content ${isActive ? 'active' : ''}`}>
    <div className="admin-card" id="ops-backup">
      <div className="admin-form-group">
        <label htmlFor="backupPayloadText">{t.backupPayloadLabel}</label>
        <textarea
          id="backupPayloadText"
          value={backupPayloadText}
          onChange={(e) => onPayloadChange(e.target.value)}
          rows={12}
          className="admin-textarea"
        />
      </div>

      <div className="backup-actions">
        <button type="button" className="admin-secondary-button" onClick={onExport}>
          {t.backupExportButton}
        </button>
        <button type="button" className="admin-secondary-button" onClick={onImport}>
          {t.backupImportButton}
        </button>
      </div>

      {backupMessage && (
        <div className={`admin-message admin-message-${backupMessageType}`}>
          {backupMessage}
        </div>
      )}
    </div>
    </div>
  );
};

export default BackupTab;
