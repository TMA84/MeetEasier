/**
 * @file cert-generator.js
 * @description Self-signed X.509 certificate generator for OAuth certificate-based
 *              authentication with Microsoft Entra ID (Azure AD). Generates RSA 2048-bit
 *              key pairs and self-signed certificates using node-forge. Certificates are
 *              stored encrypted on disk and used by MSAL for client credential flows.
 */

const forge = require('node-forge');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CERT_CONFIG_PATH = path.join(__dirname, '../data/oauth-certificate.json');

/**
 * Generates a self-signed X.509 certificate for Azure AD app authentication.
 *
 * @param {Object} options - Certificate options
 * @param {string} [options.commonName='MeetEasier OAuth'] - Certificate CN
 * @param {number} [options.validityYears=3] - Certificate validity in years (1-10)
 * @returns {Object} Generated certificate data with privateKeyPem, publicCertPem, thumbprintSHA256, notBefore, notAfter
 */
function generateCertificate(options = {}) {
  const commonName = options.commonName || 'MeetEasier OAuth';
  const validityYears = Math.max(1, Math.min(options.validityYears || 3, 10));

  // Generate RSA 2048-bit key pair
  const keys = forge.pki.rsa.generateKeyPair(2048);

  // Create self-signed certificate
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = crypto.randomBytes(16).toString('hex');

  // Set validity period
  const notBefore = new Date();
  const notAfter = new Date();
  notAfter.setFullYear(notAfter.getFullYear() + validityYears);
  cert.validity.notBefore = notBefore;
  cert.validity.notAfter = notAfter;

  // Set subject and issuer (self-signed → same)
  const attrs = [
    { name: 'commonName', value: commonName },
    { name: 'organizationName', value: 'MeetEasier' }
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  // Add extensions
  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
    { name: 'extKeyUsage', clientAuth: true }
  ]);

  // Sign with SHA-256
  cert.sign(keys.privateKey, forge.md.sha256.create());

  // Export PEM strings
  const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
  const publicCertPem = forge.pki.certificateToPem(cert);

  // Calculate SHA-256 thumbprint (DER-encoded certificate → SHA-256 → hex)
  const derBytes = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
  const thumbprintSHA256 = crypto.createHash('sha256')
    .update(Buffer.from(derBytes, 'binary'))
    .digest('hex')
    .toUpperCase();

  // Calculate SHA-1 thumbprint (used by Azure AD for certificate matching)
  const thumbprintSHA1 = crypto.createHash('sha1')
    .update(Buffer.from(derBytes, 'binary'))
    .digest('hex')
    .toUpperCase();

  return {
    privateKeyPem,
    publicCertPem,
    thumbprintSHA256,
    thumbprintSHA1,
    notBefore: notBefore.toISOString(),
    notAfter: notAfter.toISOString(),
    commonName
  };
}

/**
 * Encrypts the private key before storing it on disk.
 * Uses AES-256-GCM with a key derived from the API token.
 *
 * @param {string} privateKeyPem - PEM-encoded private key
 * @param {string} encryptionKey - Encryption key (API token hash)
 * @returns {Object} Encrypted payload with iv, tag, and ciphertext (all hex)
 */
function encryptPrivateKey(privateKeyPem, encryptionKey) {
  const keyHash = crypto.createHash('sha256').update(encryptionKey).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyHash, iv);
  let encrypted = cipher.update(privateKeyPem, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return { iv: iv.toString('hex'), tag, ciphertext: encrypted };
}

/**
 * Decrypts the private key from the stored encrypted payload.
 *
 * @param {Object} payload - Encrypted payload with iv, tag, ciphertext
 * @param {string} encryptionKey - Encryption key (API token hash)
 * @returns {string} Decrypted PEM-encoded private key
 */
function decryptPrivateKey(payload, encryptionKey) {
  const keyHash = crypto.createHash('sha256').update(encryptionKey).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyHash, Buffer.from(payload.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(payload.tag, 'hex'));
  let decrypted = decipher.update(payload.ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Saves the certificate data to disk. Private key is encrypted.
 *
 * @param {Object} certData - Certificate data from generateCertificate()
 * @param {string} encryptionKey - Key for encrypting the private key
 */
function saveCertificate(certData, encryptionKey) {
  const dir = path.dirname(CERT_CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const stored = {
    publicCertPem: certData.publicCertPem,
    encryptedPrivateKey: encryptPrivateKey(certData.privateKeyPem, encryptionKey),
    thumbprintSHA256: certData.thumbprintSHA256,
    thumbprintSHA1: certData.thumbprintSHA1,
    notBefore: certData.notBefore,
    notAfter: certData.notAfter,
    commonName: certData.commonName,
    createdAt: new Date().toISOString()
  };

  fs.writeFileSync(CERT_CONFIG_PATH, JSON.stringify(stored, null, 2));
  return stored;
}

/**
 * Loads the stored certificate data from disk.
 *
 * @returns {Object|null} Stored certificate data or null if not found
 */
function loadCertificate() {
  if (!fs.existsSync(CERT_CONFIG_PATH)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(CERT_CONFIG_PATH, 'utf8'));
  } catch (err) {
    console.error('[CertGenerator] Failed to load certificate:', err.message);
    return null;
  }
}

/**
 * Gets the MSAL clientCertificate config object if a certificate is stored.
 * Returns null if no certificate is available or decryption fails.
 *
 * @param {string} encryptionKey - Key for decrypting the private key
 * @returns {Object|null} MSAL-compatible clientCertificate object or null
 */
function getMsalCertificateConfig(encryptionKey) {
  const stored = loadCertificate();
  if (!stored || !stored.encryptedPrivateKey || !stored.thumbprintSHA256) {
    return null;
  }

  try {
    const privateKeyPem = decryptPrivateKey(stored.encryptedPrivateKey, encryptionKey);

    // Convert PKCS#1 (RSA PRIVATE KEY) to PKCS#8 (PRIVATE KEY) if needed — MSAL expects PKCS#8
    let pkcs8Key = privateKeyPem;
    if (privateKeyPem.includes('BEGIN RSA PRIVATE KEY')) {
      const privateKeyObj = crypto.createPrivateKey({ key: privateKeyPem, format: 'pem' });
      pkcs8Key = privateKeyObj.export({ format: 'pem', type: 'pkcs8' });
    }

    return {
      thumbprintSha256: stored.thumbprintSHA256.toLowerCase(),
      privateKey: pkcs8Key
    };
  } catch (err) {
    console.error('[CertGenerator] Failed to decrypt private key:', err.message);
    return null;
  }
}

/**
 * Deletes the stored certificate from disk.
 *
 * @returns {boolean} true if deleted, false if not found
 */
function deleteCertificate() {
  if (fs.existsSync(CERT_CONFIG_PATH)) {
    fs.unlinkSync(CERT_CONFIG_PATH);
    return true;
  }
  return false;
}

/**
 * Checks if a certificate is stored and returns its metadata (without private key).
 *
 * @returns {Object|null} Certificate metadata or null
 */
function getCertificateInfo() {
  const stored = loadCertificate();
  if (!stored) return null;

  // Calculate SHA-1 on the fly for certificates stored before this field was added
  let thumbprintSHA1 = stored.thumbprintSHA1 || null;
  if (!thumbprintSHA1 && stored.publicCertPem) {
    try {
      const cert = forge.pki.certificateFromPem(stored.publicCertPem);
      const derBytes = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
      thumbprintSHA1 = crypto.createHash('sha1')
        .update(Buffer.from(derBytes, 'binary'))
        .digest('hex')
        .toUpperCase();
    } catch (_) { /* ignore */ }
  }

  return {
    thumbprintSHA256: stored.thumbprintSHA256,
    thumbprintSHA1,
    notBefore: stored.notBefore,
    notAfter: stored.notAfter,
    commonName: stored.commonName,
    createdAt: stored.createdAt,
    hasPrivateKey: !!(stored.encryptedPrivateKey && stored.encryptedPrivateKey.ciphertext)
  };
}

module.exports = {
  generateCertificate,
  saveCertificate,
  loadCertificate,
  getMsalCertificateConfig,
  deleteCertificate,
  getCertificateInfo,
  CERT_CONFIG_PATH
};
