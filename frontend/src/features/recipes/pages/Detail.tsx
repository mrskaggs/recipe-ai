import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useReactToPrint } from 'react-to-print';
import {
  ArrowLeft,
  Clock,
  Users,
  ChefHat,
  Tag,
  Printer,
  Share2,
  Heart,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { getRecipe } from '../../../lib/api';
import { useFavorites, useToasts } from '../../../stores/recipeStore';
import PrintCard from '../../../components/PrintCard';

const RecipeDetail = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions' | 'nutrition'>('ingredients');
  const printRef = useRef<HTMLDivElement>(null);

  const { data: recipe, isLoading, error: _error } = useQuery({
    queryKey: ['recipe', id],
    queryFn: () => getRecipe(id!),
    enabled: !!id,
  });

  const { toggleFavorite, isFavorite } = useFavorites();
  const { addToast } = useToasts();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: recipe?.title || 'Recipe',
  });

  const handlePrintClick = () => {
    handlePrint();
    addToast({
      type: 'success',
      title: 'Print Started',
      description: 'Recipe is being prepared for printing',
    });
  };

  const handleFavorite = () => {
    if (!recipe) return;

    toggleFavorite(recipe.id);
    addToast({
      type: isFavorite(recipe.id) ? 'info' : 'success',
      title: isFavorite(recipe.id) ? 'Removed from favorites' : 'Added to favorites',
      description: recipe.title,
    });
  };

  const handleShare = async () => {
    if (!recipe) return;

    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: recipe.title,
          text: recipe.summary || `Check out this recipe: ${recipe.title}`,
          url,
        });
      } catch (error) {
        // Fallback to clipboard
        copyToClipboard(url);
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      addToast({
        type: 'success',
        title: 'Link Copied',
        description: 'Recipe link has been copied to clipboard',
      });
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (_error || !recipe) {
    return (
      <div className="space-y-8">
        <Link
          to="/browse"
          className="inline-flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to recipes</span>
        </Link>

        <div className="rounded-lg border bg-card p-8 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Recipe not found</h3>
          <p className="text-muted-foreground mb-4">
            The recipe you're looking for doesn't exist or has been removed.
          </p>
          <Link
            to="/browse"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Browse Recipes
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'ingredients', label: 'Ingredients', count: recipe.ingredients?.length || 0 },
    { id: 'instructions', label: 'Instructions', count: recipe.steps?.length || 0 },
    { id: 'nutrition', label: 'Nutrition', count: recipe.nutrition ? 1 : 0 },
  ];

  return (
    <div className="space-y-8">
      {/* Back Navigation */}
      <Link
        to="/browse"
        className="inline-flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to recipes</span>
      </Link>

      {/* Recipe Header */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{recipe.title}</h1>
            {recipe.summary && (
              <p className="text-lg text-muted-foreground">{recipe.summary}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrintClick}
              className="inline-flex items-center px-4 py-2 border border-input rounded-md bg-background hover:bg-muted transition-colors"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </button>
            <button
              onClick={handleShare}
              className="inline-flex items-center px-4 py-2 border border-input rounded-md bg-background hover:bg-muted transition-colors"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </button>
            <button
              onClick={handleFavorite}
              className={`inline-flex items-center px-4 py-2 border border-input rounded-md bg-background hover:bg-muted transition-colors ${
                isFavorite(recipe.id) ? 'text-red-500' : ''
              }`}
            >
              <Heart className={`h-4 w-4 mr-2 ${isFavorite(recipe.id) ? 'fill-current' : ''}`} />
              {isFavorite(recipe.id) ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>

        {/* Recipe Meta */}
        <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
          {recipe.servings && (
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>{recipe.servings} servings</span>
            </div>
          )}
          {recipe.totalTimeMin && (
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{recipe.totalTimeMin} minutes</span>
            </div>
          )}
          {recipe.author && (
            <div className="flex items-center space-x-1">
              <ChefHat className="h-4 w-4" />
              <span>by {recipe.author.name || 'Anonymous'}</span>
            </div>
          )}
          <div className="flex items-center space-x-1">
            <span>Added {formatDate(recipe.createdAt)}</span>
          </div>
        </div>

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex items-center space-x-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-wrap gap-2">
              {recipe.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 text-xs bg-muted text-muted-foreground rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content Tabs */}
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="border-b">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-muted rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'ingredients' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Ingredients</h3>
              {recipe.ingredients && recipe.ingredients.length > 0 ? (
                <div className="grid gap-3">
                  {recipe.ingredients.map((ingredient, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <span className="text-sm">
                          {ingredient.qty && `${ingredient.qty} `}
                          {ingredient.unit && `${ingredient.unit} `}
                          {ingredient.item}
                          {ingredient.note && ` (${ingredient.note})`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No ingredients listed.</p>
              )}
            </div>
          )}

          {activeTab === 'instructions' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Instructions</h3>
              {recipe.steps && recipe.steps.length > 0 ? (
                <div className="space-y-4">
                  {recipe.steps.map((step, index) => (
                    <div
                      key={index}
                      className="flex space-x-4 p-4 rounded-lg bg-muted/50"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground font-medium flex items-center justify-center text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed">{step}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No instructions provided.</p>
              )}
            </div>
          )}

          {activeTab === 'nutrition' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Nutrition Information</h3>
              {recipe.nutrition ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {recipe.nutrition.calories && (
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                      <div className="text-2xl font-bold text-primary">{recipe.nutrition.calories}</div>
                      <div className="text-sm text-muted-foreground">Calories</div>
                    </div>
                  )}
                  {recipe.nutrition.protein && (
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                      <div className="text-2xl font-bold text-primary">{recipe.nutrition.protein}g</div>
                      <div className="text-sm text-muted-foreground">Protein</div>
                    </div>
                  )}
                  {recipe.nutrition.carbs && (
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                      <div className="text-2xl font-bold text-primary">{recipe.nutrition.carbs}g</div>
                      <div className="text-sm text-muted-foreground">Carbs</div>
                    </div>
                  )}
                  {recipe.nutrition.fat && (
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                      <div className="text-2xl font-bold text-primary">{recipe.nutrition.fat}g</div>
                      <div className="text-sm text-muted-foreground">Fat</div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">No nutrition information available.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hidden Print Component */}
      <div className="hidden print:block">
        <PrintCard ref={printRef} recipe={recipe} />
      </div>

    </div>
  );
};

export default RecipeDetail;
