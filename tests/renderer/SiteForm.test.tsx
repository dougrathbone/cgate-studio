/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SiteForm } from '../../src/renderer/components/SiteForm';

describe('SiteForm', () => {
  it('adds a site with the entered name, host and ports', () => {
    const onAdd = jest.fn();
    render(<SiteForm onAdd={onAdd} />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Office' } });
    fireEvent.change(screen.getByLabelText('Host'), { target: { value: '10.0.0.9' } });
    fireEvent.change(screen.getByLabelText('Cmd'), { target: { value: '20023' } });
    fireEvent.change(screen.getByLabelText('Event'), { target: { value: '20025' } });
    fireEvent.click(screen.getByText('Add site'));
    expect(onAdd).toHaveBeenCalledWith({
      name: 'Office',
      host: '10.0.0.9',
      commandPort: 20023,
      eventPort: 20025,
    });
  });

  it('does not submit when the name is blank', () => {
    const onAdd = jest.fn();
    render(<SiteForm onAdd={onAdd} />);
    fireEvent.click(screen.getByText('Add site'));
    expect(onAdd).not.toHaveBeenCalled();
  });
});
