import type { WonderMode } from '@/lib/explorer-navigation';

/** Decorative encoding sketches, never a second representation of the data. */
export function ViewGlyph({ mode }: { mode: WonderMode }) {
  return (
    <svg
      className="view-glyph"
      viewBox="0 0 120 54"
      aria-hidden="true"
      focusable="false"
    >
      {mode === 'map' && (
        <g stroke="var(--panel)" strokeWidth="2">
          <path
            fill="var(--teal)"
            d="M13 7 32 12 43 10 54 16 71 9 77 21 93 18 106 11 110 23 101 32 78 38 64 35 51 44 37 36 27 33 24 24Z"
          />
          <path fill="var(--orange)" d="M43 10 54 16 71 9 77 21 68 29 48 26Z" />
          <path fill="var(--navy)" d="M27 33 48 26 51 44 37 36Z" />
          <path
            fill="none"
            d="M32 12 35 25 24 24M48 26 48 37M77 21 78 38M92 20 88 35"
          />
        </g>
      )}
      {mode === 'mosaic' && (
        <g stroke="var(--panel)" strokeWidth="2">
          <rect x="8" y="5" width="51" height="44" fill="var(--teal)" />
          <rect x="59" y="5" width="30" height="27" fill="var(--navy)" />
          <rect x="59" y="32" width="30" height="17" fill="var(--orange)" />
          <rect x="89" y="5" width="23" height="18" fill="var(--gold)" />
          <rect x="89" y="23" width="23" height="26" fill="var(--muted)" />
        </g>
      )}
      {mode === 'skyline' && (
        <g>
          <path d="M6 48H114" stroke="var(--rule)" />
          <path d="M9 48V32H42V48M44 48V23H71V48" fill="var(--teal)" />
          <path d="M73 48V5H84V48" fill="var(--orange)" />
          <path d="M86 48V17H101V48M103 48V36H112V48" fill="var(--navy)" />
        </g>
      )}
      {mode === 'concentration' && (
        <g fill="none" strokeWidth="3">
          <path d="M8 6V48H111" stroke="var(--rule)" strokeWidth="1" />
          <path d="M8 48 30 42 50 29 75 18 110 6" stroke="var(--navy)" />
          <path d="M8 48 30 25 50 15 75 9 110 6" stroke="var(--teal)" />
          <path d="M8 48 30 13 50 9 75 7 110 6" stroke="var(--orange)" />
        </g>
      )}
      {mode === 'hex' && (
        <g>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <path
              key={i}
              transform={`translate(${20 + (i % 5) * 20 + (i > 4 ? 10 : 0)} ${i < 5 ? 17 : 35})`}
              d="M-9-5 0-10 9-5 9 5 0 10-9 5Z"
              fill={['var(--teal)', 'var(--navy)', 'var(--orange)'][i % 3]}
            />
          ))}
        </g>
      )}
      {mode === 'petals' && (
        <g>
          {[24, 60, 96].map((x, i) => (
            <g key={x} transform={`translate(${x} 27)`}>
              {[0, 90, 180, 270].map((angle, j) => (
                <ellipse
                  key={angle}
                  cx="0"
                  cy="-9"
                  rx="5"
                  ry={8 + ((i + j) % 3)}
                  transform={`rotate(${angle})`}
                  fill={
                    [
                      'var(--teal)',
                      'var(--orange)',
                      'var(--navy)',
                      'var(--gold)',
                    ][j]
                  }
                />
              ))}
            </g>
          ))}
        </g>
      )}
      {mode === 'ridges' && (
        <g strokeWidth="1.5">
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              transform={`translate(0 ${i * 12})`}
              d={`M8 24Q${28 + i * 10} 24 ${36 + i * 13} 7Q${45 + i * 14} -2 ${55 + i * 13} 16T112 24Z`}
              fill={['var(--teal)', 'var(--navy)', 'var(--orange)'][i]}
              fillOpacity=".28"
              stroke={['var(--teal)', 'var(--navy)', 'var(--orange)'][i]}
            />
          ))}
        </g>
      )}
      {mode === 'currents' && (
        <g fill="none">
          <path
            d="M9 36C45 36 72 14 110 14"
            stroke="var(--teal)"
            strokeWidth="13"
          />
          <path
            d="M9 13C45 13 72 41 110 41"
            stroke="var(--orange)"
            strokeWidth="9"
          />
          <path
            d="M9 23C45 23 72 30 110 30"
            stroke="var(--navy)"
            strokeWidth="5"
          />
        </g>
      )}
      {mode === 'orbit' && (
        <g fill="none" stroke="var(--rule)">
          <ellipse cx="60" cy="27" rx="44" ry="20" />
          <ellipse cx="60" cy="27" rx="25" ry="11" />
          <path d="M10 27H110M60 3V51" />
          {[
            [32, 13],
            [65, 9],
            [89, 35],
            [47, 40],
            [40, 24],
            [65, 29],
          ].map(([cx, cy], i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={i === 2 ? 5 : 3}
              fill={i === 2 ? 'var(--orange)' : 'var(--teal)'}
              stroke="none"
            />
          ))}
        </g>
      )}
      {mode === 'weave' && (
        <g fill="none" strokeWidth="2.5">
          <path d="M10 8 43 42 77 27 110 17" stroke="var(--orange)" />
          <path d="M10 23 43 12 77 42 110 39" stroke="var(--navy)" />
          <path d="M10 42 43 29 77 10 110 7" stroke="var(--teal)" />
          {[10, 43, 77, 110].map((x) => (
            <path
              key={x}
              d={`M${x} 4V49`}
              stroke="var(--rule)"
              strokeWidth="1"
            />
          ))}
        </g>
      )}
    </svg>
  );
}
