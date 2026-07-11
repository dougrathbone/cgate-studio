import React, { useEffect, useState } from 'react';
import type { Site, SiteInput } from '../../shared/types';

type Props =
  | { mode: 'add'; onAdd: (s: SiteInput) => void; onCancel?: never; initial?: never }
  | { mode: 'edit'; initial: Site; onSave: (s: Site) => void; onCancel: () => void };

export function SiteForm(props: Props) {
  const editing = props.mode === 'edit';
  const initial = editing ? props.initial : null;

  const [name, setName] = useState(initial?.name ?? '');
  const [host, setHost] = useState(initial?.host ?? '127.0.0.1');
  const [commandPort, setCommandPort] = useState(initial?.commandPort ?? 20023);
  const [eventPort, setEventPort] = useState(initial?.eventPort ?? 20025);
  const [username, setUsername] = useState(initial?.username ?? '');
  const [password, setPassword] = useState(initial?.password ?? '');
  const [defaultProject, setDefaultProject] = useState(initial?.defaultProject ?? '');
  const [defaultNetwork, setDefaultNetwork] = useState(initial?.defaultNetwork ?? '');
  const [showAuth, setShowAuth] = useState(Boolean(initial?.username || initial?.password));

  useEffect(() => {
    if (!editing || !initial) return;
    setName(initial.name);
    setHost(initial.host);
    setCommandPort(initial.commandPort);
    setEventPort(initial.eventPort);
    setUsername(initial.username ?? '');
    setPassword(initial.password ?? '');
    setDefaultProject(initial.defaultProject ?? '');
    setDefaultNetwork(initial.defaultNetwork ?? '');
    setShowAuth(Boolean(initial.username || initial.password));
  }, [editing, initial]);

  return (
    <form
      className="siteForm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        const base = {
          name: name.trim(),
          host: host.trim(),
          commandPort,
          eventPort,
          username: username.trim() || undefined,
          password: password || undefined,
          defaultProject: defaultProject.trim() || undefined,
          defaultNetwork: defaultNetwork.trim() || undefined,
        };
        if (editing) {
          props.onSave({ ...props.initial, ...base });
        } else {
          props.onAdd(base);
          setName('');
          setUsername('');
          setPassword('');
          setDefaultProject('');
          setDefaultNetwork('');
          setShowAuth(false);
        }
      }}
    >
      <div className="siteForm__title">{editing ? 'Edit site' : 'Add a site'}</div>
      <label className="field">
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Home" />
      </label>
      <label className="field">
        Host
        <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="127.0.0.1" />
      </label>
      <div className="field--row">
        <label className="field">
          Cmd
          <input type="number" value={commandPort} onChange={(e) => setCommandPort(+e.target.value)} />
        </label>
        <label className="field">
          Event
          <input type="number" value={eventPort} onChange={(e) => setEventPort(+e.target.value)} />
        </label>
      </div>
      <label className="field">
        Default project
        <input
          value={defaultProject}
          onChange={(e) => setDefaultProject(e.target.value)}
          placeholder="optional"
        />
      </label>
      <label className="field">
        Default network
        <input
          value={defaultNetwork}
          onChange={(e) => setDefaultNetwork(e.target.value)}
          placeholder="e.g. 254"
        />
      </label>
      <button
        type="button"
        className="btn btn--sm"
        onClick={() => setShowAuth((v) => !v)}
      >
        {showAuth ? 'Hide login' : 'C-Gate login…'}
      </button>
      {showAuth && (
        <div className="field--row">
          <label className="field">
            User
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          </label>
          <label className="field">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
        </div>
      )}
      <div className="field--row">
        <button type="submit" className="btn btn--primary">
          {editing ? 'Save site' : 'Add site'}
        </button>
        {editing && (
          <button type="button" className="btn" onClick={props.onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
