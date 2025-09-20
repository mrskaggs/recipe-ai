import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChefHat, FileText, Search, Eye, Loader2 } from 'lucide-react';
import { submitRecipe } from '../../../lib/api';
import type { SubmitRecipeRequest } from '../../../types';

const Home = () => {
  const [recipeText, setRecipeText] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitMutation = useMutation({
    mutationFn: (data: SubmitRecipeRequest) => submitRecipe(data),
    onMutate: () => {
      setIsSubmitting(true);
    },
    onSuccess: () => {
      setRecipeText('');
      setTitle('');
      setTags('');
      setIsSubmitting(false);
      alert('Recipe submitted successfully! It will be processed shortly.');
    },
    onError: (error: any) => {
      console.error('Submission error:', error);
      setIsSubmitting(false);
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to submit recipe. Please try again.';
      alert(`Submission failed: ${errorMessage}`);
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipeText.trim()) {
      alert('Please enter recipe text');
      return;
    }

    const submitData: SubmitRecipeRequest = {
      title: title.trim() || 'Untitled Recipe',
      recipeText: recipeText,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
    };

    submitMutation.mutate(submitData);
  };

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

      {/* Quick Submit Form */}
      <div className="max-w-4xl mx-auto">
        <div className="rounded-lg border bg-card p-8 shadow-sm">
          <div className="flex items-center space-x-2 mb-6">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold">Quick Recipe Submit</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-2">
                  Recipe Title (Optional)
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Grandma's Chocolate Chip Cookies"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="tags" className="block text-sm font-medium mb-2">
                  Tags (Optional)
                </label>
                <input
                  id="tags"
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g., dessert, cookies, chocolate"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="recipe" className="block text-sm font-medium mb-2">
                Recipe Text *
              </label>
              <textarea
                id="recipe"
                value={recipeText}
                onChange={(e) => setRecipeText(e.target.value)}
                placeholder="Paste your recipe here. Include ingredients and instructions..."
                rows={8}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-vertical"
                required
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Include ingredients, measurements, and cooking instructions. Our AI will parse and structure your recipe.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitMutation.isPending || isSubmitting}
                className="inline-flex items-center px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {(submitMutation.isPending || isSubmitting) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Submit Recipe
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
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

      {/* Recent Recipes Section (Placeholder) */}
      <div className="rounded-lg border bg-card p-8">
        <h3 className="text-xl font-semibold mb-4">Recent Recipes</h3>
        <p className="text-muted-foreground text-center py-8">
          No recipes submitted yet. Be the first to share a recipe!
        </p>
      </div>
    </div>
  );
};

export default Home;
