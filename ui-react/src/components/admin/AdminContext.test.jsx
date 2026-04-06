import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { AdminProvider, useAdmin } from './AdminContext';

// Test component that uses the context
const TestConsumer = () => {
  const { state, updateState, setMessage } = useAdmin();
  return (
    <div>
      <span data-testid="activeTab">{state.activeTab}</span>
      <span data-testid="apiToken">{state.apiToken}</span>
      <span data-testid="message">{state.connectedDisplaysMessage || 'none'}</span>
      <span data-testid="messageType">{state.connectedDisplaysMessageType || 'none'}</span>
      <button onClick={() => updateState({ activeTab: 'system' })}>changeTab</button>
      <button onClick={() => setMessage('Success!', 'success')}>setMsg</button>
    </div>
  );
};

describe('AdminContext', () => {
  describe('AdminProvider', () => {
    it('provides default state', () => {
      render(
        <AdminProvider>
          <TestConsumer />
        </AdminProvider>
      );
      expect(screen.getByTestId('activeTab')).toHaveTextContent('display');
      expect(screen.getByTestId('apiToken')).toHaveTextContent('');
    });

    it('accepts initialState overrides', () => {
      render(
        <AdminProvider initialState={{ activeTab: 'wifi', apiToken: 'test-token' }}>
          <TestConsumer />
        </AdminProvider>
      );
      expect(screen.getByTestId('activeTab')).toHaveTextContent('wifi');
      expect(screen.getByTestId('apiToken')).toHaveTextContent('test-token');
    });

    it('updateState merges partial updates', async () => {
      render(
        <AdminProvider>
          <TestConsumer />
        </AdminProvider>
      );
      await act(async () => {
        screen.getByText('changeTab').click();
      });
      expect(screen.getByTestId('activeTab')).toHaveTextContent('system');
      // apiToken should remain default
      expect(screen.getByTestId('apiToken')).toHaveTextContent('');
    });

    it('setMessage sets message and type', async () => {
      vi.useFakeTimers();
      render(
        <AdminProvider>
          <TestConsumer />
        </AdminProvider>
      );
      await act(async () => {
        screen.getByText('setMsg').click();
      });
      expect(screen.getByTestId('message')).toHaveTextContent('Success!');
      expect(screen.getByTestId('messageType')).toHaveTextContent('success');
      vi.useRealTimers();
    });

    it('setMessage auto-clears after 3 seconds', async () => {
      vi.useFakeTimers();
      render(
        <AdminProvider>
          <TestConsumer />
        </AdminProvider>
      );
      await act(async () => {
        screen.getByText('setMsg').click();
      });
      expect(screen.getByTestId('message')).toHaveTextContent('Success!');

      await act(async () => {
        vi.advanceTimersByTime(3100);
      });
      expect(screen.getByTestId('message')).toHaveTextContent('none');
      expect(screen.getByTestId('messageType')).toHaveTextContent('none');
      vi.useRealTimers();
    });
  });

  describe('useAdmin', () => {
    it('throws when used outside AdminProvider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => render(<TestConsumer />)).toThrow('useAdmin must be used within AdminProvider');
      consoleError.mockRestore();
    });
  });
});
