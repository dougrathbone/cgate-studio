/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React, { useRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CgateStatusPanel } from '../../src/renderer/components/CgateStatusPanel';
import type { CgateServerStatus } from '../../src/shared/cgateStatus';

const sample: CgateServerStatus = {
  connection: 'connected',
  host: '10.0.0.1',
  commandPort: 20023,
  eventPort: 20025,
  commandConnected: true,
  eventConnected: true,
  serverVersion: 'v2.8.0 (build 2307)',
  serverGreeting: '201 Service ready: Clipsal C-Gate Version: v2.8.0 (build 2307)',
  activeProject: { name: 'TESTPROJ', state: 'started' },
  loadedProjects: [{ name: 'TESTPROJ', state: 'started' }],
  projectsOnDisk: [{ name: 'TESTPROJ', state: null }, { name: 'ARCHIVE', state: null }],
};

describe('CgateStatusPanel', () => {
  it('renders nothing when closed', () => {
    render(
      <CgateStatusPanel open={false} connection="disconnected" server={null} loading={false} onRefresh={jest.fn()} onClose={jest.fn()} />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows server version, project, and lists when open', () => {
    render(
      <CgateStatusPanel open connection="connected" server={sample} loading={false} onRefresh={jest.fn()} onClose={jest.fn()} />,
    );
    expect(screen.getByRole('dialog', { name: 'C-Gate server status' })).toBeInTheDocument();
    expect(screen.getByText('v2.8.0 (build 2307)')).toBeInTheDocument();
    expect(screen.getAllByText('TESTPROJ').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('started').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('ARCHIVE')).toBeInTheDocument();
    expect(screen.getByText(/10\.0\.0\.1:20023/)).toBeInTheDocument();
  });

  it('calls refresh and close handlers', () => {
    const onRefresh = jest.fn();
    const onClose = jest.fn();
    render(
      <CgateStatusPanel open connection="connected" server={sample} loading={false} onRefresh={onRefresh} onClose={onClose} />,
    );
    fireEvent.click(screen.getByText('Refresh'));
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onRefresh).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on outside pointerdown and Escape, but not when clicking inside the root', () => {
    const onClose = jest.fn();
    function Harness({ open }: { open: boolean }) {
      const rootRef = useRef<HTMLDivElement>(null);
      return (
        <div>
          <div data-testid="outside">outside</div>
          <div ref={rootRef} data-testid="root">
            <button type="button">trigger</button>
            <CgateStatusPanel
              open={open}
              connection="connected"
              server={sample}
              loading={false}
              onRefresh={jest.fn()}
              onClose={onClose}
              dismissRootRef={rootRef}
            />
          </div>
        </div>
      );
    }
    const { rerender } = render(<Harness open />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByTestId('root'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.pointerDown(screen.getByTestId('outside'));
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();
    rerender(<Harness open />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
