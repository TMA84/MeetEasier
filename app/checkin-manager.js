const config = require('../config/config');

const checkedInAppointments = new Map();
const ENTRY_TTL_MS = 24 * 60 * 60 * 1000;

function normalizeText(value) {
	return String(value || '').trim().toLowerCase();
}

function buildKey(roomEmail, appointmentId) {
	return `${normalizeText(roomEmail)}::${String(appointmentId || '').trim()}`;
}

function isExternalOrganizer({ organizer, roomName, roomEmail }) {
	const organizerText = normalizeText(organizer);
	const roomNameText = normalizeText(roomName);
	const roomEmailText = normalizeText(roomEmail);
	const roomEmailLocalPart = roomEmailText.includes('@') ? roomEmailText.split('@')[0] : roomEmailText;

	if (!organizerText) {
		return false;
	}

	if (organizerText === roomNameText) {
		return false;
	}

	if (organizerText === roomEmailText) {
		return false;
	}

	if (roomEmailLocalPart && organizerText === roomEmailLocalPart) {
		return false;
	}

	return true;
}

function cleanupExpiredEntries(nowMs = Date.now()) {
	for (const [key, value] of checkedInAppointments.entries()) {
		if (!value || !value.timestamp || nowMs - value.timestamp > ENTRY_TTL_MS) {
			checkedInAppointments.delete(key);
		}
	}
}

function resolveCheckInSettings(checkInConfig) {
	const source = checkInConfig && typeof checkInConfig === 'object' ? checkInConfig : config.checkIn;

	return {
		enabled: source?.enabled !== false,
		requiredForExternalMeetings: source?.requiredForExternalMeetings !== false,
		earlyCheckInMinutes: Number.isFinite(source?.earlyCheckInMinutes) ? source.earlyCheckInMinutes : 5,
		windowMinutes: Number.isFinite(source?.windowMinutes) ? source.windowMinutes : 10,
		autoReleaseNoShow: source?.autoReleaseNoShow !== false
	};
}

function getCheckInStatus({ roomEmail, appointmentId, organizer, roomName, startTimestamp, checkInConfig }) {
	cleanupExpiredEntries();

	const settings = resolveCheckInSettings(checkInConfig);
	const enabled = !!settings.enabled;
	const requiresExternal = settings.requiredForExternalMeetings !== false;
	const earlyCheckInMinutes = settings.earlyCheckInMinutes;
	const windowMinutes = settings.windowMinutes;

	const startMs = Number(startTimestamp);
	const hasValidStart = Number.isFinite(startMs);
	const opensAtMs = hasValidStart ? startMs - earlyCheckInMinutes * 60 * 1000 : null;
	const deadlineMs = hasValidStart ? startMs + windowMinutes * 60 * 1000 : null;
	const nowMs = Date.now();
	const tooEarly = opensAtMs !== null ? nowMs < opensAtMs : false;
	const expired = deadlineMs !== null ? nowMs > deadlineMs : false;

	const externalMeeting = isExternalOrganizer({ organizer, roomName, roomEmail });
	const required = enabled && (!requiresExternal || externalMeeting);
	const key = buildKey(roomEmail, appointmentId);
	const checkedIn = required && checkedInAppointments.has(key);

	return {
		enabled,
		required,
		externalMeeting,
		checkedIn,
		earlyCheckInMinutes,
		windowMinutes,
		startTimestamp: hasValidStart ? startMs : null,
		opensAtTimestamp: opensAtMs,
		deadlineTimestamp: deadlineMs,
		tooEarly: required ? tooEarly : false,
		canCheckInNow: required ? !checkedIn && !expired && !tooEarly : false,
		expired: required ? expired : false
	};
}

function markCheckedIn({ roomEmail, appointmentId }) {
	cleanupExpiredEntries();
	const key = buildKey(roomEmail, appointmentId);
	checkedInAppointments.set(key, {
		timestamp: Date.now()
	});
}

function clearCheckedIn({ roomEmail, appointmentId }) {
	const key = buildKey(roomEmail, appointmentId);
	checkedInAppointments.delete(key);
}

module.exports = {
	isExternalOrganizer,
	resolveCheckInSettings,
	getCheckInStatus,
	markCheckedIn,
	clearCheckedIn,
	cleanupExpiredEntries
};
