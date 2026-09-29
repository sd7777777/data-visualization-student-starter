'use client';

import { useEffect, useRef } from 'react';
import { FaIcon } from '@/components/fa-icon';

export function SiteHeader(
  _props: {
    section?: 'explorer' | 'lab' | 'coursework';
    base?: '.' | '..';
    onSearch?: () => void;
  } = {},
) {
  const resources = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !resources.current?.contains(event.target) &&
        resources.current
      )
        resources.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && resources.current?.open) {
        resources.current.open = false;
        resources.current.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', escape);
    };
  }, []);
  return (
    <header className="site-header" id="week-1">
      <a
        className="wordmark"
        href="#week-1"
        aria-label="Part D prescriber explorer home"
      >
        <span className="wordmark-dot" />
        part d<span className="wordmark-divider">/</span>
        <span className="wordmark-subtitle">explorer</span>
      </a>
      <nav aria-label="Primary navigation">
        {_props.onSearch && (
          <button
            type="button"
            className="header-search"
            onClick={_props.onSearch}
          >
            <FaIcon name="inspect" /> Search
          </button>
        )}
        <a href="#week-3">
          <FaIcon name="explore" /> Specialties
        </a>
        <a href="#place">
          <FaIcon name="place" /> Compare places
        </a>
        <a href="#geo-evidence">
          <FaIcon name="bookmark" /> Notebook
        </a>
        <details ref={resources} className="header-resources">
          <summary>
            <FaIcon name="book" /> Resources
          </summary>
          <div>
            <a href="#week-6">Week 6 · Project V1 <FaIcon name="explore" /></a>
            <a href="https://github.com/sd7777777/data-visualization-student-starter/blob/main/docs/PROJECT_DIRECTION.md">
              Project proposal <FaIcon name="external" />
            </a>
            <a href="./downloads/part-d-prescriber-source.zip" download>
              Download source files <FaIcon name="download" />
            </a>
            <a href="#scroll-story">
              Guided overview <FaIcon name="book" />
            </a>
            <a href="#task-analysis">
              Project tasks <FaIcon name="tasks" />
            </a>
            <a href="#validation">
              Validation plan <FaIcon name="validate" />
            </a>
            <a href="#data">
              Data &amp; methodology <FaIcon name="data" />
            </a>
          </div>
        </details>
        <a
          className="source-link"
          href="https://data.cms.gov/provider-summary-by-type-of-service/medicare-part-d-prescribers/medicare-part-d-prescribers-by-provider"
          target="_blank"
          rel="noreferrer"
        >
          CMS data <FaIcon name="external" />
        </a>
      </nav>
    </header>
  );
}
