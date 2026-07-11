/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CloseButton } from '../../src/renderer/components/CloseButton';

describe('CloseButton', () => {
  it('renders an accessible close control with an SVG icon', () => {
    const onClick = jest.fn();
    const { container } = render(<CloseButton onClick={onClick} />);
    const btn = screen.getByLabelText('Close');
    expect(btn).toHaveClass('closeBtn');
    expect(container.querySelector('svg')).toBeTruthy();
    expect(btn.textContent).not.toMatch(/×|x/i);
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalled();
  });
});
