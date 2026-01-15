import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listStations } from "@/services/station.service";
import { listCams } from "@/services/cam.service";
import type { IStation } from "@/models/station.model";
import type { ISite } from "@/models/site.model";
import type { ICam } from "@/models/cam.model";
import { useSites } from "@/hooks/useSites";
import { cn } from "@/lib/utils";
import { SiteMarker } from "./SiteMarker";

interface SearchBarProps {
  className?: string;
  disabled: boolean;
}

type SearchResult =
  | { type: "station"; item: IStation }
  | { type: "site"; item: ISite }
  | { type: "webcam"; item: ICam };

export function SearchBar({ className, disabled }: SearchBarProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [stations, setStations] = useState<IStation[]>([]);
  const [webcams, setWebcams] = useState<ICam[]>([]);
  const { sites } = useSites();
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load stations and webcams on mount
  useEffect(() => {
    const loadData = async () => {
      const stationsData = await listStations(false);
      if (stationsData) {
        setStations(stationsData);
      }
      const webcamsData = await listCams();
      if (webcamsData) {
        setWebcams(webcamsData);
      }
    };
    void loadData();
  }, []);

  // Filter stations, webcams, and sites based on query
  useEffect(() => {
    if (!query.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      setSelectedIndex(-1);
      return;
    }

    const lowerQuery = query.toLowerCase();

    // Filter stations
    const filteredStations: SearchResult[] = stations
      .filter((station) => station.name.toLowerCase().includes(lowerQuery))
      .map((station) => ({ type: "station" as const, item: station }));

    // Filter sites
    const filteredSites: SearchResult[] = sites
      .filter(
        (site) =>
          !site.isDisabled && site.name.toLowerCase().includes(lowerQuery)
      )
      .map((site) => ({ type: "site" as const, item: site }));

    const filteredWebcams: SearchResult[] = webcams
      .filter((cam) => cam.name.toLowerCase().includes(lowerQuery))
      .map((cam) => ({ type: "webcam" as const, item: cam }));

    // Combine and limit results
    const combined = [...filteredStations, ...filteredSites, ...filteredWebcams]
      .sort((a, b) => a.item.name.localeCompare(b.item.name))
      .slice(0, 8);

    setResults(combined);
    setSelectedIndex(-1);
  }, [query, stations, sites, webcams]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
        setQuery("");
        setResults([]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = useCallback(() => {
    if (isExpanded) {
      setIsExpanded(false);
      setQuery("");
      setResults([]);
      setSelectedIndex(-1);
    } else {
      setIsExpanded(true);
    }
  }, [isExpanded]);

  const handleClear = useCallback(() => {
    setQuery("");
    setResults([]);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  }, []);

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      setIsExpanded(false);
      setQuery("");
      setResults([]);
      setSelectedIndex(-1);
      if (result.type === "station") {
        navigate(`/stations/${result.item._id}`);
      } else if (result.type === "site") {
        navigate(`/sites/${result.item._id}`);
      } else {
        navigate(`/webcams/${result.item._id}`);
      }
    },
    [navigate]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsExpanded(false);
        setQuery("");
        setResults([]);
        setSelectedIndex(-1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Enter" && results.length > 0) {
        e.preventDefault();
        const index = selectedIndex >= 0 ? selectedIndex : 0;
        handleResultClick(results[index]);
      }
    },
    [results, selectedIndex, handleResultClick]
  );

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        className={cn(
          "flex items-center bg-background border rounded-md shadow-sm transition-all duration-200 h-9",
          isExpanded ? "w-[200px] sm:w-[250px]" : "w-9",
          disabled ? "opacity-50 pointer-events-none" : ""
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggle}
          className="h-9 w-9"
          disabled={disabled}
        >
          <Search className="h-4 w-4 opacity-70" />
        </Button>

        {isExpanded && (
          <>
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search stations, sites & cams"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-9 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
            />
            {query && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-9 w-9 p-0 shrink-0"
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
                "w-full px-3 py-2 text-left text-sm transition-colors truncate",
                index === selectedIndex ? "bg-accent" : "hover:bg-accent/50"
              )}
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 shrink-0">
                  {result.type === "station" ? (
                    <img
                      src="/gold-valid-arrow-light-green.png"
                      alt="Station"
                      className="w-4 h-6 -rotate-45"
                    />
                  ) : result.type === "site" ? (
                    <SiteMarker
                      validBearings={result.item.validBearings}
                      size={24}
                      borderWidth={4}
                    />
                  ) : (
                    <Camera className="w-5 h-5" />
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
          <div className="px-3 py-2 text-sm text-muted-foreground">
            No results found
          </div>
        </div>
      )}
    </div>
  );
}
