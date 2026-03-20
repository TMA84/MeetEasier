/**
 * @file Check-In Management for Room Bookings.
 *
 * Manages the check-in status of appointments. Supports configurable
 * time windows (earliest check-in, deadline), distinguishes between internal
 * and external organizers, and automatically cleans up expired entries.
 *
 * Check-in entries are stored in an in-memory map and have
 * a maximum lifetime of 24 hours (ENTRY_TTL_MS).
 *
 * @module checkin-manager
 */

const config = require('../config/config');

/** @type {Map<string, {timestamp: number}>} In-memory store for checked-in appointments */
const checkedInAppointments = new Map();

/** @constant {number} ENTRY_TTL_MS – Maximum lifetime of a check-in entry (24 hours) */
const ENTRY_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Normalizes a text value for comparisons.
 *
 * Removes leading/trailing whitespace and converts to lowercase.
 *
 * @param {*} value – The value to normalize.
 * @returns {string} Normalized text in lowercase.
 */
function normalizeText(value) {
	return String(value || '').trim().toLowerCase();
}

/**
 * Creates a unique key for a check-in entry.
 *
 * Combines the normalized room email with the appointment ID.
 *
 * @param {string} roomEmail – Email address of the room.
 * @param {string} appointmentId – Unique ID of the appointment.
 * @returns {string} Composite key in the format "email::id".
 */
function buildKey(roomEmail, appointmentId) {
	return `${normalizeText(roomEmail)}::${String(appointmentId || '').trim()}`;
}

/**
 * Checks whether the organizer of an appointment is external (not the room itself).
 *
 * An organizer is considered "not external" if their name matches the room name,
 * the room email, or the local part of the room email.
 *
 * @param {Object} params – Parameter object.
 * @param {string} params.organizer – Name of the organizer.
 * @param {string} params.roomName – Display name of the room.
 * @param {string} params.roomEmail – Email address of the room.
 * @returns {boolean} `true` if the organizer is external.
 */
function isExternalOrganizer({ organizer, roomName, roomEmail }) {
	const organizerText = normalizeText(organizer);
	const roomNameText = normalizeText(roomName);
	const roomEmailText = normalizeText(roomEmail);
	// Extract the local part of the email (before the @ sign)
	const roomEmailLocalPart = roomEmailText.includes('@') ? roomEmailText.split('@')[0] : roomEmailText;

	// No organizer specified → do not consider as external
	if (!organizerText) {
		return false;
	}

	// Organizer matches the room name → internal appointment
	if (organizerText === roomNameText) {
		return false;
	}

	// Organizer matches the room email → internal appointment
	if (organizerText === roomEmailText) {
		return false;
	}

	// Organizer matches the local part of the room email → internal appointment
	if (roomEmailLocalPart && organizerText === roomEmailLocalPart) {
		return false;
	}

	return true;
}

/**
 * Removes expired check-in entries from the in-memory store.
 *
 * Entries without a valid timestamp or those older than
 * {@link ENTRY_TTL_MS} are deleted.
 *
 * @param {number} [nowMs=Date.now()] – Current timestamp in milliseconds.
 */
function cleanupExpiredEntries(nowMs = Date.now()) {
	for (const [key, value] of checkedInAppointments.entries()) {
		// Remove invalid or expired entries
		if (!value || !value.timestamp || nowMs - value.timestamp > ENTRY_TTL_MS) {
			checkedInAppointments.delete(key);
		}
	}
}

/**
 * Resolves the effective check-in settings.
 *
 * Uses the provided configuration or falls back to the global
 * configuration from `config.checkIn`. Missing values are filled
 * with sensible defaults.
 *
 * @param {Object} [checkInConfig] – Optional check-in configuration.
 * @returns {Object} Resolved settings with the following fields:
 * @returns {boolean} returns.enabled – Whether check-in is enabled.
 * @returns {boolean} returns.requiredForExternalMeetings – Whether check-in is only required for external meetings.
 * @returns {number} returns.earlyCheckInMinutes – Minutes before appointment start when check-in becomes available.
 * @returns {number} returns.windowMinutes – Minutes after appointment start until check-in expires.
 * @returns {boolean} returns.autoReleaseNoShow – Whether no-shows are automatically released.
 */
function resolveCheckInSettings(checkInConfig) {
	// Use provided configuration or fall back to global configuration
	const source = checkInConfig && typeof checkInConfig === 'object' ? checkInConfig : config.checkIn;

	return {
		enabled: source?.enabled !== false,
		requiredForExternalMeetings: source?.requiredForExternalMeetings !== false,
		earlyCheckInMinutes: Number.isFinite(source?.earlyCheckInMinutes) ? source.earlyCheckInMinutes : 5,
		windowMinutes: Number.isFinite(source?.windowMinutes) ? source.windowMinutes : 10,
		autoReleaseNoShow: source?.autoReleaseNoShow !== false
	};
}

/**
 * Determines the full check-in status for an appointment.
 *
 * Takes into account the check-in configuration, whether the organizer is external,
 * whether the check-in window is open, and whether check-in has already occurred.
 *
 * @param {Object} params – Parameter object.
 * @param {string} params.roomEmail – Email address of the room.
 * @param {string} params.appointmentId – Unique ID of the appointment.
 * @param {string} params.organizer – Name of the organizer.
 * @param {string} params.roomName – Display name of the room.
 * @param {number} params.startTimestamp – Start time of the appointment (Unix milliseconds).
 * @param {Object} [params.checkInConfig] – Optional check-in configuration.
 * @returns {Object} Detailed check-in status with all relevant time windows and flags.
 */
function getCheckInStatus({ roomEmail, appointmentId, organizer, roomName, startTimestamp, checkInConfig }) {
	// Clean up expired entries before determining status
	cleanupExpiredEntries();

	const settings = resolveCheckInSettings(checkInConfig);
	const enabled = !!settings.enabled;
	const requiresExternal = settings.requiredForExternalMeetings !== false;
	const earlyCheckInMinutes = settings.earlyCheckInMinutes;
	const windowMinutes = settings.windowMinutes;

	// Calculate time window: opening (before appointment start) and deadline (after appointment start)
	const startMs = Number(startTimestamp);
	const hasValidStart = Number.isFinite(startMs);
	const opensAtMs = hasValidStart ? startMs - earlyCheckInMinutes * 60 * 1000 : null;
	const deadlineMs = hasValidStart ? startMs + windowMinutes * 60 * 1000 : null;
	const nowMs = Date.now();
	const tooEarly = opensAtMs !== null ? nowMs < opensAtMs : false;
	const expired = deadlineMs !== null ? nowMs > deadlineMs : false;

	// Check whether check-in is required for this appointment
	const externalMeeting = isExternalOrganizer({ organizer, roomName, roomEmail });
	const required = enabled && (!requiresExternal || externalMeeting);

	// Retrieve current check-in status from the store
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

/**
 * Marks an appointment as checked in.
 *
 * Stores the current timestamp in the in-memory store.
 * Expired entries are cleaned up beforehand.
 *
 * @param {Object} params – Parameter object.
 * @param {string} params.roomEmail – Email address of the room.
 * @param {string} params.appointmentId – Unique ID of the appointment.
 */
function markCheckedIn({ roomEmail, appointmentId }) {
	cleanupExpiredEntries();
	const key = buildKey(roomEmail, appointmentId);
	checkedInAppointments.set(key, {
		timestamp: Date.now()
	});
}

/**
 * Removes the check-in status of an appointment.
 *
 * Used, for example, when an appointment is cancelled or a room
 * is automatically released (no-show).
 *
 * @param {Object} params – Parameter object.
 * @param {string} params.roomEmail – Email address of the room.
 * @param {string} params.appointmentId – Unique ID of the appointment.
 */
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
