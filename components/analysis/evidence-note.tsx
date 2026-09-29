'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Fuse from 'fuse.js';
import { FaIcon } from '@/components/fa-icon';
import { DiscoveryCard } from './discovery-card';
import {
  addEvidence,
  evidenceText,
  notebookText,
  parseNotebook,
  serializeNotebook,
  NOTEBOOK_KEY,
  NOTEBOOK_LIMIT,
  OBSERVATION_LIMIT,
  NOTEBOOK_FILE_LIMIT,
  mergeNotebook,
  type EvidenceRecord,
  type EvidenceSummary,
} from '@/lib/evidence-notebook';
import { metricLabels } from '@/lib/geography-analysis';
import type { ComparisonSettings } from '@/lib/comparison-settings';
import { downloadFile as downloadText } from '@/lib/download';

export function EvidenceNote({
  context,
  year,
  summary,
  settings,
  onRestore,
}: {
  context: string;
  year: number;
  summary: EvidenceSummary;
  settings: ComparisonSettings;
  onRestore: (settings: ComparisonSettings) => void;
}) {
  const id = useId();
  const [snapshot, setSnapshot] = useState<EvidenceRecord | null>(null);
  const [observation, setObservation] = useState('');
  const [message, setMessage] = useState('');
  const [notes, setNotes] = useState<EvidenceRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [removed, setRemoved] = useState<EvidenceRecord | null>(null);
  const [search, setSearch] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const [incoming, setIncoming] = useState<{
    name: string;
    notes: EvidenceRecord[];
  } | null>(null);
  const importPreview = useMemo(() => {
    if (!incoming) return null;
    try {
      return { ...mergeNotebook(notes, incoming.notes), error: '' };
    } catch (error) {
      return {
        added: 0,
        duplicates: 0,
        error:
          error instanceof Error
            ? error.message
            : 'The notebook could not be imported.',
      };
    }
  }, [incoming, notes]);
  const changed = snapshot !== null && snapshot.context !== context;
  const draft = snapshot ? { ...snapshot, observation } : null;
  const saved =
    draft !== null &&
    notes.some(
      (note) =>
        note.context === draft.context &&
        note.observation === draft.observation,
    );
  const index = useMemo(
    () =>
      new Fuse(notes, {
        keys: ['summary.specialty', 'summary.places.name', 'observation'],
        threshold: 0.3,
        ignoreLocation: true,
      }),
    [notes],
  );
  const filtered = search.trim()
    ? index.search(search.trim()).map((hit) => hit.item)
    : notes;

  useEffect(() => {
    const read = () => {
      try {
        setNotes(parseNotebook(localStorage.getItem(NOTEBOOK_KEY)));
        setStorageError('');
      } catch {
        setStorageError(
          'This browser’s saved notebook could not be read. Existing stored data is preserved; you can still capture and download new notes.',
        );
      }
      setReady(true);
    };
    read();
    const sync = (event: StorageEvent) => {
      if (event.key === NOTEBOOK_KEY || event.key === null) read();
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  // Read again before writing so another open tab's saved notes are retained.
  const changeNotebook = (
    update: (current: EvidenceRecord[]) => EvidenceRecord[],
  ) => {
    try {
      const next = update(parseNotebook(localStorage.getItem(NOTEBOOK_KEY)));
      localStorage.setItem(NOTEBOOK_KEY, serializeNotebook(next));
      setNotes(next);
      setStorageError('');
      return true;
    } catch (error) {
      setMessage(
        error instanceof Error &&
          !['QuotaExceededError', 'SecurityError', 'SyntaxError'].includes(
            error.name,
          )
          ? error.message
          : 'This browser could not save the notebook. Download your notes to keep them; the existing notebook has not been replaced.',
      );
      return false;
    }
  };
  const capture = () => {
    setSnapshot({
      id: crypto.randomUUID(),
      context,
      year,
      summary,
      settings: { ...settings, group: [...settings.group] },
      captured: new Date().toISOString(),
      observation: '',
    });
    setMessage('Current comparison captured. Your observation is preserved.');
  };
  const save = () => {
    if (
      draft &&
      changeNotebook((current) =>
        addEvidence(current, { ...draft, id: crypto.randomUUID() }),
      )
    )
      setMessage('Discovery saved to this browser’s field notebook.');
  };
  const remove = (note: EvidenceRecord) => {
    if (
      changeNotebook((current) => current.filter((item) => item.id !== note.id))
    ) {
      setRemoved(note);
      setMessage('Note removed. You can undo the removal below.');
    }
  };
  const undo = () => {
    if (removed && changeNotebook((current) => addEvidence(current, removed))) {
      setRemoved(null);
      setMessage('Note restored to your notebook.');
    }
  };
  const copy = async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(evidenceText(draft));
      setMessage('Evidence note copied.');
    } catch {
      setMessage(
        'Copy is unavailable in this browser. Download the note or select the preview text.',
      );
    }
  };
  return (
    <section
      id="geo-evidence"
      className="evidence-note"
      aria-labelledby={`${id}-title`}
    >
      <div className="notebook-heading">
        <div>
          <span className="eyebrow">
            <FaIcon name="book" /> YOUR FIELD NOTEBOOK
          </span>
          <h3 id={`${id}-title`}>Good questions deserve a place to stay.</h3>
          <p>
            Capture a comparison. Add what you noticed. Collect your discoveries
            here, or take an evidence card with you.
          </p>
        </div>
        <span className="notebook-count">
          <FaIcon name="bookmark" /> {ready ? notes.length : '…'} saved
        </span>
      </div>
      <div
        className="notebook-workflow"
        aria-label="From discovery to evidence"
      >
        <span>
          <b>01</b> Capture the evidence
        </span>
        <span>
          <b>02</b> Add your perspective
        </span>
        <span>
          <b>03</b> Keep the discovery
        </span>
      </div>
      {!snapshot ? (
        <div className="notebook-start">
          <span className="notebook-start-icon" aria-hidden="true">
            <FaIcon name="write" />
          </span>
          <div>
            <h4>Your next discovery starts here.</h4>
            <p>
              {summary.specialty} ·{' '}
              {summary.places.map((p) => p.name).join(' & ')} ·{' '}
              {metricLabels[summary.metric]}
            </p>
          </div>
          <button type="button" className="notebook-primary" onClick={capture}>
            <FaIcon name="records" /> Start an evidence note
          </button>
        </div>
      ) : (
        draft && (
          <>
            <output className="evidence-state">
              {changed
                ? 'The workspace has changed. This note keeps the earlier comparison. Capture the current comparison to update its evidence, then review your observation.'
                : 'Evidence captured. Your values stay fixed while you keep exploring.'}
            </output>
            <div className="notebook-editor">
              <div className="notebook-compose">
                <label htmlFor={`${id}-observation`}>
                  What did you notice?
                </label>
                <p className="notebook-prompt">
                  Describe a difference, a surprise, or a question you would
                  investigate next.
                </p>
                <textarea
                  id={`${id}-observation`}
                  rows={6}
                  maxLength={OBSERVATION_LIMIT}
                  value={observation}
                  onChange={(event) => {
                    setObservation(event.target.value);
                    setMessage('');
                  }}
                  placeholder="I noticed… I wonder whether…"
                  aria-describedby={`${id}-draft-help`}
                />
                <small id={`${id}-draft-help`}>
                  {observation.length} / {OBSERVATION_LIMIT} characters · save
                  to keep this draft
                </small>
                <div className="evidence-actions">
                  <button
                    type="button"
                    className="notebook-primary"
                    onClick={save}
                    disabled={!ready || saved || !!storageError}
                  >
                    <FaIcon name={saved ? 'check' : 'bookmark'} />{' '}
                    {saved ? 'Saved to notebook' : 'Save to notebook'}
                  </button>
                  <button type="button" onClick={capture} disabled={!changed}>
                    <FaIcon name="reset" /> Capture current comparison
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      downloadText(
                        evidenceText(draft),
                        `part-d-${draft.year}-evidence-note.txt`,
                      );
                      setMessage('Complete evidence download requested.');
                    }}
                  >
                    <FaIcon name="download" /> Download note (.txt)
                  </button>
                  <button type="button" onClick={copy}>
                    <FaIcon name="records" /> Copy note
                  </button>
                </div>
                <details>
                  <summary>Preview the complete evidence</summary>
                  {/* Focus allows keyboard scrolling through the complete note. */}
                  {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
                  <pre tabIndex={0} aria-label="Complete evidence note">
                    {evidenceText(draft)}
                  </pre>
                </details>
              </div>
              <div>
                <span className="notebook-preview-label">
                  YOUR DISCOVERY CARD · LIVE PREVIEW
                </span>
                <DiscoveryCard note={draft} />
              </div>
            </div>
          </>
        )
      )}
      <output className="evidence-feedback" aria-live="polite">
        {message}
      </output>
      {removed && (
        <button type="button" onClick={undo}>
          <FaIcon name="reset" /> Undo last removal
        </button>
      )}
      {storageError && (
        <output className="evidence-state">{storageError}</output>
      )}
      <div className="notebook-shelf" id="field-notebook">
        <div className="notebook-shelf-heading">
          <div>
            <span className="eyebrow">COLLECTED ALONG THE WAY</span>
            <h4>
              Saved discoveries{' '}
              <span>
                {notes.length} / {NOTEBOOK_LIMIT}
              </span>
            </h4>
          </div>
          <button
            type="button"
            disabled={!notes.length}
            onClick={() => {
              downloadText(notebookText(notes), 'part-d-field-notebook.txt');
              setMessage('Complete notebook download requested.');
            }}
          >
            <FaIcon name="download" /> Download notebook
          </button>
          <button
            type="button"
            disabled={!ready || !notes.length}
            onClick={() => {
              downloadText(
                serializeNotebook(notes),
                'part-d-field-notebook.json',
                'application/json',
              );
              setMessage(
                'Portable notebook backup downloaded. Import this file on another browser to restore your discoveries.',
              );
            }}
          >
            <FaIcon name="download" /> Export backup (.json)
          </button>
          <button
            type="button"
            disabled={!ready || !!storageError}
            onClick={() => fileInput.current?.click()}
          >
            <FaIcon name="import" /> Import backup
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            hidden
            aria-label="Choose notebook backup"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              setIncoming(null);
              try {
                if (file.size > NOTEBOOK_FILE_LIMIT)
                  throw new Error(
                    'Choose a notebook backup smaller than 7 MB.',
                  );
                const imported = parseNotebook(await file.text());
                setIncoming({ name: file.name, notes: imported });
                setMessage('Backup checked. Review the import below.');
              } catch (error) {
                setMessage(
                  `${error instanceof Error && error.name !== 'SyntaxError' ? error.message : 'This file is not a valid notebook backup.'} Your existing notes have not changed.`,
                );
              }
            }}
          />
        </div>
        {incoming && importPreview && (
          <div className="notebook-import" aria-label="Notebook import preview">
            <b>{incoming.name}</b>
            {importPreview.error ? (
              <p>{importPreview.error}</p>
            ) : (
              <p>
                {importPreview.added} new discoveries ·{' '}
                {importPreview.duplicates} duplicates skipped. Existing notes
                will be kept.
              </p>
            )}
            <div className="evidence-actions">
              <button
                type="button"
                disabled={
                  !!importPreview.error ||
                  !importPreview.added ||
                  !!storageError
                }
                onClick={() => {
                  let count = 0;
                  if (
                    changeNotebook((current) => {
                      const merged = mergeNotebook(current, incoming.notes);
                      count = merged.added;
                      return merged.notes;
                    })
                  ) {
                    setMessage(
                      `${count} ${count === 1 ? 'discovery' : 'discoveries'} imported. Existing notes were preserved.`,
                    );
                    setIncoming(null);
                    setSearch('');
                  }
                }}
              >
                Import {importPreview.added} discoveries
              </button>
              <button type="button" onClick={() => setIncoming(null)}>
                Cancel import
              </button>
            </div>
          </div>
        )}
        {notes.length > 0 && (
          <>
            <label htmlFor={`${id}-search`}>
              <FaIcon name="inspect" /> Find a saved discovery
            </label>
            <input
              id={`${id}-search`}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search a specialty, place, or observation…"
            />
          </>
        )}
        {!ready ? (
          <p>Opening your notebook…</p>
        ) : !notes.length ? (
          <p className="notebook-empty">
            A home for the patterns you want to remember. Save your first note
            above to begin.
          </p>
        ) : !filtered.length ? (
          <p className="notebook-empty">
            No saved discoveries match. Try a different place or specialty.
          </p>
        ) : (
          <div className="notebook-entries">
            {filtered.map((note) => (
              <details className="notebook-entry" key={note.id}>
                <summary>
                  <span className="notebook-entry-icon">
                    <FaIcon name="bookmark" />
                  </span>
                  <span>
                    <b>{note.summary.specialty}</b>
                    <span>
                      {note.summary.places.map((p) => p.name).join(' & ')} ·{' '}
                      {metricLabels[note.summary.metric]}
                    </span>
                    <small>
                      Captured {note.captured.slice(0, 10)} · CMS {note.year}
                    </small>
                  </span>
                  <FaIcon name="down" />
                </summary>
                <div className="notebook-entry-body">
                  <DiscoveryCard note={note} />
                  <div className="evidence-actions">
                    {note.settings && (
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            onRestore(note.settings!);
                          } catch (error) {
                            setMessage(
                              error instanceof Error
                                ? error.message
                                : 'This comparison is unavailable. Your saved evidence is preserved.',
                            );
                          }
                        }}
                      >
                        <FaIcon name="reset" /> Reopen comparison
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        downloadText(
                          evidenceText(note),
                          `part-d-${note.year}-saved-note.txt`,
                        )
                      }
                    >
                      <FaIcon name="download" /> Download complete evidence
                    </button>
                    <button type="button" onClick={() => remove(note)}>
                      <FaIcon name="trash" /> Remove note
                    </button>
                  </div>
                  <details>
                    <summary>Full evidence & settings</summary>
                    <pre>{evidenceText(note)}</pre>
                  </details>
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
      <p className="evidence-reminder">
        <FaIcon name="info" /> Saved notes stay in this browser on this site;
        they are not synced or uploaded. Clearing browser data removes them.
        Unsaved drafts last until reload. Download your notebook for a lasting
        copy. Use Export backup to move discoveries to another browser, then
        Import backup to merge them safely.
      </p>
      <p className="notebook-credits">
        Made with free, open-source tools:{' '}
        <a href="https://www.fusejs.io/" target="_blank" rel="noreferrer">
          Fuse.js
        </a>{' '}
        for finding discoveries and{' '}
        <a
          href="https://github.com/bubkoo/html-to-image"
          target="_blank"
          rel="noreferrer"
        >
          html-to-image
        </a>{' '}
        for taking them with you.{' '}
        {/* Static bundled license file, not an application route. */}
        {/* eslint-disable-next-line next/no-html-link-for-pages */}
        <a href="./data/open-source-notices.txt">Licenses & credits</a>
      </p>
    </section>
  );
}
