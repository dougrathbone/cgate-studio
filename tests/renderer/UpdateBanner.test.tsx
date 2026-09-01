/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UpdateBanner } from '../../src/renderer/components/UpdateBanner';

describe('UpdateBanner', () => {
  it('hides idle, checking, dev, and not-available states', () => {
    const { rerender } = render(
      <UpdateBanner status={{ state: 'idle' }} onRestart={jest.fn()} onDismiss={jest.fn()} />,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    rerender(<UpdateBanner status={{ state: 'checking' }} onRestart={jest.fn()} onDismiss={jest.fn()} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    rerender(<UpdateBanner status={{ state: 'dev' }} onRestart={jest.fn()} onDismiss={jest.fn()} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    rerender(<UpdateBanner status={null} onRestart={jest.fn()} onDismiss={jest.fn()} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows download progress and a restart action when ready', () => {
    const onRestart = jest.fn();
    const onDismiss = jest.fn();
    const { rerender } = render(
      <UpdateBanner status={{ state: 'available', version: '1.4.0' }} onRestart={onRestart} onDismiss={onDismiss} />,
    );
    expect(screen.getByText(/1\.4\.0/)).toBeInTheDocument();
    rerender(
      <UpdateBanner status={{ state: 'downloading', version: '1.4.0', percent: 50 }} onRestart={onRestart} onDismiss={onDismiss} />,
    );
    expect(screen.getByText(/50%/)).toBeInTheDocument();
    rerender(
      <UpdateBanner status={{ state: 'ready', version: '1.4.0' }} onRestart={onRestart} onDismiss={onDismiss} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Restart to update/i }));
    expect(onRestart).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Later/i }));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('shows update errors', () => {
    const onDismiss = jest.fn();
    render(
      <UpdateBanner status={{ state: 'error', message: 'timeout' }} onRestart={jest.fn()} onDismiss={onDismiss} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('timeout');
    fireEvent.click(screen.getByRole('button', { name: /Dismiss/i }));
    expect(onDismiss).toHaveBeenCalled();
  });
});
