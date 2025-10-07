import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Clock, Users, ChefHat, Tag, AlertCircle, RefreshCw, User, Eye, Heart } from 'lucide-react';
import { getRecipes, getTags, searchRecipes } from '../../../lib/api';
import type { Recipe, Tag as TagType, RecipeSearchParams } from '../../../types';

const Browse = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'title' | 'createdAt' | 'servings' | 'calories'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch tags
  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: getTags,
  });

  // Fetch recipes
  const { data: recipesData, isLoading, error } = useQuery({
    queryKey: ['recipes', debouncedSearch, selectedTags, sortBy, sortOrder, currentPage],
    queryFn: () => {
      const params: RecipeSearchParams = {
        page: currentPage,
        limit: 12,
        sort: sortBy,
        order: sortOrder,
      };

      if (debouncedSearch) {
        return searchRecipes(debouncedSearch, {
          ...params,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
        });
      } else {
        return getRecipes({
          ...params,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
        });
      }
    },
  });

  const recipes = recipesData?.recipes || [];
  const totalPages = recipesData?.totalPages || 1;
  const total = recipesData?.total || 0;

  const handleTagToggle = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName)
        ? prev.filter(tag => tag !== tagName)
        : [...prev, tagName]
    );
    setCurrentPage(1);
  };

  const handleSortChange = (newSort: typeof sortBy) => {
    if (newSort === sortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSort);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Browse Recipes</h1>
          <p className="mt-2 text-muted-foreground">
            Discover recipes from our collection
            {(searchQuery || selectedTags.length > 0 || sortBy !== 'createdAt' || sortOrder !== 'desc') && (() => {
              const activeFiltersCount = [
                searchQuery ? 1 : 0,
                selectedTags.length,
                (sortBy !== 'createdAt' || sortOrder !== 'desc') ? 1 : 0,
              ].reduce((sum, count) => sum + count, 0);
              return (
                <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} active
                </span>
              );
            })()}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Unable to load recipes</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              We encountered an error while loading the recipes. This might be a temporary network issue or the service might be unavailable.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </button>
              <Link
                to="/"
                className="inline-flex items-center px-4 py-2 border border-input rounded-md bg-background hover:bg-muted transition-colors"
              >
                Go Home
              </Link>
            </div>
            <details className="mt-6 text-left">
              <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                Error details
              </summary>
              <pre className="mt-2 p-3 bg-muted rounded text-xs text-muted-foreground overflow-x-auto">
                {error instanceof Error ? error.message : 'Unknown error occurred'}
              </pre>
            </details>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Browse Recipes</h1>
        <p className="mt-2 text-muted-foreground">
          Discover recipes from our collection
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          />
        </div>

        {/* Tags Filter */}
        {tags.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter by tags:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.slice(0, 10).map((tag: TagType) => (
                <button
                  key={tag.id}
                  onClick={() => handleTagToggle(tag.name)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    selectedTags.includes(tag.name)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-muted hover:bg-muted'
                  }`}
                >
                  {tag.name} ({tag.count})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sort Options */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium">Sort by:</span>
            <div className="flex space-x-2">
              {[
                { key: 'createdAt', label: 'Date' },
                { key: 'title', label: 'Title' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handleSortChange(key as typeof sortBy)}
                  className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                    sortBy === key
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-muted hover:bg-muted'
                  }`}
                >
                  {label} {sortBy === key && (sortOrder === 'desc' ? '↓' : '↑')}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Clear filters button */}
            {(searchQuery || selectedTags.length > 0 || sortBy !== 'createdAt' || sortOrder !== 'desc') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTags([]);
                  setSortBy('createdAt');
                  setSortOrder('desc');
                  setCurrentPage(1);
                }}
                className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground border border-muted hover:bg-muted rounded-md transition-colors"
              >
                Clear filters
              </button>
            )}

            {total > 0 && (
              <span className="text-sm text-muted-foreground">
                {total} recipe{total !== 1 ? 's' : ''} found
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Recipes Grid */}
      {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-lg border bg-card overflow-hidden">
              <div className="p-6 space-y-4">
                {/* Title skeleton */}
                <div className="h-6 bg-muted rounded animate-pulse"></div>
                {/* Meta skeleton */}
                <div className="flex items-center space-x-4">
                  <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
                  <div className="h-4 bg-muted rounded w-16 animate-pulse"></div>
                </div>
                {/* Tags skeleton */}
                <div className="flex gap-2">
                  <div className="h-5 bg-muted rounded-full w-16 animate-pulse"></div>
                  <div className="h-5 bg-muted rounded-full w-20 animate-pulse"></div>
                  <div className="h-5 bg-muted rounded-full w-14 animate-pulse"></div>
                </div>
                {/* Date skeleton */}
                <div className="h-3 bg-muted rounded w-24 animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <ChefHat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No recipes found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || selectedTags.length > 0
              ? 'Try adjusting your search or filters'
              : 'Be the first to submit a recipe!'}
          </p>
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Submit a Recipe
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe: Recipe) => (
              <Link
                key={recipe.id}
                to={`/recipe/${recipe.id}`}
                className="group rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <h3 className="text-lg font-semibold group-hover:text-primary transition-colors line-clamp-2">
                    {recipe.title}
                  </h3>

                  {/* Author attribution */}
                  {recipe.author && (
                    <div className="flex items-center space-x-1 mt-2 text-sm text-muted-foreground">
                      <User className="h-3 w-3" />
                      <Link
                        to={`/profile/${recipe.author.id}`}
                        className="hover:text-primary transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        by {recipe.author.name}
                      </Link>
                    </div>
                  )}

                  {/* Popularity indicators */}
                  {recipe.popularity && (
                    <div className="flex items-center space-x-3 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Eye className="h-3 w-3" />
                        <span>{recipe.popularity.views} views</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Heart className="h-3 w-3" />
                        <span>{recipe.popularity.likes}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-4 mt-3 text-sm text-muted-foreground">
                    {recipe.servings && (
                      <div className="flex items-center space-x-1">
                        <Users className="h-3 w-3" />
                        <span>{recipe.servings} servings</span>
                      </div>
                    )}
                    {recipe.totalTimeMin && (
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{recipe.totalTimeMin} min</span>
                      </div>
                    )}
                  </div>

                  {recipe.tags && recipe.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {recipe.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {recipe.tags.length > 3 && (
                        <span className="px-2 py-1 text-xs text-muted-foreground">
                          +{recipe.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-4 text-xs text-muted-foreground">
                    Added {formatDate(recipe.createdAt)}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-input rounded-md bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <span className="px-3 py-2 text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-input rounded-md bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Browse;
