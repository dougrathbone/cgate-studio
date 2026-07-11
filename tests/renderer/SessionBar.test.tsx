/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionBar } from '../../src/renderer/components/SessionBar';

describe('SessionBar', () => {
  it('renders project and network selects and fires callbacks', () => {
    const onSelectProject = jest.fn();
    const onSelectNetwork = jest.fn();
    render(
      <SessionBar
        projects={[{ name: 'TESTPROJ', state: 'started' }, { name: 'ARCHIVE', state: null }]}
        networks={[
          { address: '254', state: 'ok' },
          { address: '253', state: 'new' },
        ]}
        projectName="TESTPROJ"
        activeNetwork="254"
        onSelectProject={onSelectProject}
        onSelectNetwork={onSelectNetwork}
      />,
    );
    fireEvent.change(screen.getByLabelText('Active project'), { target: { value: 'ARCHIVE' } });
    expect(onSelectProject).toHaveBeenCalledWith('ARCHIVE');
    fireEvent.change(screen.getByLabelText('Active network'), { target: { value: '253' } });
    expect(onSelectNetwork).toHaveBeenCalledWith('253');
  });
});
