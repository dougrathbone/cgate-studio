/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SiteForm } from '../../src/renderer/components/SiteForm';
import type { Site } from '../../src/shared/types';

describe('SiteForm', () => {
  it('adds a site with the entered name, host and ports', () => {
    const onAdd = jest.fn();
    render(<SiteForm mode="add" onAdd={onAdd} />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Office' } });
    fireEvent.change(screen.getByLabelText('Host'), { target: { value: '10.0.0.9' } });
    fireEvent.change(screen.getByLabelText('Cmd'), { target: { value: '20023' } });
    fireEvent.change(screen.getByLabelText('Event'), { target: { value: '20025' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add site' }));
    expect(onAdd).toHaveBeenCalledWith({
      name: 'Office',
      host: '10.0.0.9',
      commandPort: 20023,
      eventPort: 20025,
      username: undefined,
      password: undefined,
      defaultProject: undefined,
      defaultNetwork: undefined,
    });
  });

  it('does not submit when the name is blank', () => {
    const onAdd = jest.fn();
    render(<SiteForm mode="add" onAdd={onAdd} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add site' }));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('edits an existing site including optional login fields', () => {
    const onSave = jest.fn();
    const onCancel = jest.fn();
    const initial: Site = {
      id: 'a',
      name: 'Home',
      host: '10.0.0.1',
      commandPort: 20023,
      eventPort: 20025,
    };
    render(<SiteForm mode="edit" initial={initial} onSave={onSave} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('C-Gate login…'));
    fireEvent.change(screen.getByLabelText('User'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    fireEvent.change(screen.getByLabelText('Default project'), { target: { value: 'MYPROJ' } });
    fireEvent.change(screen.getByLabelText('Default network'), { target: { value: '254' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save site' }));
    expect(onSave).toHaveBeenCalledWith({
      ...initial,
      username: 'admin',
      password: 'secret',
      defaultProject: 'MYPROJ',
      defaultNetwork: '254',
    });
  });
});
