import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, X, Camera } from 'lucide-react';
import Fuse from 'fuse.js';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SiteMarker } from './SiteMarker';
import { LandingMarker } from './LandingMarker';
import { StationMarker } from './StationMarker';

import type { WindUnit } from '../station';

import { cn } from '@/lib/utils';
import { useAppContext } from '@/context/AppContext';
import type { SearchResult } from './map.types';
import {
  useStations,
  useWebcams,
  useSites,
  useLandings,
  useSoundings,
  usePersistedState
} from '@/hooks';

interface SearchBarProps {
  className?: string;
  disabled: boolean;
  onSelect: (result: SearchResult) => void;
}

export function SearchBar({ className, disabled, onSelect }: SearchBarProps) {
  const [unit] = usePersistedState<WindUnit>('unit', 'kmh');
  const { sport } = useAppContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const { stations } = useStations();
  const { webcams } = useWebcams();
  const { sites } = useSites();
  const { landings } = useLandings();
  const { soundings } = useSoundings();
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fuse = useMemo(() => {
    const all: SearchResult[] = [
      ...stations.filter((s) => !s.isDisabled).map((s) => ({ type: 'station' as const, item: s })),
      ...sites.filter((s) => !s.isDisabled).map((s) => ({ type: 'site' as const, item: s })),
      ...landings.filter((l) => !l.isDisabled).map((l) => ({ type: 'landing' as const, item: l })),
      ...webcams.filter((w) => !w.isDisabled).map((w) => ({ type: 'webcam' as const, item: w })),
      ...soundings.map((s) => ({ type: 'sounding' as const, item: s }))
    ];
    return new Fuse(all, { keys: ['item.name'], threshold: 0.3, includeScore: true });
  }, [stations, sites, landings, webcams, soundings]);

  // Fuzzy search across all item types
  useEffect(() => {
    if (!query.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults((prev) => (prev.length === 0 ? prev : []));
      setSelectedIndex(-1);
      return;
    }

    const normalize = (s: string) => s.replace(/[^a-z0-9]/gi, '').toLowerCase();
    // Prefix matches first, then by type priority within each tier
    const typeOrder: Record<SearchResult['type'], number> = {
      station: 0,
      webcam: 1,
      sounding: 2,
      site: 3,
      landing: 4
    };
    const normalizedQuery = normalize(query);

    const fuseResults = fuse.search(query, { limit: 20 });
    const rank = (r: (typeof fuseResults)[number]) => ({
      prefix: normalize(r.item.item.name).startsWith(normalizedQuery) ? 0 : 1,
      type: typeOrder[r.item.type]
    });

    const matches = fuseResults
      .sort((a, b) => {
        const ra = rank(a),
          rb = rank(b);
        return ra.prefix - rb.prefix || ra.type - rb.type;
      })
      .map((r) => r.item)
      .slice(0, 5);

    setResults(matches);
    setSelectedIndex(-1);
  }, [query, fuse]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
        setQuery('');
        setResults([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = useCallback(() => {
    if (isExpanded) {
      setIsExpanded(false);
      setQuery('');
      setResults([]);
      setSelectedIndex(-1);
    } else {
      setIsExpanded(true);
    }
  }, [isExpanded]);

  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  }, []);

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      setIsExpanded(false);
      setQuery('');
      setResults([]);
      setSelectedIndex(-1);
      onSelect(result);
    },
    [onSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExpanded(false);
        setQuery('');
        setResults([]);
        setSelectedIndex(-1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault();
        const index = selectedIndex >= 0 ? selectedIndex : 0;
        handleResultClick(results[index]);
      }
    },
    [results, selectedIndex, handleResultClick]
  );

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        className={cn(
          'flex items-center bg-background border rounded-md shadow-sm transition-all duration-200 h-9',
          isExpanded ? 'w-50 sm:w-62.5' : 'w-9',
          disabled ? 'opacity-50 pointer-events-none' : ''
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggle}
          className="h-9 w-9 hover:bg-transparent"
          disabled={disabled}
        >
          <Search className="h-4 w-4 opacity-70" />
        </Button>

        {isExpanded && (
          <>
            <Input
              ref={inputRef}
              type="text"
              placeholder={'Search...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-9 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
            />
            {query && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-9 w-9 p-0 shrink-0 hover:bg-transparent cursor-pointer"
              >
                <X className="h-4 w-4 opacity-70" />
              </Button>
            )}
          </>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isExpanded && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg overflow-hidden z-50">
          {results.map((result, index) => (
            <button
              key={`${result.type}-${result.item._id}`}
              onClick={() => handleResultClick(result)}
              className={cn(
                'w-full px-3 py-2 text-left text-sm transition-colors truncate',
                index === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'
              )}
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 shrink-0 marker gust-label-hidden">
                  {result.type === 'station' ? (
                    <StationMarker
                      speed={result.item.currentAverage ?? undefined}
                      gust={result.item.currentGust ?? undefined}
                      bearing={result.item.currentBearing ?? undefined}
                      unit={unit}
                      validBearings={result.item.validBearings ?? undefined}
                      size={30}
                      isOffline={result.item.isOffline}
                      sport={sport}
                    />
                  ) : result.type === 'site' ? (
                    <SiteMarker
                      validBearings={result.item.validBearings ?? undefined}
                      isOfficial={result.item.siteGuideUrl ? true : false}
                      size={24}
                      borderWidth={4}
                    />
                  ) : result.type === 'landing' ? (
                    <LandingMarker
                      size={24}
                      borderWidth={4}
                      isOfficial={result.item.siteGuideUrl ? true : false}
                    />
                  ) : result.type === 'webcam' ? (
                    <Camera className="w-5 h-5 scale-90" />
                  ) : (
                    <svg viewBox="0 0 18 18" className="w-5 h-5 opacity-70 scale-60">
                      <g transform="rotate(-90, 9, 9)">
                        <path d="m18,2.47l-9,6.53l-4.38,-4.38l-4.62,3.38l0,-2.48l4.83,-3.52l4.38,4.38l8.79,-6.38m0,12l-4.7,0l-4.17,3.34l-6.13,-5.93l-3,2.13l0,2.46l2.8,-2l6.2,6l5,-4l4,0l0,-2z" />
                      </g>
                    </svg>
                  )}
                </div>
                <span className="truncate">{result.item.name}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {isExpanded && query.trim() && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg overflow-hidden z-50">
          <div className="px-3 py-2 text-sm text-muted-foreground">No results found</div>
        </div>
      )}
    </div>
  );
}
