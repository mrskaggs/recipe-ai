import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Clock, Users, ChefHat, Tag, Loader2 } from 'lucide-react';
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
          </p>
        </div>
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-red-500">Error loading recipes. Please try again.</p>
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
        <div className="flex items-center justify-between">
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

          {total > 0 && (
            <span className="text-sm text-muted-foreground">
              {total} recipe{total !== 1 ? 's' : ''} found
            </span>
          )}
        </div>
      </div>

      {/* Recipes Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
