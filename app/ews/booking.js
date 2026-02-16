module.exports = function(roomEmail, bookingDetails, callback) {
	const ews = require('ews-javascript-api');
	const config = require('../../config/config');

	const { subject, startTime, endTime, description } = bookingDetails;

	// Validate required fields
	if (!subject || !startTime || !endTime) {
		return callback(new Error('Subject, start time, and end time are required'), null);
	}

	// Security: Prevent adding attendees or resources to room bookings
	const disallowedFields = ['attendees', 'requiredAttendees', 'optionalAttendees', 'resources', 'locations'];
	for (const field of disallowedFields) {
		if (bookingDetails[field] !== undefined) {
			return callback(new Error('Cannot add attendees or additional resources to room bookings'), null);
		}
	}

	// Validate time range
	const start = new Date(startTime);
	const end = new Date(endTime);
	
	if (start >= end) {
		return callback(new Error('End time must be after start time'), null);
	}

	// Allow bookings that start within the last 2 minutes (to account for network latency and processing time)
	const twoMinutesAgo = new Date(Date.now() - 2 * 60000);
	if (start < twoMinutesAgo) {
		return callback(new Error('Cannot book in the past'), null);
	}

	// Initialize EWS with impersonation to act as the room
	const exch = new ews.ExchangeService(ews.ExchangeVersion.Exchange2016);
	exch.Credentials = new ews.ExchangeCredentials(config.exchange.username, config.exchange.password);
	exch.Url = new ews.Uri(config.exchange.uri);
	
	// Use impersonation to create the event in the room's calendar
	// This requires the service account to have ApplicationImpersonation role
	exch.ImpersonatedUserId = new ews.ImpersonatedUserId(
		ews.ConnectingIdType.SmtpAddress,
		roomEmail
	);

	// First, check for conflicts by getting the room's calendar
	const calendarFolder = new ews.FolderId(ews.WellKnownFolderName.Calendar);
	const calendarView = new ews.CalendarView(
		ews.DateTime.Parse(start.toISOString()),
		ews.DateTime.Parse(end.toISOString())
	);

	// Find appointments in the requested time range
	exch.FindAppointments(calendarFolder, calendarView)
		.then((appointments) => {
			// Check if there are any existing appointments (conflicts)
			if (appointments && appointments.Items && appointments.Items.length > 0) {
				return callback(new Error('The room is already booked during the requested time'), null);
			}

			// No conflicts, proceed with booking
			const appointment = new ews.Appointment(exch);
			appointment.Subject = subject;
			appointment.Body = new ews.MessageBody(description || '');
			appointment.Start = ews.DateTime.Parse(start.toISOString());
			appointment.End = ews.DateTime.Parse(end.toISOString());
			appointment.Location = roomEmail;

			// Save the appointment (no need to send invitations since it's in the room's own calendar)
			return appointment.Save(ews.SendInvitationsMode.SendToNone);
		})
		.then(() => {
			callback(null, {
				success: true,
				message: 'Room booked successfully'
			});
		})
		.catch((error) => {
			console.error('EWS booking error:', error);
			
			// Provide helpful error message if permission issue
			if (error.message && error.message.includes('ImpersonateUser')) {
				return callback(new Error('Insufficient permissions. The service account needs ApplicationImpersonation role in Exchange.'), null);
			}
			
			callback(error, null);
		});
};
