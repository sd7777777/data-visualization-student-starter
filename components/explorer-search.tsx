'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createDiscoverySearch } from '@/lib/discovery-search';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  chapters,
  wonderModes,
  type WonderMode,
} from '@/lib/explorer-navigation';
import type { Area, Dataset } from '@/lib/prescriber';
import { scrollToSection } from '@/lib/scroll-to-section';
import { FaIcon } from './fa-icon';

export function ExplorerSearch({
  data,
  area,
  open,
  onOpenChange,
  onArea,
  onSelect,
  onMode,
}: {
  data: Dataset;
  area: Area;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onArea: (code: string) => void;
  onSelect: (name: string) => void;
  onMode: (mode: WonderMode) => void;
}) {
  const destination = useRef<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const search = useMemo(
    () =>
      createDiscoverySearch([
        ...chapters.map(([, label]) => ({ value: `chapter ${label}` })),
        ...wonderModes.map((mode) => ({
          value: `visual ${mode.name}`,
          keywords: [
            mode.alias,
            mode.description,
            mode.id === 'map' ? 'map geography usa united states' : mode.id,
          ],
        })),
        ...area.specialties.map((row) => ({
          value: `specialty ${row.specialty}`,
        })),
        ...data.areas.map((row) => ({
          value: `place ${row.name} ${row.code}`,
        })),
        {
          value: 'tool Comparison finder',
          keywords: [
            'similar states peers closest match contrasts differences',
          ],
        },
        {
          value: 'tool Field notebook',
          keywords: [
            'saved discoveries evidence notes cards images export bookmark',
          ],
        },
      ]),
    [area.specialties, data.areas],
  );
  const scores = useMemo(() => search(query), [query, search]);
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() === 'k' &&
        (event.metaKey || event.ctrlKey) &&
        !event.isComposing
      ) {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);
  function go(id: string, action?: () => void) {
    action?.();
    destination.current = id;
    onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        className="explorer-search-trigger"
        aria-label="Search the explorer"
        aria-keyshortcuts="Meta+k Control+k"
      >
        <FaIcon name="inspect" />
        <span>Search</span>
        <kbd>⌘ / Ctrl K</kbd>
      </DialogTrigger>
      <DialogContent
        className="explorer-command"
        initialFocus={input}
        finalFocus={() => {
          const id = destination.current;
          destination.current = null;
          if (!id) return true;
          const target = document.getElementById(id);
          if (target) {
            target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });
            scrollToSection(id);
          }
          return false;
        }}
      >
        <div className="explorer-command-heading">
          <FaIcon name="explore" />
          <div>
            <DialogTitle>Search the explorer</DialogTitle>
            <DialogDescription>
              Search sections, charts, specialties, geographies, and saved
              notes.
            </DialogDescription>
          </div>
        </div>
        <Command
          loop
          label="Search the explorer"
          filter={(value) => scores.get(value) ?? 0}
        >
          <CommandInput
            ref={input}
            value={query}
            onValueChange={setQuery}
            placeholder="Try California, cost, or state map…"
            aria-label="Search chapters, visuals, specialties, and places"
          />
          <CommandList>
            <CommandEmpty>
              No matches. Try a state name, specialty, or “map”.
            </CommandEmpty>
            <CommandGroup heading="Your discoveries">
              <CommandItem
                value="tool Comparison finder"
                onSelect={() => go('comparison-finder')}
              >
                <FaIcon name="compare" />
                <span>Comparison finder</span>
                <small>Similar places & contrasts</small>
              </CommandItem>
              <CommandItem
                value="tool Field notebook"
                onSelect={() => go('geo-evidence')}
              >
                <FaIcon name="bookmark" />
                <span>Field notebook</span>
                <small>Capture, save & export</small>
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Chapters">
              {chapters.map(([id, label, icon]) => (
                <CommandItem
                  key={id}
                  value={`chapter ${label}`}
                  onSelect={() => go(id)}
                >
                  <FaIcon name={icon} />
                  <span>{label}</span>
                  <small>Jump to chapter</small>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Charts">
              {wonderModes.map((mode) => (
                <CommandItem
                  key={mode.id}
                  value={`visual ${mode.name}`}
                  keywords={[
                    mode.description,
                    mode.id === 'map'
                      ? 'map geography usa united states'
                      : mode.id,
                  ]}
                  onSelect={() => go('wonder-stage', () => onMode(mode.id))}
                >
                  <FaIcon name={mode.icon} />
                  <span>{mode.name}</span>
                  <small>Open visual</small>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading={`Specialties · ${area.name}`}>
              {area.specialties.map((row) => (
                <CommandItem
                  key={row.specialty}
                  value={`specialty ${row.specialty}`}
                  onSelect={() =>
                    go('explorer-chart', () => onSelect(row.specialty))
                  }
                >
                  <FaIcon name="clinical" />
                  <span>{row.specialty}</span>
                  <small>Inspect</small>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Places · change the explorer geography">
              {data.areas.map((row) => (
                <CommandItem
                  key={row.code}
                  value={`place ${row.name} ${row.code}`}
                  onSelect={() => go('explorer-chart', () => onArea(row.code))}
                >
                  <FaIcon name="place" />
                  <span>{row.name}</span>
                  <small>{row.code}</small>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        <div className="explorer-command-foot">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> browse <kbd>↵</kbd> open
          </span>
          <span>
            <kbd>esc</kbd> close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
