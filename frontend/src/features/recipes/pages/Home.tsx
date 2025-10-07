import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChefHat, Search, Eye, User, TrendingUp, Clock, Heart, Star } from 'lucide-react';
import { getRecipes } from '../../../lib/api';
import type { Recipe } from '../../../types';

const Home = () => {
  const [activeTab, setActiveTab] = useState<'popular' | 'recent'>('popular');

  // Fetch popular recipes (sorted by view_count desc)
  const { data: popularData, isLoading: popularLoading } = useQuery({
    queryKey: ['recipes', { sort: 'view_count', order: 'desc', limit: 4 }],
    queryFn: () => getRecipes({ sort: 'view_count', order: 'desc', limit: 4 }),
  });

  // Fetch recent recipes (sorted by createdAt desc)
  const { data: recentData, isLoading: recentLoading } = useQuery({
    queryKey: ['recipes', { sort: 'createdAt', order: 'desc', limit: 4 }],
    queryFn: () => getRecipes({ sort: 'createdAt', order: 'desc', limit: 4 }),
  });

  const popularRecipes = popularData?.recipes || [];
  const recentRecipes = recentData?.recipes || [];

  const RecipeCard = ({ recipe }: { recipe: Recipe }) => (
    <Link
      to={`/recipe/${recipe.id}`}
      className="group rounded-lg border bg-card overflow-hidden hover:shadow-md transition-all duration-200"
    >
      <div className="p-6">
        <h4 className="text-lg font-semibold group-hover:text-primary transition-colors line-clamp-2 mb-2">
          {recipe.title}
        </h4>

        {/* Author attribution */}
        {recipe.author && (
          <div className="flex items-center space-x-2 mb-3">
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <User className="h-3 w-3" />
              <Link
                to={`/profile/${recipe.author.id}`}
                className="hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                by {recipe.author.name}
              </Link>
            </div>
          </div>
        )}

        {/* Popularity metrics */}
        {recipe.popularity && (
          <div className="flex items-center space-x-4 mb-3 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Eye className="h-3 w-3" />
              <span>{recipe.popularity.views} views</span>
            </div>
            <div className="flex items-center space-x-1">
              <Heart className="h-3 w-3" />
              <span>{recipe.popularity.likes}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Star className="h-3 w-3" />
              <span>{recipe.popularity.favorites}</span>
            </div>
          </div>
        )}

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {recipe.tags.slice(0, 2).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded"
              >
                {tag}
              </span>
            ))}
            {recipe.tags.length > 2 && (
              <span className="px-2 py-1 text-xs text-muted-foreground">
                +{recipe.tags.length - 2} more
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );

  const RecipeGridSkeleton = () => (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-lg border bg-card p-6 space-y-3">
          <div className="h-6 bg-muted rounded animate-pulse"></div>
          <div className="flex items-center space-x-2">
            <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
          </div>
          <div className="flex space-x-4">
            <div className="h-3 bg-muted rounded w-12 animate-pulse"></div>
            <div className="h-3 bg-muted rounded w-10 animate-pulse"></div>
            <div className="h-3 bg-muted rounded w-8 animate-pulse"></div>
          </div>
          <div className="flex gap-1">
            <div className="h-5 bg-muted rounded w-16 animate-pulse"></div>
            <div className="h-5 bg-muted rounded w-12 animate-pulse"></div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <ChefHat className="h-16 w-16 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Welcome to Recipe AI</h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Discover, create, and share amazing recipes powered by AI.
          Submit your recipes and let our AI process them into structured, searchable formats.
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/browse"
          className="group rounded-lg border bg-card p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-semibold">Browse Recipes</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Explore our collection of recipes with powerful search and filtering capabilities.
          </p>
        </Link>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Eye className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Recipe Details</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            View detailed recipes with ingredients, instructions, nutrition info, and print-friendly formats.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center space-x-2 mb-4">
            <ChefHat className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">AI Processing</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Our AI automatically parses ingredients, calculates nutrition, and structures your recipes.
          </p>
        </div>
      </div>

      {/* Popular & Recent Recipes Section */}
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex items-center space-x-8 border-b">
          <button
            onClick={() => setActiveTab('popular')}
            className={`flex items-center space-x-2 pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'popular'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Popular Recipes</span>
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex items-center space-x-2 pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'recent'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Recent Recipes</span>
          </button>
        </div>

        {/* Recipe Content */}
        <div className="min-h-[400px]">
          {activeTab === 'popular' && (
            <div>
              {popularLoading ? (
                <RecipeGridSkeleton />
              ) : popularRecipes.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No popular recipes yet</h3>
                  <p className="text-muted-foreground">Recipes will appear here once they get views!</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold">Most Popular Recipes</h3>
                    <Link
                      to="/browse?sort=view_count"
                      className="text-sm text-primary hover:underline flex items-center space-x-1"
                    >
                      <span>View all</span>
                      <Eye className="h-3 w-3" />
                    </Link>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {popularRecipes.map((recipe) => (
                      <RecipeCard key={recipe.id} recipe={recipe} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'recent' && (
            <div>
              {recentLoading ? (
                <RecipeGridSkeleton />
              ) : recentRecipes.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No recipes yet</h3>
                  <p className="text-muted-foreground mb-4">Be the first to share a recipe!</p>
                  <Link
                    to="/submit"
                    className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  >
                    Submit a Recipe
                  </Link>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold">Latest Recipes</h3>
                    <Link
                      to="/browse?sort=createdAt"
                      className="text-sm text-primary hover:underline flex items-center space-x-1"
                    >
                      <span>View all</span>
                      <Search className="h-3 w-3" />
                    </Link>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {recentRecipes.map((recipe) => (
                      <RecipeCard key={recipe.id} recipe={recipe} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
