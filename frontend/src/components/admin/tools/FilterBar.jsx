import { memo } from 'react';
import { Search, ChevronDown } from 'lucide-react';

/**
 * FilterBar - Reusable filter bar component with search and dropdown filters
 * Optimized for performance with memoization
 */
const FilterBar = memo(({
  description,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  filters = [],
  actionButton
}) => {
  return (
    <div className="p-4 border-b border-gray-100">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-sm text-gray-500">{description}</p>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 min-w-0 sm:w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-9 pl-9 pr-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Filters */}
          {filters.map((filter) => (
            <FilterDropdown
              key={filter.id}
              value={filter.value}
              onChange={filter.onChange}
              options={filter.options}
              placeholder={filter.placeholder}
            />
          ))}

          {/* Action Button */}
          {actionButton}
        </div>
      </div>
    </div>
  );
});

/**
 * FilterDropdown - Individual filter dropdown component
 */
const FilterDropdown = memo(({ value, onChange, options, placeholder }) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="appearance-none h-9 px-3 pr-8 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-sm"
    >
      <option value="all">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
  </div>
));

FilterBar.displayName = 'FilterBar';
FilterDropdown.displayName = 'FilterDropdown';

export { FilterBar, FilterDropdown };
export default FilterBar;
