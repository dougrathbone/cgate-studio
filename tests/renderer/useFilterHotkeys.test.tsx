/**
 * @jest-environment jsdom
 */
import React, { useState } from 'react';
import { render, fireEvent } from '@testing-library/react';
import { useFilterHotkeys, useFilterRef } from '../../src/renderer/hooks/useFilterHotkeys';

function Probe() {
  const ref = useFilterRef();
  const [filter, setFilter] = useState('kitchen');
  useFilterHotkeys(ref, setFilter);
  return (
    <div>
      <input aria-label="filter" ref={ref} value={filter} onChange={(e) => setFilter(e.target.value)} />
      <button type="button">outside</button>
      <span data-testid="value">{filter}</span>
    </div>
  );
}

describe('useFilterHotkeys', () => {
  it('focuses the filter on / from a non-input and ignores / while typing', () => {
    const { getByLabelText, getByRole } = render(<Probe />);
    const filter = getByLabelText('filter') as HTMLInputElement;
    getByRole('button').focus();
    fireEvent.keyDown(getByRole('button'), { key: '/' });
    expect(document.activeElement).toBe(filter);

    const other = document.createElement('input');
    document.body.appendChild(other);
    other.focus();
    fireEvent.keyDown(other, { key: '/' });
    expect(document.activeElement).toBe(other);
    other.remove();
  });

  it('clears and blurs the filter on Escape when it is focused', () => {
    const { getByLabelText, getByTestId } = render(<Probe />);
    const filter = getByLabelText('filter') as HTMLInputElement;
    filter.focus();
    fireEvent.keyDown(filter, { key: 'Escape' });
    expect(getByTestId('value').textContent).toBe('');
  });
});
