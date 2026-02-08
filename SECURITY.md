# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Currently supported versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of MeetEasier seriously. If you believe you have found a security vulnerability, please report it to us as described below.

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to the project maintainers. You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

Please include the requested information listed below (as much as you can provide) to help us better understand the nature and scope of the possible issue:

* Type of issue (e.g. buffer overflow, SQL injection, cross-site scripting, etc.)
* Full paths of source file(s) related to the manifestation of the issue
* The location of the affected source code (tag/branch/commit or direct URL)
* Any special configuration required to reproduce the issue
* Step-by-step instructions to reproduce the issue
* Proof-of-concept or exploit code (if possible)
* Impact of the issue, including how an attacker might exploit the issue

This information will help us triage your report more quickly.

## Security Best Practices

When deploying MeetEasier, please follow these security best practices:

### Authentication & Authorization

1. **Protect Admin Endpoints**: Always set a strong `API_TOKEN` in your `.env` file
   ```bash
   # Generate a secure token (64+ characters recommended)
   openssl rand -hex 32
   ```

2. **Microsoft Graph API Permissions**: Use the principle of least privilege
   - Only grant necessary permissions (Calendars.Read, Calendars.ReadWrite, Place.Read.All, User.Read.All)
   - Use application permissions, not delegated permissions
   - Regularly review and rotate client secrets (recommended: every 90 days)

3. **Environment Variables**: Never commit `.env` files to version control
   - Use `.env.template` as a reference
   - Store secrets in secure secret management systems (AWS Secrets Manager, Azure Key Vault, etc.)
   - Use different tokens for different environments (dev, staging, production)

### Network Security

1. **HTTPS Only**: Always deploy behind HTTPS/TLS
   - Use a reverse proxy (nginx, Apache, Traefik)
   - Enforce HTTPS redirects
   - Use valid SSL/TLS certificates

2. **Firewall Rules**: Restrict access to the application
   - Limit access to internal networks if possible
   - Use IP whitelisting for admin endpoints
   - Consider VPN access for sensitive operations

### Docker Security

1. **Non-Root User**: The Docker image runs as non-root user (UID 1001)
2. **Minimal Base Image**: Uses Alpine Linux for reduced attack surface
3. **No npm in Production**: npm is removed after build to reduce CVEs
4. **Regular Updates**: Keep base images and dependencies updated

### Data Protection

1. **Sensitive Data**: 
   - WiFi passwords are stored in configuration files
   - Ensure proper file permissions on the server
   - Consider encrypting configuration files at rest

2. **Uploaded Files**:
   - Logo uploads are validated for file type and size
   - Files are stored in `/static/img/uploads/`
   - Ensure proper permissions and access controls

3. **Logging**:
   - Avoid logging sensitive information (passwords, tokens, secrets)
   - Regularly rotate and archive logs
   - Monitor logs for suspicious activity

### Dependency Management

1. **Regular Updates**: Keep dependencies up to date
   ```bash
   npm audit
   npm audit fix
   ```

2. **Vulnerability Scanning**: Use automated tools
   - GitHub Dependabot
   - Snyk
   - npm audit

3. **Lock Files**: Commit `npm-shrinkwrap.json` to ensure consistent builds

### Configuration Security

1. **Environment-Based Configuration**: Use environment variables for sensitive settings
2. **Configuration Locks**: When environment variables are set, admin panel sections are locked and hidden
3. **API Token Protection**: All admin endpoints require authentication via `API_TOKEN`
4. **Token Storage**: Store `API_TOKEN` securely, never in client-side code or logs

### Monitoring & Incident Response

1. **Health Checks**: Use the `/heartbeat` endpoint for monitoring
2. **Error Handling**: Application includes comprehensive error handling
3. **Real-Time Updates**: Socket.IO connections are monitored and managed
4. **Audit Logs**: Consider implementing audit logging for admin actions

## Known Security Considerations

1. **Room Booking**: 
   - Bookings are created in the room's calendar
   - No user authentication required for booking (by design)
   - Consider enabling/disabling via `ENABLE_BOOKING` environment variable

2. **WiFi Information**:
   - WiFi credentials are displayed publicly on room displays
   - Intended for guest network access only
   - Do not use for secure/internal networks

3. **Admin Panel**:
   - Protected by API token (`API_TOKEN`)
   - No user authentication system (single shared token)
   - Token is sent in Authorization header or X-API-Token header
   - Consider implementing proper user authentication for production
   - Restrict network access to admin panel via firewall rules

## Security Updates

Security updates will be released as patch versions (e.g., 0.6.1, 0.6.2) and announced in the release notes.

To stay informed about security updates:
- Watch this repository for releases
- Subscribe to release notifications
- Check the CHANGELOG regularly

## Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine the affected versions
2. Audit code to find any similar problems
3. Prepare fixes for all supported versions
4. Release new security fix versions as soon as possible

## Comments on this Policy

If you have suggestions on how this process could be improved, please submit a pull request or open an issue.
