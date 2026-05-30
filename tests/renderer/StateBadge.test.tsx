/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { StateBadge } from '../../src/renderer/components/StateBadge';

describe('StateBadge', () => {
  it('renders a dash when there is no state', () => {
    render(<StateBadge />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders ON with a rounded percentage', () => {
    render(<StateBadge state={{ address: '254/56/4', level: 128, on: true }} />);
    expect(screen.getByText('ON 50%')).toBeInTheDocument();
  });

  it('renders OFF when the group is off', () => {
    render(<StateBadge state={{ address: '254/56/4', level: 0, on: false }} />);
    expect(screen.getByText('OFF')).toBeInTheDocument();
  });
});
