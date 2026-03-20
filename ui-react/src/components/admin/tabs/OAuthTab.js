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
  return null;
};

export default OAuthTab;
