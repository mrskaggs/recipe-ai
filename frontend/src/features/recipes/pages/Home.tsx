import { Link } from 'react-router-dom';
import { ChefHat, Search, Eye } from 'lucide-react';

const Home = () => {

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
