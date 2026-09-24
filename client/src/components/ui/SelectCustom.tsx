import { useState, useRef, useEffect, forwardRef } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectCustomProps {
  id?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
}

export const SelectCustom = forwardRef<HTMLDivElement, SelectCustomProps>(
  (
    { id, options, value, onChange, placeholder = 'Select an option...', disabled = false, searchable = false, className = '' },
    ref
  ) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const selectedOption = options.find(opt => opt.value === value);
    const filteredOptions = searchable
      ? options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()))
      : options;

    // Close on outside click
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (val: string) => {
      onChange?.(val);
      setOpen(false);
      setSearch('');
    };

    return (
      <div ref={ref} className={`relative w-full ${className}`}>
        <button
          ref={buttonRef}
          id={id}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(!open)}
          className={[
            'w-full h-input px-4 flex items-center justify-between rounded-input border transition-all duration-200',
            'bg-white text-sm font-medium',
            open ? 'border-primary-400 ring-2 ring-primary-100' : 'border-border hover:border-gray-300',
            disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'cursor-pointer text-gray-900',
          ].join(' ')}
        >
          <span className="flex-1 text-left truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            size={16}
            className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''} ${
              disabled ? 'text-gray-300' : 'text-gray-400'
            }`}
          />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute top-full mt-2 w-full bg-surface rounded-input border border-border shadow-lg z-50">
            {/* Search input */}
            {searchable && (
              <div className="p-2 border-b border-border">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* Options */}
            <ul className="max-h-64 overflow-y-auto py-1">
              {filteredOptions.length === 0 ? (
                <li className="px-4 py-2 text-sm text-gray-400">No options found</li>
              ) : (
                filteredOptions.map(option => (
                  <li key={option.value}>
                    <button
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={[
                        'w-full px-4 py-2 text-left text-sm font-medium transition-colors duration-150 flex items-center justify-between',
                        value === option.value
                          ? 'bg-primary-50 text-primary-600'
                          : 'text-gray-900 hover:bg-gray-50',
                      ].join(' ')}
                    >
                      {option.label}
                      {value === option.value && <Check size={14} className="text-primary-600" />}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
    );
  }
);

SelectCustom.displayName = 'SelectCustom';
