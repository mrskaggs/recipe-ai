import { useState, useEffect } from 'react';
import { useUserRecipes } from '../../../../stores/recipeStore';
import { getUserRecipes } from '../../../../lib/api';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Alert, AlertDescription } from '../../../../components/ui/alert';
import { Badge } from '../../../../components/ui/badge';
import { Loader2, ChefHat, Clock, CheckCircle, AlertCircle, Edit } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const MyRecipes = () => {
  const { user } = useAuth();
  const { userRecipes, setUserRecipesLoading, setUserRecipes, setUserRecipesError } = useUserRecipes();
  const [approvingRecipe, setApprovingRecipe] = useState<string | null>(null);

  // Load user recipes on component mount
  useEffect(() => {
    const loadUserRecipes = async () => {
      if (!user) return;

      try {
        setUserRecipesLoading(true);
        const response = await getUserRecipes();
        setUserRecipes(response.recipes, response);
      } catch (error) {
        console.error('Error loading user recipes:', error);
        setUserRecipesError('Failed to load your recipes');
      }
    };

    loadUserRecipes();
  }, [user, setUserRecipesLoading, setUserRecipes, setUserRecipesError]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'processing':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Processing
          </Badge>
        );
      case 'pending_review':
        return (
          <Badge variant="outline" className="flex items-center gap-1 text-orange-600">
            <AlertCircle className="h-3 w-3" />
            Pending Review
          </Badge>
        );
      case 'published':
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-green-600">
            <CheckCircle className="h-3 w-3" />
            Published
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleApproveRecipe = async (recipeId: string) => {
    setApprovingRecipe(recipeId);
    try {
      // For now, just show a placeholder - we'll implement the actual approval flow later
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      // TODO: Implement actual recipe approval
      console.log('Recipe approval not yet implemented:', recipeId);
    } catch (error) {
      console.error('Error approving recipe:', error);
    } finally {
      setApprovingRecipe(null);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p>Please log in to view your recipes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">My Recipes</h2>
        <p className="text-muted-foreground">Manage your submitted recipes and track their status</p>
      </div>

      {/* Recipes Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            My Recipes
          </CardTitle>
          <CardDescription>
            View and manage all the recipes you've submitted
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userRecipes.loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading your recipes...</span>
            </div>
          ) : userRecipes.error ? (
            <Alert variant="destructive">
              <AlertDescription>{userRecipes.error}</AlertDescription>
            </Alert>
          ) : userRecipes.recipes.length === 0 ? (
            <div className="text-center py-8">
              <ChefHat className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No recipes yet</h3>
              <p className="mt-2 text-muted-foreground">
                You haven't submitted any recipes yet. Start by submitting your first recipe!
              </p>
              <Button className="mt-4" onClick={() => window.location.href = '/submit'}>
                Submit Your First Recipe
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {userRecipes.recipes.map((recipe) => (
                <div key={recipe.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">{recipe.title}</h4>
                      {getStatusBadge(recipe.status || 'draft')}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Created {new Date(recipe.createdAt).toLocaleDateString()}
                    </p>
                    {recipe.tags && recipe.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {recipe.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {recipe.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{recipe.tags.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {recipe.status === 'pending_review' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApproveRecipe(recipe.id)}
                        disabled={approvingRecipe === recipe.id}
                      >
                        {approvingRecipe === recipe.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Edit className="h-4 w-4 mr-1" />
                            Review
                          </>
                        )}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost">
                      View
                    </Button>
                  </div>
                </div>
              ))}

              {userRecipes.pagination.totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <p className="text-sm text-muted-foreground">
                    Showing {userRecipes.recipes.length} of {userRecipes.pagination.total} recipes
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
