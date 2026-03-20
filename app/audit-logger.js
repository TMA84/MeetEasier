/**
 * @file Audit Logger – Logging of security-relevant events.
 *
 * Writes audit entries as JSONL (one JSON line per event) to the
 * file `data/audit-log.jsonl`. Sensitive fields (passwords, tokens, secrets)
 * are automatically redacted before writing.
 *
 * @module audit-logger
 */

const fs = require('fs');
const path = require('path');

/** @constant {string} auditLogPath – Absolute path to the audit log file */
const auditLogPath = path.join(__dirname, '../data/audit-log.jsonl');

/**
 * Recursively sanitizes a value and redacts sensitive keys.
 *
 * Keys containing "password", "token", or "secret" (case-insensitive)
 * are replaced with `[REDACTED]`. Arrays and nested objects are
 * traversed recursively.
 *
 * @param {*} value – The value to sanitize (any type).
 * @returns {*} The sanitized value with redacted sensitive fields.
 */
function sanitize(value) {
	// Return null/undefined unchanged
	if (value === null || value === undefined) {
		return value;
	}

	// Recursively sanitize array elements
	if (Array.isArray(value)) {
		return value.map(sanitize);
	}

	// Objects: check keys for sensitive terms
	if (typeof value === 'object') {
		const result = {};
		for (const [key, nestedValue] of Object.entries(value)) {
			const normalizedKey = key.toLowerCase();
			if (normalizedKey.includes('password') || normalizedKey.includes('token') || normalizedKey.includes('secret')) {
				result[key] = '[REDACTED]';
			} else {
				result[key] = sanitize(nestedValue);
			}
		}
		return result;
	}

	// Return primitive values unchanged
	return value;
}

/**
 * Ensures that the audit log file and its directory exist.
 *
 * Creates the `data/` directory recursively if missing, and creates
 * an empty file if one does not yet exist.
 */
function ensureAuditFile() {
	const dir = path.dirname(auditLogPath);
	// Create directory if it does not exist
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
	// Create empty file if it does not exist
	if (!fs.existsSync(auditLogPath)) {
		fs.writeFileSync(auditLogPath, '');
	}
}

/**
 * Appends an audit event to the log file.
 *
 * The event is given an ISO-8601 timestamp and sanitized via
 * {@link sanitize} (sensitive fields redacted) before writing.
 *
 * @param {Object} event – The event object to log.
 */
function appendAuditLog(event) {
	ensureAuditFile();
	// Add timestamp and redact sensitive data
	const payload = {
		timestamp: new Date().toISOString(),
		...sanitize(event)
	};
	// Append as a single JSON line to the file
	fs.appendFileSync(auditLogPath, `${JSON.stringify(payload)}\n`);
}

/**
 * Reads the most recent audit log entries and returns them as an array.
 *
 * Entries are returned in reverse chronological order (newest first).
 * The limit is clamped to the range 1–1000.
 *
 * @param {number} [limit=200] – Maximum number of entries to return.
 * @returns {Object[]} Array of parsed audit entries (newest first).
 */
function getAuditLogs(limit = 200) {
	ensureAuditFile();
	const raw = fs.readFileSync(auditLogPath, 'utf8');

	// Split lines, remove empty ones, and limit to the last `limit` entries
	const lines = raw
		.split('\n')
		.filter(Boolean)
		.slice(-Math.max(1, Math.min(limit, 1000)));

	// Parse each line as JSON; malformed lines are skipped
	return lines
		.map(line => {
			try {
				return JSON.parse(line);
			} catch (error) {
				return null;
			}
		})
		.filter(Boolean)
		.reverse();
}

module.exports = {
	auditLogPath,
	appendAuditLog,
	getAuditLogs,
	sanitize
};
