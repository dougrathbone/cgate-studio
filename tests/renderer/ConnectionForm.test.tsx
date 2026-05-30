/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConnectionForm } from '../../src/renderer/components/ConnectionForm';

describe('ConnectionForm', () => {
  it('submits the default connection options', () => {
    const onConnect = jest.fn();
    render(<ConnectionForm onConnect={onConnect} />);
    fireEvent.click(screen.getByText('Connect'));
    expect(onConnect).toHaveBeenCalledWith({
      host: '127.0.0.1',
      commandPort: 20023,
      eventPort: 20025,
    });
  });

  it('submits edited host and ports (coercing ports to numbers)', () => {
    const onConnect = jest.fn();
    render(<ConnectionForm onConnect={onConnect} />);
    fireEvent.change(screen.getByLabelText('Host'), { target: { value: '10.0.0.5' } });
    fireEvent.change(screen.getByLabelText('Cmd'), { target: { value: '30000' } });
    fireEvent.change(screen.getByLabelText('Event'), { target: { value: '30001' } });
    fireEvent.click(screen.getByText('Connect'));
    expect(onConnect).toHaveBeenCalledWith({
      host: '10.0.0.5',
      commandPort: 30000,
      eventPort: 30001,
    });
  });
});
