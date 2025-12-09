import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listStations } from "@/services/station.service";
import type { IStation } from "@/models/station.model";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  className?: string;
  disabled: boolean;
}

export function SearchBar({ className, disabled }: SearchBarProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IStation[]>([]);
  const [stations, setStations] = useState<IStation[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load stations on mount
  useEffect(() => {
    const loadStations = async () => {
      const data = await listStations(false);
      if (data) {
        setStations(data);
      }
    };
    void loadStations();
  }, []);

  // Filter stations based on query
  useEffect(() => {
    if (!query.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      setSelectedIndex(-1);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = stations
      .filter((station) => station.name.toLowerCase().includes(lowerQuery))
      .slice(0, 5);
    setResults(filtered);
    setSelectedIndex(-1);
  }, [query, stations]);

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
    (stationId: string) => {
      setIsExpanded(false);
      setQuery("");
      setResults([]);
      setSelectedIndex(-1);
      navigate(`/stations/${stationId}`);
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
        handleResultClick(results[index]._id);
      }
    },
    [results, selectedIndex, handleResultClick]
  );

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        className={cn(
          "flex items-center bg-background border rounded-md shadow-sm transition-all duration-200",
          isExpanded ? "w-[200px] sm:w-[250px]" : "w-9"
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggle}
          className="h-9 w-9 p-0 shrink-0"
          disabled={disabled}
        >
          <Search className="h-4 w-4 opacity-70" />
        </Button>

        {isExpanded && (
          <>
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search stations..."
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
          {results.map((station, index) => (
            <button
              key={station._id}
              onClick={() => handleResultClick(station._id)}
              className={cn(
                "w-full px-3 py-2 text-left text-sm transition-colors truncate",
                index === selectedIndex ? "bg-accent" : "hover:bg-accent/50"
              )}
            >
              {station.name}
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {isExpanded && query.trim() && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg overflow-hidden z-50">
          <div className="px-3 py-2 text-sm text-muted-foreground">
            No stations found
          </div>
        </div>
      )}
    </div>
  );
}
