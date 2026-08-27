/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActivityDrawer } from '../../src/renderer/components/ActivityDrawer';

describe('ActivityDrawer', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = jest.fn();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <ActivityDrawer open={false} entries={[]} onClose={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows an empty state and Close', () => {
    const onClose = jest.fn();
    render(<ActivityDrawer open entries={[]} onClose={onClose} />);
    expect(screen.getByText(/Commands will appear/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('lists activity entries', () => {
    render(
      <ActivityDrawer
        open
        entries={[{ id: 1, direction: 'tx', text: 'ON //P/254/56/1', at: 1 }]}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('ON //P/254/56/1')).toBeInTheDocument();
  });
});
