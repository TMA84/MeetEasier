import React from 'react';

const AuditTab = ({
  // Data
  auditLogs,
  auditMessage,
  auditMessageType,
  
  // Translations
  t,
  
  // Handlers
  onLoadLogs
}) => {
  return (
    <div className="admin-card" id="ops-audit">
      <div className="admin-form-divider"></div>

      <h3>{t.auditSectionTitle}</h3>
      <div style={{ marginBottom: '1rem' }}>
        <button type="button" className="admin-secondary-button" onClick={onLoadLogs}>
          {t.auditLoadButton}
        </button>
      </div>

      {auditMessage && (
        <div className={`admin-message admin-message-${auditMessageType}`}>
          {auditMessage}
        </div>
      )}

      {auditLogs.length === 0 ? (
        <div className="admin-locked-message">
          <p>{t.auditEmpty}</p>
        </div>
      ) : (
        <div className="admin-current-config">
          <pre className="admin-json-pre">{JSON.stringify(auditLogs, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default AuditTab;
