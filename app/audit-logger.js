const fs = require('fs');
const path = require('path');

const auditLogPath = path.join(__dirname, '../data/audit-log.jsonl');

function sanitize(value) {
	if (value === null || value === undefined) {
		return value;
	}

	if (Array.isArray(value)) {
		return value.map(sanitize);
	}

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

	return value;
}

function ensureAuditFile() {
	const dir = path.dirname(auditLogPath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
	if (!fs.existsSync(auditLogPath)) {
		fs.writeFileSync(auditLogPath, '');
	}
}

function appendAuditLog(event) {
	ensureAuditFile();
	const payload = {
		timestamp: new Date().toISOString(),
		...sanitize(event)
	};
	fs.appendFileSync(auditLogPath, `${JSON.stringify(payload)}\n`);
}

function getAuditLogs(limit = 200) {
	ensureAuditFile();
	const raw = fs.readFileSync(auditLogPath, 'utf8');
	const lines = raw
		.split('\n')
		.filter(Boolean)
		.slice(-Math.max(1, Math.min(limit, 1000)));

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
