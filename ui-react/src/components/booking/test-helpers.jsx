/**
 * @file Test helpers for BookingModal component tests.
 * Extracts common mock data and render setup to reduce duplication.
 */
import React from 'react';
import { render } from '@testing-library/react';
import BookingModal from './BookingModal';

/** @type {{ Name: string, Email: string }} */
export const mockRoom = {
  Name: 'Conference Room A',
  Email: 'conference-a@example.com'
};

/**
 * Renders BookingModal with default props.
 * @param {Object} [propOverrides] - Optional prop overrides
 * @returns {import('@testing-library/react').RenderResult & { onClose: Function, onSuccess: Function }}
 */
export function renderBookingModal(propOverrides = {}) {
  const onClose = propOverrides.onClose || vi.fn();
  const onSuccess = propOverrides.onSuccess || vi.fn();

  const result = render(
    <BookingModal
      room={propOverrides.room || mockRoom}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );

  return { ...result, onClose, onSuccess };
}
