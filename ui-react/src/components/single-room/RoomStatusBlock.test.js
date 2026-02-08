import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import RoomStatusBlock from './RoomStatusBlock';

// Mock timeFormat utility
jest.mock('../../utils/timeFormat.js', () => ({
  formatTimeRange: (start, end) => {
    return `${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}`;
  }
}));

describe('RoomStatusBlock Component', () => {
  const mockConfig = {
    statusBusy: 'Busy',
    statusAvailable: 'Available',
    currentMeeting: 'Current Meeting',
    upcomingTitle: 'Next Meeting',
    privateMeeting: 'Private'
  };

  const mockDetails = {
    appointmentExists: true,
    timesPresent: true,
    upcomingAppointments: true,
    nextUp: 'Next Up: ',
    upcomingTitle: 'Next Meeting: '
  };

  const mockRoom = {
    Name: 'Conference Room A',
    Busy: false,
    Appointments: [
      {
        Subject: 'Team Standup',
        Organizer: 'John Doe',
        Start: Date.now() + 3600000,
        End: Date.now() + 5400000,
        Private: false
      },
      {
        Subject: 'Project Review',
        Organizer: 'Jane Smith',
        Start: Date.now() + 7200000,
        End: Date.now() + 10800000,
        Private: false
      }
    ]
  };

  const mockSidebarConfig = {
    showMeetingTitles: false
  };

  describe('Rendering', () => {
    it('renders room name', () => {
      render(
        <RoomStatusBlock 
          room={mockRoom} 
          details={mockDetails} 
          config={mockConfig}
          sidebarConfig={mockSidebarConfig}
        />
      );
      expect(screen.getByText('Conference Room A')).toBeInTheDocument();
    });

    it('renders room status', () => {
      render(
        <RoomStatusBlock 
          room={mockRoom} 
          details={mockDetails} 
          config={mockConfig}
          sidebarConfig={mockSidebarConfig}
        />
      );
      expect(screen.getByText('Available')).toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('shows available status for free room', () => {
      const { container } = render(
        <RoomStatusBlock 
          room={mockRoom} 
          details={mockDetails} 
          config={mockConfig}
          sidebarConfig={mockSidebarConfig}
        />
      );
      expect(container.querySelector('.modern-room-status--available')).toBeInTheDocument();
    });

    it('shows busy status for occupied room', () => {
      const busyRoom = { ...mockRoom, Busy: true };
      const { container } = render(
        <RoomStatusBlock 
          room={busyRoom} 
          details={mockDetails} 
          config={mockConfig}
          sidebarConfig={mockSidebarConfig}
        />
      );
      expect(container.querySelector('.modern-room-status--busy')).toBeInTheDocument();
      expect(screen.getByText('Busy')).toBeInTheDocument();
    });

    it('shows upcoming status when meeting starts soon', () => {
      const upcomingRoom = {
        ...mockRoom,
        Busy: false,
        Appointments: [
          {
            Subject: 'Upcoming Meeting',
            Organizer: 'Alice',
            Start: Date.now() + 600000, // 10 minutes from now
            End: Date.now() + 2400000,
            Private: false
          }
        ]
      };
      const { container } = render(
        <RoomStatusBlock 
          room={upcomingRoom} 
          details={mockDetails} 
          config={mockConfig}
          sidebarConfig={mockSidebarConfig}
        />
      );
      expect(container.querySelector('.modern-room-status--upcoming')).toBeInTheDocument();
    });
  });

  describe('Meeting Information', () => {
    it('displays meeting organizer', () => {
      render(
        <RoomStatusBlock 
          room={mockRoom} 
          details={mockDetails} 
          config={mockConfig}
          sidebarConfig={mockSidebarConfig}
        />
      );
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('displays meeting time', () => {
      render(
        <RoomStatusBlock 
          room={mockRoom} 
          details={mockDetails} 
          config={mockConfig}
          sidebarConfig={mockSidebarConfig}
        />
      );
      expect(screen.getByText(/-/)).toBeInTheDocument(); // Time range contains dash
    });

    it('displays meeting subject when showMeetingTitles is true', () => {
      const configWithTitles = { ...mockSidebarConfig, showMeetingTitles: true };
      render(
        <RoomStatusBlock 
          room={mockRoom} 
          details={mockDetails} 
          config={mockConfig}
          sidebarConfig={configWithTitles}
        />
      );
      expect(screen.getByText('Team Standup')).toBeInTheDocument();
    });

    it('hides meeting subject when showMeetingTitles is false', () => {
      render(
        <RoomStatusBlock 
          room={mockRoom} 
          details={mockDetails} 
          config={mockConfig}
          sidebarConfig={mockSidebarConfig}
        />
      );
      expect(screen.queryByText('Team Standup')).not.toBeInTheDocument();
    });

    it('displays "Private" for private meetings', () => {
      const privateRoom = {
        ...mockRoom,
        Appointments: [
          {
            Subject: 'Secret Meeting',
            Organizer: 'John Doe',
            Start: Date.now() + 3600000,
            End: Date.now() + 5400000,
            Private: true
          }
        ]
      };
      const configWithTitles = { ...mockSidebarConfig, showMeetingTitles: true };
      render(
        <RoomStatusBlock 
          room={privateRoom} 
          details={mockDetails} 
          config={mockConfig}
          sidebarConfig={configWithTitles}
        />
      );
      expect(screen.getByText('Private')).toBeInTheDocument();
      expect(screen.queryByText('Secret Meeting')).not.toBeInTheDocument();
    });
  });

  describe('Next Meeting Display', () => {
    it('displays next meeting when room is busy', () => {
      const busyRoom = { ...mockRoom, Busy: true };
      render(
        <RoomStatusBlock 
          room={busyRoom} 
          details={mockDetails} 
          config={mockConfig}
          sidebarConfig={mockSidebarConfig}
        />
      );
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('does not display next meeting when room is available', () => {
      render(
        <RoomStatusBlock 
          room={mockRoom} 
          details={mockDetails} 
          config={mockConfig}
          sidebarConfig={mockSidebarConfig}
        />
      );
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });

    it('does not display next meeting when only one appointment', () => {
      const singleAppointmentRoom = {
        ...mockRoom,
        Busy: true,
        Appointments: [mockRoom.Appointments[0]]
      };
      render(
        <RoomStatusBlock 
          room={singleAppointmentRoom} 
          details={mockDetails} 
          config={mockConfig}
          sidebarConfig={mockSidebarConfig}
        />
      );
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  describe('No Appointments', () => {
    it('handles room with no appointments', () => {
      const noAppointmentsRoom = {
        ...mockRoom,
        Appointments: []
      };
      const noAppointmentsDetails = {
        ...mockDetails,
        appointmentExists: false
      };
      render(
        <RoomStatusBlock 
          room={noAppointmentsRoom} 
          details={noAppointmentsDetails} 
          config={mockConfig}
          sidebarConfig={mockSidebarConfig}
        />
      );
      expect(screen.getByText('Conference Room A')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });
});
