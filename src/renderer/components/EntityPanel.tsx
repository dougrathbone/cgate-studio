import React, { useEffect, useMemo, useState } from 'react';
import { cgate } from '../api';
import { CloseButton } from './CloseButton';
import type { GroupActions } from './GroupRow';
import type { GroupNode, GroupState, TreeSelection, CgateObjectParams, UnitNode } from '../../shared/types';
import { formatUnitType } from '../../shared/displayLabels';

const refOf = (g: GroupNode) => ({ network: g.network, application: g.application, group: g.group });
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

const GROUP_EDITABLE = ['Name', 'RampTime', 'EventLevel', 'Protected'] as const;
const GROUP_READONLY = ['Type', 'State', 'Units', 'Level'] as const;

const UNIT_STATUS_KEYS = [
  'MainsPresent', 'NetVoltage', 'BurdenActive', 'ClockGenActive', 'LearnEnable',
  'State', 'Online', 'Clock', 'Burden',
] as const;

type UnitTab = 'summary' | 'status' | 'groups' | 'all';
type GroupTab = 'live' | 'settings' | 'all';

function normKey(k: string) {
  return k.toLowerCase();
}

function pickParams(params: CgateObjectParams, keys: readonly string[]): [string, string][] {
  const wanted = new Set(keys.map(normKey));
  return Object.entries(params)
    .filter(([k]) => wanted.has(normKey(k)))
    .sort(([a], [b]) => a.localeCompare(b));
}

function parseChipList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
}

function formatStatusValue(value: string): string {
  const v = value.trim().toLowerCase();
  if (v === 'yes' || v === 'true' || v === '1') return 'yes';
  if (v === 'no' || v === 'false' || v === '0') return 'no';
  return value || '—';
}

function ParamRow({
  label,
  value,
  editable,
  onChange,
  onCommit,
}: {
  label: string;
  value: string;
  editable?: boolean;
  onChange?: (v: string) => void;
  onCommit?: () => void;
}) {
  return (
    <div className="entityPanel__param">
      <label className="entityPanel__paramKey" title={label}>{label}</label>
      {editable ? (
        <input
          className="entityPanel__input"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={onCommit}
          onKeyDown={(e) => { if (e.key === 'Enter') onCommit?.(); }}
        />
      ) : (
        <span className="entityPanel__paramVal">{value || '—'}</span>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="entityPanel__card">
      <div className="entityPanel__cardLabel">{label}</div>
      <div className="entityPanel__cardValue" title={value}>{value || '—'}</div>
    </div>
  );
}

function TabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="entityPanel__tabs" role="tablist" aria-label="Inspector sections">
      {tabs.map((t, i) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          id={`entity-tab-${t.id}`}
          aria-selected={active === t.id}
          aria-controls={`entity-panel-${t.id}`}
          tabIndex={active === t.id ? 0 : -1}
          className={`entityPanel__tab${active === t.id ? ' entityPanel__tab--active' : ''}`}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            e.preventDefault();
            const next = e.key === 'ArrowRight'
              ? tabs[(i + 1) % tabs.length]
              : tabs[(i - 1 + tabs.length) % tabs.length];
            onChange(next.id);
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function unitSummaryCards(params: CgateObjectParams, unit: UnitNode): { label: string; value: string }[] {
  const fromParams = Object.fromEntries(
    Object.entries(params).map(([k, v]) => [normKey(k), v]),
  );
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = fromParams[normKey(k)];
      if (v) return v;
    }
    return '';
  };
  return [
    { label: 'Catalog', value: get('CatalogNumber') },
    { label: 'Serial', value: get('Serial') || unit.serial || '' },
    { label: 'Firmware', value: get('Firmware', 'Version') || unit.firmware || '' },
    { label: 'Type', value: formatUnitType(get('Type', 'PartName') || unit.type || '', unit.category) },
  ];
}

export function EntityPanel({
  selection,
  state,
  actions,
  connected,
  onGroupRenamed,
  onUnitRenamed,
  onProjectDirty,
  onError,
  onClose,
}: {
  selection: TreeSelection;
  state?: GroupState;
  actions?: GroupActions;
  connected: boolean;
  onGroupRenamed: (group: GroupNode, name: string) => void;
  onUnitRenamed: (network: string, unitAddress: string, name: string) => void;
  onProjectDirty?: (dirtyKey: string) => void;
  onError: (msg: string) => void;
  onClose: () => void;
}) {
  const [params, setParams] = useState<CgateObjectParams | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [unitTab, setUnitTab] = useState<UnitTab>('summary');
  const [groupTab, setGroupTab] = useState<GroupTab>('settings');
  const [identifyBusy, setIdentifyBusy] = useState(false);
  const [identifyMsg, setIdentifyMsg] = useState<string | null>(null);

  useEffect(() => {
    setUnitTab('summary');
    setGroupTab(actions ? 'live' : 'settings');
    setIdentifyMsg(null);
  }, [selection, actions]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setParams(null);
    (async () => {
      try {
        let p: CgateObjectParams;
        if (selection.kind === 'group') {
          p = await cgate().nodes.getGroupParams(refOf(selection.group));
        } else {
          p = await cgate().nodes.getUnitParams(selection.network, selection.unit.address);
        }
        if (!cancelled) {
          setParams(p);
          // Prefer tree TagName (group.label) for the editable label field.
          setDraft(
            selection.kind === 'group' && selection.group.label
              ? { ...p, Name: selection.group.label }
              : { ...p },
          );
        }
      } catch (e) {
        if (!cancelled) onError(errMsg(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selection]);

  async function identify() {
    if (!connected || selection.kind !== 'unit') return;
    setIdentifyBusy(true);
    setIdentifyMsg(null);
    try {
      await cgate().nodes.identifyUnit(selection.network, selection.unit.address);
      setIdentifyMsg('Identify sent — watch the unit for a blink or indicator.');
    } catch (e) {
      setIdentifyMsg(errMsg(e));
    } finally {
      setIdentifyBusy(false);
    }
  }

  async function commitParam(key: string) {
    if (!connected) return;
    if (selection.kind === 'group' && key === 'Name') {
      const currentTag = selection.group.label ?? '';
      if (draft[key] === currentTag) return;
    } else if (draft[key] === params?.[key]) {
      return;
    }
    try {
      if (selection.kind === 'group') {
        if (key === 'Name') {
          await cgate().labels.rename(refOf(selection.group), draft[key]);
          onGroupRenamed(selection.group, draft[key]);
        } else {
          await cgate().nodes.setGroupParam(refOf(selection.group), key, draft[key]);
          onProjectDirty?.(selection.group.address);
        }
      } else if (key === 'Name') {
        await cgate().nodes.setUnitName(selection.network, selection.unit.address, draft[key]);
        onUnitRenamed(selection.network, selection.unit.address, draft[key]);
        onProjectDirty?.(`${selection.network}/p/${selection.unit.address}`);
      }
      setParams((prev) => ({ ...prev, [key]: draft[key] }));
    } catch (e) {
      onError(errMsg(e));
      setDraft((d) => ({
        ...d,
        [key]: selection.kind === 'group' && key === 'Name'
          ? (selection.group.label ?? params?.[key] ?? '')
          : (params?.[key] ?? ''),
      }));
    }
  }

  const title = selection.kind === 'group'
    ? `Group ${selection.group.address}`
    : `Unit ${selection.unit.address}`;

  const subtitle = selection.kind === 'group'
    ? (selection.group.label ?? '(unlabelled)')
    : (selection.unit.name ?? '(unnamed)');

  const allEntries = useMemo(
    () => Object.entries(params ?? {}).sort(([a], [b]) => a.localeCompare(b)),
    [params],
  );

  const unitStatusRows = useMemo(
    () => (params ? pickParams(params, UNIT_STATUS_KEYS) : []),
    [params],
  );

  const groupChips = useMemo(() => {
    if (!params) return [] as string[];
    const fromParams = parseChipList(
      params.Groups ?? params.groups ?? '',
    );
    if (selection.kind === 'unit' && fromParams.length === 0) {
      return selection.unit.groups ?? [];
    }
    return fromParams;
  }, [params, selection]);

  const appChips = useMemo(() => {
    if (!params) return [] as string[];
    const raw = params.Applications ?? params.Application ?? params.applications ?? '';
    const parsed = parseChipList(raw);
    if (selection.kind === 'unit' && parsed.length === 0) {
      return selection.unit.applications ?? [];
    }
    return parsed;
  }, [params, selection]);

  const unitTabs = [
    { id: 'summary' as const, label: 'Summary' },
    { id: 'status' as const, label: 'Status' },
    { id: 'groups' as const, label: 'Groups' },
    { id: 'all' as const, label: 'All' },
  ];

  const groupTabs = [
    { id: 'live' as const, label: 'Live' },
    { id: 'settings' as const, label: 'Settings' },
    { id: 'all' as const, label: 'All' },
  ];

  return (
    <aside className="entityPanel" aria-label="Entity details">
      <header className="entityPanel__header">
        <div>
          <h2 className="entityPanel__title">{title}</h2>
          <p className="entityPanel__subtitle">{subtitle}</p>
        </div>
        <CloseButton onClick={onClose} />
      </header>

      {!loading && params && selection.kind === 'unit' && (
        <TabBar tabs={unitTabs} active={unitTab} onChange={setUnitTab} />
      )}
      {!loading && params && selection.kind === 'group' && (
        <TabBar tabs={groupTabs} active={groupTab} onChange={setGroupTab} />
      )}

      {loading && <p className="entityPanel__loading">Loading parameters…</p>}

      {!loading && params && selection.kind === 'unit' && (
        <div
          className="entityPanel__body"
          role="tabpanel"
          id={`entity-panel-${unitTab}`}
          aria-labelledby={`entity-tab-${unitTab}`}
        >
          {unitTab === 'summary' && (
            <section className="entityPanel__section">
              <div className="entityPanel__cards">
                {unitSummaryCards(params, selection.unit).map((c) => (
                  <SummaryCard key={c.label} label={c.label} value={c.value} />
                ))}
              </div>
              <div className="entityPanel__sectionBlock">
                <h3 className="entityPanel__sectionTitle">Name</h3>
                <ParamRow
                  label="Name"
                  value={draft.Name ?? ''}
                  editable={connected}
                  onChange={(v) => setDraft((d) => ({ ...d, Name: v }))}
                  onCommit={() => void commitParam('Name')}
                />
              </div>
              {pickParams(params, ['ProjectName']).map(([k, v]) => (
                <ParamRow key={k} label={k} value={v} />
              ))}
              <p className="entityPanel__hint">
                Other unit parameters are configured in C-Bus Toolkit. Only the unit name can be changed here.
              </p>
              {connected && (
                <div className="entityPanel__sectionBlock">
                  <h3 className="entityPanel__sectionTitle">Diagnostics</h3>
                  <button
                    type="button"
                    className="btn btn--sm"
                    disabled={identifyBusy}
                    onClick={() => void identify()}
                    title="Ask the unit to identify itself (usually blinks)"
                  >
                    {identifyBusy ? 'Identifying…' : 'Identify'}
                  </button>
                  {identifyMsg && (
                    <p className="entityPanel__hint" role="status">{identifyMsg}</p>
                  )}
                </div>
              )}
            </section>
          )}

          {unitTab === 'status' && (
            <section className="entityPanel__section">
              {unitStatusRows.length === 0 ? (
                <p className="entityPanel__empty">No status fields reported for this unit.</p>
              ) : (
                unitStatusRows.map(([k, v]) => (
                  <ParamRow key={k} label={k} value={formatStatusValue(v)} />
                ))
              )}
            </section>
          )}

          {unitTab === 'groups' && (
            <section className="entityPanel__section">
              <h3 className="entityPanel__sectionTitle">Group addresses</h3>
              {groupChips.length === 0 ? (
                <p className="entityPanel__empty">No groups assigned.</p>
              ) : (
                <div className="entityPanel__chips" aria-label="Groups">
                  {groupChips.map((g) => (
                    <span key={g} className="entityPanel__chip">{g}</span>
                  ))}
                </div>
              )}
              <h3 className="entityPanel__sectionTitle">Applications</h3>
              {appChips.length === 0 ? (
                <p className="entityPanel__empty">No applications listed.</p>
              ) : (
                <div className="entityPanel__chips" aria-label="Applications">
                  {appChips.map((a) => (
                    <span key={a} className="entityPanel__chip">{a}</span>
                  ))}
                </div>
              )}
            </section>
          )}

          {unitTab === 'all' && (
            <section className="entityPanel__section">
              {allEntries.map(([k, v]) => (
                <ParamRow key={k} label={k} value={v} />
              ))}
            </section>
          )}
        </div>
      )}

      {!loading && params && selection.kind === 'group' && (
        <div
          className="entityPanel__body"
          role="tabpanel"
          id={`entity-panel-${groupTab}`}
          aria-labelledby={`entity-tab-${groupTab}`}
        >
          {groupTab === 'live' && (
            <section className="entityPanel__section">
              {actions ? (
                <div className="entityPanel__live">
                  <button
                    type="button"
                    className={state?.on ? 'btn btn--sm toggle toggle--on' : 'btn btn--sm toggle'}
                    onClick={() => actions.setLevel(selection.group, state?.on ? 0 : 255)}
                  >
                    {state?.on ? 'Off' : 'On'}
                  </button>
                  <input
                    type="range"
                    className="slider"
                    min={0}
                    max={100}
                    value={state ? Math.round((state.level / 255) * 100) : 0}
                    aria-label="Level"
                    onChange={(e) => {
                      const level = Math.round((Number(e.target.value) / 100) * 255);
                      actions.setLevel(selection.group, level);
                    }}
                  />
                </div>
              ) : (
                <p className="entityPanel__empty">Connect to control this group.</p>
              )}
            </section>
          )}

          {groupTab === 'settings' && (
            <section className="entityPanel__section">
              {(connected ? [...GROUP_EDITABLE] : []).map((key) => (
                <ParamRow
                  key={key}
                  label={key === 'Name' ? 'TagName' : key}
                  value={draft[key] ?? ''}
                  editable={connected}
                  onChange={(v) => setDraft((d) => ({ ...d, [key]: v }))}
                  onCommit={() => void commitParam(key)}
                />
              ))}
              {GROUP_READONLY.map((key) => (
                <ParamRow
                  key={key}
                  label={key}
                  value={
                    key === 'Level' && state != null
                      ? String(state.level)
                      : (params[key] ?? '')
                  }
                />
              ))}
              {(() => {
                const tag = (selection.group.label ?? '').trim();
                const objectName = (params.Name ?? '').trim();
                if (!tag || !objectName || tag === objectName) return null;
                return (
                  <p className="entityPanel__hint" role="status">
                    TagName (“{tag}”) differs from object Name (“{objectName}”).
                  </p>
                );
              })()}
            </section>
          )}

          {groupTab === 'all' && (
            <section className="entityPanel__section">
              {allEntries.map(([k, v]) => (
                <ParamRow key={k} label={k} value={v} />
              ))}
            </section>
          )}
        </div>
      )}
    </aside>
  );
}
