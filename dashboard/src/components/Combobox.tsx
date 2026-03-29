'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, ChevronDown } from 'lucide-react';

export interface ComboboxOption {
  label: string;
  value: string;
  subtitle?: string;
}

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: ComboboxOption) => void;
  options: ComboboxOption[];
  onSearch: (query: string) => void;
  loading?: boolean;
  placeholder?: string;
  minChars?: number;
  className?: string;
  disabled?: boolean;
}

export default function Combobox({
  value,
  onChange,
  onSelect,
  options,
  onSearch,
  loading = false,
  placeholder = 'Buscar...',
  minChars = 3,
  className = '',
  disabled = false,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    setHighlighted(0);
  }, [options]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const q = e.target.value;
      onChange(q);
      setHighlighted(0);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (q.length >= minChars) {
        debounceRef.current = setTimeout(() => {
          onSearch(q);
          setOpen(true);
        }, 300);
      } else {
        setOpen(false);
      }
    },
    [onChange, onSearch, minChars]
  );

  const handleSelect = (item: ComboboxOption) => {
    onSelect(item);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (options[highlighted]) handleSelect(options[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => value.length >= minChars && options.length > 0 && setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="input-field w-full pr-8"
          autoComplete="off"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <ChevronDown size={14} />}
        </div>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-4 text-sm text-gray-400 gap-2">
              <Loader2 size={14} className="animate-spin" /> Buscando...
            </div>
          )}
          {!loading && options.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-400">Nenhum resultado encontrado</p>
          )}
          {!loading &&
            options.map((opt, i) => (
              <button
                key={opt.value}
                type="button"
                onMouseDown={() => handleSelect(opt)}
                className={`w-full text-left px-4 py-2.5 flex flex-col transition-colors ${
                  i === highlighted ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-800'
                }`}
              >
                <span className="text-sm font-medium">{opt.label}</span>
                {opt.subtitle && <span className="text-xs text-gray-400">{opt.subtitle}</span>}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
