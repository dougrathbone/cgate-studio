/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { NetworkTree } from '../../src/renderer/components/NetworkTree';
import type { Tree } from '../../src/shared/types';

const tree: Tree = [
  {
    kind: 'network',
    address: '254',
    label: 'Main',
    applications: [
      {
        kind: 'application',
        address: '56',
        label: null,
        groups: [
          {
            kind: 'group',
            address: '254/56/4',
            network: '254',
            application: '56',
            group: '4',
            label: 'Kitchen',
          },
          {
            kind: 'group',
            address: '254/56/5',
            network: '254',
            application: '56',
            group: '5',
            label: null,
          },
        ],
      },
    ],
  },
];

describe('NetworkTree', () => {
  it('shows a placeholder when the tree is empty', () => {
    render(<NetworkTree tree={[]} states={{}} />);
    expect(screen.getByText('Not connected.')).toBeInTheDocument();
  });

  it('renders networks, groups, labels and live state', () => {
    const states = { '254/56/4': { address: '254/56/4', level: 255, on: true } };
    render(<NetworkTree tree={tree} states={states} />);
    expect(screen.getByText(/Main/)).toBeInTheDocument();
    expect(screen.getByText(/Kitchen/)).toBeInTheDocument();
    expect(screen.getByText('254/56/5')).toBeInTheDocument(); // group with no label
    expect(screen.getByText('ON 100%')).toBeInTheDocument();
  });
});
