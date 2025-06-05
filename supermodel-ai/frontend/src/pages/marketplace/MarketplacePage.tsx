// src/pages/marketplace/MarketplacePage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useSkillPackStore } from '../../store/skillPackStore';
import { SkillPack, SkillPackFilters } from '../../types';
import { ShoppingCartIcon, StarIcon, ArrowDownCircleIcon, AdjustmentsHorizontalIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

// Placeholder SkillPackCard
const SkillPackCard: React.FC<{skillPack: SkillPack, onAcquire: (id: string) => void, onViewDetails: (id: string) => void, isAcquiring: boolean}> =
({skillPack, onAcquire, onViewDetails, isAcquiring}) => (
    <div className="bg-white dark:bg-neutral-800 shadow-lg rounded-xl p-5 flex flex-col justify-between transition-all hover:shadow-2xl transform hover:-translate-y-1">
        <div>
            <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold text-primary-600 dark:text-primary-400 mb-1">{skillPack.name}</h3>
                {skillPack.category && <span className="text-xs bg-secondary-100 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-200 px-2 py-0.5 rounded-full">{skillPack.category}</span>}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                By: <span className="font-medium">{skillPack.author_username || 'Unknown Author'}</span> | v{skillPack.version}
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-3 h-20 overflow-hidden line-clamp-4">{skillPack.description || "No description available."}</p>
            <div className="flex items-center text-sm text-neutral-500 dark:text-neutral-400 mb-3 space-x-3">
                <span className="flex items-center"><StarIcon className="h-5 w-5 text-yellow-400 mr-1"/> {skillPack.rating?.toFixed(1) || 'N/A'}</span>
                <span className="flex items-center"><ArrowDownCircleIcon className="h-5 w-5 text-green-500 mr-1"/> {skillPack.download_count || 0}</span>
            </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center mt-4 space-y-2 sm:space-y-0 sm:space-x-2">
            <span className="text-lg font-semibold text-secondary-600 dark:text-secondary-400">{skillPack.price_credits === 0 ? "Free" : `${skillPack.price_credits} Credits`}</span>
            <div className="flex space-x-2">
                <button onClick={() => onViewDetails(skillPack.id)} className="px-3 py-1.5 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 text-xs rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700">
                    Details
                </button>
                <button
                    onClick={() => onAcquire(skillPack.id)}
                    className="px-3 py-1.5 bg-primary-500 text-white text-xs rounded-md hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed flex items-center"
                    disabled={skillPack.isOwned || isAcquiring}
                >
                    {isAcquiring ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div> : null}
                    {skillPack.isOwned ? "Owned" : (isAcquiring ? "Acquiring..." : "Acquire")}
                </button>
            </div>
        </div>
    </div>
);

// Placeholder Filter Panel
const FilterPanel: React.FC<{ currentFilters: SkillPackFilters, onFilterChange: (filters: Partial<SkillPackFilters>) => void }> =
({ currentFilters, onFilterChange }) => {
    const [searchTerm, setSearchTerm] = useState(currentFilters.searchQuery || '');
    const [category, setCategory] = useState(currentFilters.category || '');
    // Add more local state for other filters like sortBy, sortOrder

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        onFilterChange({ searchQuery: searchTerm, category });
    };

    const clearFilters = () => {
        setSearchTerm('');
        setCategory('');
        onFilterChange({ searchQuery: undefined, category: undefined });
    };

    return (
        <form onSubmit={handleSearch} className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg shadow-md mb-6 space-y-4 sm:space-y-0 sm:flex sm:space-x-4 sm:items-end">
            <div className="flex-grow">
                <label htmlFor="search" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Search</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                    </div>
                    <input type="text" id="search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                           className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-neutral-300 dark:border-neutral-600 rounded-md dark:bg-neutral-700 dark:text-white"
                           placeholder="Search skill packs..."/>
                </div>
            </div>
            <div className="flex-shrink-0">
                <label htmlFor="category" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Category</label>
                <select id="category" value={category} onChange={e => setCategory(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-neutral-300 dark:border-neutral-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-neutral-700 dark:text-white">
                    <option value="">All</option>
                    <option value="coding">Coding</option>
                    <option value="writing">Writing</option>
                    <option value="data_analysis">Data Analysis</option>
                    {/* Add more categories */}
                </select>
            </div>
            <div className="flex items-end space-x-2">
                <button type="submit" className="px-4 py-2 bg-primary-500 text-white text-sm rounded-md hover:bg-primary-600">Apply</button>
                <button type="button" onClick={clearFilters} title="Clear Filters" className="p-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md">
                    <XMarkIcon className="h-5 w-5"/>
                </button>
            </div>
            {/* Add Sort By dropdown here later */}
        </form>
    );
};


const MarketplacePage: React.FC = () => {
  const {
    marketplaceSkillPacks, isLoadingMarketplace, error,
    fetchMarketplaceSkillPacks, acquireSkillPack,
    marketplaceFilters, setMarketplaceFilters, marketplacePagination
  } = useSkillPackStore();

  const [isAcquiringId, setIsAcquiringId] = useState<string | null>(null); // To show loading on specific card

  useEffect(() => {
    fetchMarketplaceSkillPacks(); // Initial fetch with default filters/page
  }, [fetchMarketplaceSkillPacks]);

  const handleAcquire = async (skillPackId: string) => {
    setIsAcquiringId(skillPackId);
    try {
      await acquireSkillPack(skillPackId);
      // Success/error handled by store or can be shown via notifications
    } catch (e) {
      console.error("Acquisition error", e); // Store should handle error state
    } finally {
      setIsAcquiringId(null);
    }
  };

  const handleViewDetails = (skillPackId: string) => {
    // Placeholder: Navigate to a skill pack detail page
    alert(`View details for Skill Pack ID: ${skillPackId} (Not implemented yet)`);
    // navigate(`/marketplace/skill-pack/${skillPackId}`);
  };

  const handlePageChange = (newPage: number) => {
    fetchMarketplaceSkillPacks(marketplaceFilters, newPage);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mb-4 sm:mb-0">
            <ShoppingBagIcon className="h-8 w-8 inline-block mr-3 text-primary-600 dark:text-primary-400" />
            Skill Pack Marketplace
        </h1>
        {/* Placeholder for "My Credits" or other info */}
      </div>

      <FilterPanel currentFilters={marketplaceFilters} onFilterChange={setMarketplaceFilters} />

      {isLoadingMarketplace && marketplaceSkillPacks.length === 0 && <p className="text-center text-lg py-10">Loading skill packs...</p>}
      {error && <p className="text-center text-red-500 py-10">Error: {error}</p>}

      {!isLoadingMarketplace && marketplaceSkillPacks.length === 0 && !error && (
        <p className="text-center text-neutral-500 dark:text-neutral-400 text-lg py-10">
            No skill packs found matching your criteria. Try adjusting your filters.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {marketplaceSkillPacks.map((pack) => (
          <SkillPackCard
            key={pack.id}
            skillPack={pack}
            onAcquire={handleAcquire}
            onViewDetails={handleViewDetails}
            isAcquiring={isAcquiringId === pack.id}
          />
        ))}
      </div>

      {!isLoadingMarketplace && marketplacePagination.totalPages > 1 && (
         <div className="flex justify-center items-center space-x-2 mt-8 py-4">
            <button onClick={() => handlePageChange(marketplacePagination.page - 1)} disabled={marketplacePagination.page <= 1}
                    className="px-4 py-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100 rounded-md hover:bg-neutral-300 dark:hover:bg-neutral-600 disabled:opacity-50 text-sm font-medium">
                &larr; Previous
            </button>
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
                Page {marketplacePagination.page} of {marketplacePagination.totalPages} (Total: {marketplacePagination.totalItems})
            </span>
            <button onClick={() => handlePageChange(marketplacePagination.page + 1)} disabled={marketplacePagination.page >= marketplacePagination.totalPages}
                    className="px-4 py-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100 rounded-md hover:bg-neutral-300 dark:hover:bg-neutral-600 disabled:opacity-50 text-sm font-medium">
                Next &rarr;
            </button>
        </div>
      )}
    </div>
  );
};
export default MarketplacePage;
