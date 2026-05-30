/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SiteList } from '../../src/renderer/components/SiteList';
import type { Site } from '../../src/shared/types';

const sites: Site[] = [
  { id: 'a', name: 'Home', host: '10.0.0.1', commandPort: 20023, eventPort: 20025 },
  { id: 'b', name: 'Office', host: '10.0.0.2', commandPort: 20023, eventPort: 20025 },
];

describe('SiteList', () => {
  it('shows a placeholder when there are no sites', () => {
    render(<SiteList sites={[]} activeId={null} onConnect={jest.fn()} onRemove={jest.fn()} />);
    expect(screen.getByText(/No sites yet/)).toBeInTheDocument();
  });

  it('renders each site and fires connect / remove callbacks', () => {
    const onConnect = jest.fn();
    const onRemove = jest.fn();
    render(<SiteList sites={sites} activeId={null} onConnect={onConnect} onRemove={onRemove} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('10.0.0.2:20023/20025')).toBeInTheDocument();

    fireEvent.click(screen.getAllByText('Connect')[0]);
    expect(onConnect).toHaveBeenCalledWith(sites[0]);

    fireEvent.click(screen.getByLabelText('Delete Office'));
    expect(onRemove).toHaveBeenCalledWith('b');
  });

  it('labels the active site with Reconnect', () => {
    render(<SiteList sites={sites} activeId="a" onConnect={jest.fn()} onRemove={jest.fn()} />);
    expect(screen.getByText('Reconnect')).toBeInTheDocument();
    expect(screen.getByText('Connect')).toBeInTheDocument(); // the non-active one
  });
});
