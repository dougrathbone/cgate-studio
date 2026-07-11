/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModeToggle } from '../../src/renderer/components/ModeToggle';

describe('ModeToggle', () => {
  it('calls onChange with commission when Commission is clicked', () => {
    const onChange = jest.fn();
    render(<ModeToggle mode="operate" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Commission' }));
    expect(onChange).toHaveBeenCalledWith('commission');
  });

  it('marks the active mode as selected', () => {
    render(<ModeToggle mode="commission" onChange={jest.fn()} />);
    expect(screen.getByRole('tab', { name: 'Commission' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Operate' })).toHaveAttribute('aria-selected', 'false');
  });
});
