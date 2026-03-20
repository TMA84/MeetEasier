/**
 * @file OAuthTab.js
 * @description Admin panel tab for configuring OAuth / Microsoft Graph credentials
 *              (client ID, tenant, client secret / certificate) and Graph runtime
 *              settings such as webhook configuration, fetch timeout, and retry parameters.
 */
import React from 'react';

const OAuthTab = ({
  oauthLocked, systemLocked, t,
  currentOauthClientId, currentOauthAuthority, currentOauthHasClientSecret,
  oauthLastUpdated, oauthClientId, oauthAuthority, oauthClientSecret,
  oauthMessage, oauthMessageType,
  currentSystemGraphWebhookEnabled, currentSystemGraphWebhookClientState,
  currentSystemGraphWebhookAllowedIps, currentSystemGraphFetchTimeoutMs,
  currentSystemGraphFetchRetryAttempts, currentSystemGraphFetchRetryBaseMs,
  systemLastUpdated, systemGraphWebhookEnabled, systemGraphWebhookClientState,
  systemGraphWebhookAllowedIps, systemGraphFetchTimeoutMs,
  systemGraphFetchRetryAttempts, systemGraphFetchRetryBaseMs,
  graphRuntimeMessage, graphRuntimeMessageType, booleanLabel,
  onOAuthChange, onOAuthSubmit, onGraphRuntimeChange, onGraphRuntimeSubmit,
  certificateInfo, certificateLoading, certificateMessage, certificateMessageType,
  onGenerateCertificate, onDownloadCertificate, onDeleteCertificate
}) => {
  const authMethod = certificateInfo ? 'certificate' : 'secret';
  return (
    <div className="admin-card" id="ops-oauth">
      {!oauthLocked && (
        <>
          <h3>{t.oauthSectionTitle || 'OAuth Configuration'}</h3>
          <div className="admin-current-config">
            <h3>{t.currentConfigTitle}</h3>
            <div className="config-grid">
              <div className="config-item">
                <span className="config-label">{t.oauthClientIdLabel || 'Client ID'}</span>
                <span className="config-value">{currentOauthClientId || '-'}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{t.oauthTenantIdLabel || 'Tenant ID'}</span>
                <span className="config-value">{currentOauthAuthority || '-'}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{t.oauthAuthMethodLabel || 'Auth Method'}</span>
                <span className="config-value">{authMethod === 'certificate' ? (t.oauthAuthMethodCertificate || 'Certificate') : (t.oauthAuthMethodSecret || 'Client Secret')}</span>
              </div>
              {authMethod === 'secret' && (
                <div className="config-item">
                  <span className="config-label">{t.oauthClientSecretLabel || 'Client Secret'}</span>
                  <span className="config-value">{currentOauthHasClientSecret ? (t.oauthClientSecretConfigured || 'Configured') : (t.oauthClientSecretNotConfigured || 'Not configured')}</span>
                </div>
              )}
              <div className="config-item">
                <span className="config-label">{t.lastUpdatedLabel}</span>
                <span className="config-value">{oauthLastUpdated || '-'}</span>
              </div>
            </div>
          </div>
          <form onSubmit={onOAuthSubmit}>
            <div className="admin-form-group">
              <label htmlFor="oauthClientId">{t.oauthClientIdInputLabel || 'OAuth Client ID'}</label>
              <input type="text" id="oauthClientId" value={oauthClientId} onChange={(e) => onOAuthChange('oauthClientId', e.target.value)} placeholder={t.oauthClientIdPlaceholder || 'Application (client) ID'} />
            </div>
            <div className="admin-form-group">
              <label htmlFor="oauthAuthority">{t.oauthTenantIdInputLabel || 'OAuth Tenant ID'}</label>
              <input type="text" id="oauthAuthority" value={oauthAuthority} onChange={(e) => onOAuthChange('oauthAuthority', e.target.value)} placeholder={t.oauthTenantIdPlaceholder || 'Directory (tenant) ID'} />
            </div>
            <div className="admin-form-group">
              <label htmlFor="oauthClientSecret">{t.oauthClientSecretInputLabel || 'OAuth Client Secret'}</label>
              <input type="password" id="oauthClientSecret" value={oauthClientSecret} onChange={(e) => onOAuthChange('oauthClientSecret', e.target.value)} placeholder={t.oauthClientSecretPlaceholder || 'Leave empty to keep existing secret'} autoComplete="new-password" />
              <small>{t.oauthClientSecretHelp || 'Secret is encrypted before it is written to disk.'}</small>
            </div>
            <button type="submit" className="admin-submit-button" disabled={oauthClientId === currentOauthClientId && oauthAuthority === currentOauthAuthority && oauthClientSecret === ''}>
              {t.oauthSaveButton || 'Save OAuth Configuration'}
            </button>
          </form>
          {oauthMessage && (<div className={`admin-message admin-message-${oauthMessageType}`}>{oauthMessage}</div>)}
          <div className="admin-form-divider"></div>

          <h3>{t.certSectionTitle || 'Certificate Authentication'}</h3>
          <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '1em' }}>{t.certSectionHelp || 'Use a self-signed X.509 certificate instead of a Client Secret. Certificates do not expire yearly like secrets. Generate a certificate here, download the .pem file, and upload it to your Azure AD App Registration under "Certificates & secrets".'}</p>
          {certificateInfo ? (
            <div className="admin-current-config">
              <h3>{t.certActiveTitle || 'Active Certificate'}</h3>
              <div className="config-grid">
                <div className="config-item"><span className="config-label">{t.certThumbprintLabel || 'Thumbprint (SHA-256)'}</span><span className="config-value" style={{ fontFamily: 'monospace', fontSize: '0.85em', wordBreak: 'break-all' }}>{certificateInfo.thumbprintSHA256}</span></div>
                <div className="config-item"><span className="config-label">{t.certCommonNameLabel || 'Common Name'}</span><span className="config-value">{certificateInfo.commonName}</span></div>
                <div className="config-item"><span className="config-label">{t.certValidFromLabel || 'Valid From'}</span><span className="config-value">{certificateInfo.notBefore ? new Date(certificateInfo.notBefore).toLocaleDateString(navigator.language || 'de-DE') : '-'}</span></div>
                <div className="config-item"><span className="config-label">{t.certValidUntilLabel || 'Valid Until'}</span><span className="config-value">{certificateInfo.notAfter ? new Date(certificateInfo.notAfter).toLocaleDateString(navigator.language || 'de-DE') : '-'}</span></div>
                <div className="config-item"><span className="config-label">{t.certCreatedAtLabel || 'Created'}</span><span className="config-value">{certificateInfo.createdAt ? new Date(certificateInfo.createdAt).toLocaleString(navigator.language || 'de-DE') : '-'}</span></div>
              </div>
              <div style={{ marginTop: '1em', display: 'flex', gap: '0.5em', flexWrap: 'wrap' }}>
                <button type="button" className="admin-submit-button" onClick={onDownloadCertificate}>{t.certDownloadButton || 'Download Certificate (.pem)'}</button>
                <button type="button" className="admin-submit-button" onClick={onDeleteCertificate} style={{ backgroundColor: '#dc3545' }}>{t.certDeleteButton || 'Delete Certificate'}</button>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '0.9em', color: '#888', marginBottom: '0.5em' }}>{t.certNoCertificate || 'No certificate configured. Authentication uses Client Secret.'}</p>
              <button type="button" className="admin-submit-button" onClick={onGenerateCertificate} disabled={certificateLoading}>{certificateLoading ? (t.certGenerating || 'Generating...') : (t.certGenerateButton || 'Generate Certificate')}</button>
            </div>
          )}
          {certificateMessage && (<div className={`admin-message admin-message-${certificateMessageType}`}>{certificateMessage}</div>)}
          <div className="admin-form-divider"></div>
          {!systemLocked && (
            <>
              <h3>{t.graphRuntimeSectionTitle || 'Graph Runtime Configuration'}</h3>
              <div className="admin-current-config">
                <h3>{t.currentConfigTitle}</h3>
                <div className="config-grid">
                  <div className="config-item"><span className="config-label">{t.graphWebhookEnabledLabel || 'Graph Webhook Enabled'}</span><span className="config-value">{booleanLabel(currentSystemGraphWebhookEnabled)}</span></div>
                  <div className="config-item"><span className="config-label">{t.graphWebhookClientStateLabel || 'Graph Webhook Client State'}</span><span className="config-value">{currentSystemGraphWebhookClientState || '-'}</span></div>
                  <div className="config-item"><span className="config-label">{t.graphWebhookAllowedIpsLabel || 'Graph Webhook Allowed IPs'}</span><span className="config-value">{currentSystemGraphWebhookAllowedIps || '-'}</span></div>
                  <div className="config-item"><span className="config-label">{t.graphFetchTimeoutLabel || 'Graph Fetch Timeout (ms)'}</span><span className="config-value">{currentSystemGraphFetchTimeoutMs}</span></div>
                  <div className="config-item"><span className="config-label">{t.graphFetchRetryAttemptsLabel || 'Graph Fetch Retry Attempts'}</span><span className="config-value">{currentSystemGraphFetchRetryAttempts}</span></div>
                  <div className="config-item"><span className="config-label">{t.graphFetchRetryBaseLabel || 'Graph Fetch Retry Base (ms)'}</span><span className="config-value">{currentSystemGraphFetchRetryBaseMs}</span></div>
                  <div className="config-item"><span className="config-label">{t.lastUpdatedLabel}</span><span className="config-value">{systemLastUpdated || '-'}</span></div>
                </div>
              </div>
              <form onSubmit={onGraphRuntimeSubmit}>
                <div className="admin-form-group">
                  <label className="inline-label"><span className="label-text">{t.graphWebhookEnabledLabel || 'Graph Webhook Enabled'}</span><input type="checkbox" checked={systemGraphWebhookEnabled} onChange={(e) => onGraphRuntimeChange('systemGraphWebhookEnabled', e.target.checked)} /></label>
                  <small>{t.graphWebhookEnabledHelp || 'Enable Microsoft Graph webhook endpoint handling.'}</small>
                </div>
                <div className="admin-form-group"><label htmlFor="systemGraphWebhookClientState">{t.graphWebhookClientStateLabel || 'Graph Webhook Client State'}</label><input type="text" id="systemGraphWebhookClientState" value={systemGraphWebhookClientState} onChange={(e) => onGraphRuntimeChange('systemGraphWebhookClientState', e.target.value)} placeholder={t.graphWebhookClientStatePlaceholder || 'Shared secret value for webhook notifications'} /></div>
                <div className="admin-form-group"><label htmlFor="systemGraphWebhookAllowedIps">{t.graphWebhookAllowedIpsLabel || 'Graph Webhook Allowed IPs'}</label><input type="text" id="systemGraphWebhookAllowedIps" value={systemGraphWebhookAllowedIps} onChange={(e) => onGraphRuntimeChange('systemGraphWebhookAllowedIps', e.target.value)} placeholder={t.graphWebhookAllowedIpsPlaceholder || 'Comma-separated IP addresses'} /></div>
                <div className="admin-form-group"><label htmlFor="systemGraphFetchTimeoutMs">{t.graphFetchTimeoutLabel || 'Graph Fetch Timeout (ms)'}</label><input type="number" id="systemGraphFetchTimeoutMs" value={systemGraphFetchTimeoutMs} onChange={(e) => onGraphRuntimeChange('systemGraphFetchTimeoutMs', e.target.value)} min="1000" step="100" /></div>
                <div className="admin-form-group"><label htmlFor="systemGraphFetchRetryAttempts">{t.graphFetchRetryAttemptsLabel || 'Graph Fetch Retry Attempts'}</label><input type="number" id="systemGraphFetchRetryAttempts" value={systemGraphFetchRetryAttempts} onChange={(e) => onGraphRuntimeChange('systemGraphFetchRetryAttempts', e.target.value)} min="0" step="1" /></div>
                <div className="admin-form-group"><label htmlFor="systemGraphFetchRetryBaseMs">{t.graphFetchRetryBaseLabel || 'Graph Fetch Retry Base (ms)'}</label><input type="number" id="systemGraphFetchRetryBaseMs" value={systemGraphFetchRetryBaseMs} onChange={(e) => onGraphRuntimeChange('systemGraphFetchRetryBaseMs', e.target.value)} min="50" step="50" /></div>
                <button type="submit" className="admin-submit-button" disabled={systemGraphWebhookEnabled === currentSystemGraphWebhookEnabled && systemGraphWebhookClientState === currentSystemGraphWebhookClientState && systemGraphWebhookAllowedIps === currentSystemGraphWebhookAllowedIps && parseInt(systemGraphFetchTimeoutMs, 10) === currentSystemGraphFetchTimeoutMs && parseInt(systemGraphFetchRetryAttempts, 10) === currentSystemGraphFetchRetryAttempts && parseInt(systemGraphFetchRetryBaseMs, 10) === currentSystemGraphFetchRetryBaseMs}>{t.graphRuntimeSaveButton || 'Save Graph Runtime Configuration'}</button>
              </form>
              {graphRuntimeMessage && (<div className={`admin-message admin-message-${graphRuntimeMessageType}`}>{graphRuntimeMessage}</div>)}
            </>
          )}
          {systemLocked && (<><h3>{t.graphRuntimeSectionTitle || 'Graph Runtime Configuration'}</h3><div className="admin-locked-message"><p>{t.configuredViaEnv}</p></div></>)}
          <div className="admin-form-divider"></div>
        </>
      )}
      {oauthLocked && (<><h3>{t.oauthSectionTitle || 'OAuth Configuration'}</h3><div className="admin-locked-message"><p>{t.configuredViaEnv}</p></div><div className="admin-form-divider"></div></>)}
    </div>
  );
};

export default OAuthTab;
