import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FlightboardRow from './FlightboardRow';
import config from '../../config/flightboard.config.js';

describe('FlightboardRow Component', () => {
  const mockRoom = {
    Roomlist: 'Building 1',
    Name: 'Conference Room A',
    RoomAlias: 'conference-a',
    Email: 'conference-a@company.com',
    Appointments: [
      {
        Subject: 'Team Standup',
        Organizer: 'John Doe',
        Start: Date.now() + 3600000, // 1 hour from now
        End: Date.now() + 5400000, // 1.5 hours from now
        Private: false
      },
      {
        Subject: 'Project Review',
        Organizer: 'Jane Smith',
        Start: Date.now() + 10800000, // 3 hours from now
        End: Date.now() + 14400000, // 4 hours from now
        Private: false
      }
    ],
    Busy: false,
    ErrorMessage: null
  };

  describe('Rendering', () => {
    it('renders room name correctly', () => {
      render(<FlightboardRow room={mockRoom} filter="" />);
      expect(screen.getByText('Conference Room A')).toBeInTheDocument();
    });

    it('renders organizer name correctly', () => {
      render(<FlightboardRow room={mockRoom} filter="" />);
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    });

    it('renders with correct roomlist class', () => {
      const { container } = render(<FlightboardRow room={mockRoom} filter="" />);
      expect(container.querySelector('.roomlist-building-1')).toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('displays available status when room is not busy', () => {
      render(<FlightboardRow room={mockRoom} filter="" />);
      expect(screen.getByText(config.board.statusAvailable)).toBeInTheDocument();
    });

    it('displays busy status when room is busy', () => {
      const busyRoom = { ...mockRoom, Busy: true };
      render(<FlightboardRow room={busyRoom} filter="" />);
      expect(screen.getByText(config.board.statusBusy)).toBeInTheDocument();
    });

    it('displays error status when error message exists', () => {
      const errorRoom = { ...mockRoom, ErrorMessage: 'Connection error' };
      render(<FlightboardRow room={errorRoom} filter="" />);
      expect(screen.getByText(config.board.statusError)).toBeInTheDocument();
    });

    it('applies correct CSS class when room is available', () => {
      const { container } = render(<FlightboardRow room={mockRoom} filter="" />);
      expect(container.querySelector('.meeting-open')).toBeInTheDocument();
    });

    it('applies correct CSS class when room is busy', () => {
      const busyRoom = { ...mockRoom, Busy: true };
      const { container } = render(<FlightboardRow room={busyRoom} filter="" />);
      expect(container.querySelector('.meeting-busy')).toBeInTheDocument();
      expect(container.querySelector('.meeting-room-busy')).toBeInTheDocument();
    });

    it('applies correct CSS class when error exists', () => {
      const errorRoom = { ...mockRoom, ErrorMessage: 'Error' };
      const { container } = render(<FlightboardRow room={errorRoom} filter="" />);
      expect(container.querySelector('.meeting-error')).toBeInTheDocument();
      expect(container.querySelector('.meeting-room-error')).toBeInTheDocument();
    });
  });

  describe('Appointments Display', () => {
    it('displays current appointment organizer', () => {
      render(<FlightboardRow room={mockRoom} filter="" />);
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    });

    it('does not display appointment info when no appointments', () => {
      const noAppointmentsRoom = { ...mockRoom, Appointments: [] };
      render(<FlightboardRow room={noAppointmentsRoom} filter="" />);
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    it('displays next meeting when room is busy', () => {
      const busyRoom = { ...mockRoom, Busy: true };
      render(<FlightboardRow room={busyRoom} filter="" />);
      expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
    });

    it('does not display next meeting when room is not busy', () => {
      render(<FlightboardRow room={mockRoom} filter="" />);
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });

    it('does not display next meeting when only one appointment', () => {
      const singleAppointmentRoom = {
        ...mockRoom,
        Busy: true,
        Appointments: [mockRoom.Appointments[0]]
      };
      render(<FlightboardRow room={singleAppointmentRoom} filter="" />);
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('is visible when filter matches roomlist', () => {
      const { container } = render(<FlightboardRow room={mockRoom} filter="roomlist-building-1" />);
      const row = container.querySelector('.meeting-room__row');
      expect(row).toHaveStyle({ display: 'block' });
    });

    it('is visible when filter is "all"', () => {
      const { container } = render(<FlightboardRow room={mockRoom} filter="roomlist-all" />);
      const row = container.querySelector('.meeting-room__row');
      expect(row).toHaveStyle({ display: 'block' });
    });

    it('is visible when filter is empty', () => {
      const { container } = render(<FlightboardRow room={mockRoom} filter="" />);
      const row = container.querySelector('.meeting-room__row');
      expect(row).toHaveStyle({ display: 'block' });
    });

    it('is hidden when filter does not match roomlist', () => {
      const { container } = render(<FlightboardRow room={mockRoom} filter="roomlist-building-2" />);
      const row = container.querySelector('.meeting-room__row');
      expect(row).toHaveStyle({ display: 'none' });
    });
  });

  describe('Seating Capacity', () => {
    it('displays seat capacity when configured', () => {
      // Note: This depends on seats.capacity configuration
      const { container } = render(<FlightboardRow room={mockRoom} filter="" />);
      const seatsElement = container.querySelector('.seats-capacity');
      expect(seatsElement).toBeInTheDocument();
    });
  });

  describe('PropTypes', () => {
    it('renders with minimal required props', () => {
      const minimalRoom = {
        Name: 'Test Room',
        RoomAlias: 'test',
        Roomlist: 'Test',
        Busy: false,
        Appointments: []
      };
      expect(() => render(<FlightboardRow room={minimalRoom} />)).not.toThrow();
    });
  });
});
