import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../../components/ui/alert-dialog';
import { Badge } from '../../../components/ui/badge';
import { http } from '../../../lib/http';
import type { Recipe } from '../../../types/api';
import { Search, Edit, Trash2, ChefHat } from 'lucide-react';

interface RecipesResponse {
  recipes: Recipe[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const RecipeManagement = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch recipes
  const { data: recipesData, isLoading } = useQuery({
    queryKey: ['admin-recipes', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });

      if (search) params.append('search', search);

      const response = await http.get<RecipesResponse>(`/api/admin/recipes?${params}`);
      return response.data;
    },
  });

  // Update recipe mutation
  const updateRecipeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Recipe> }) => {
      const response = await http.put<Recipe>(`/api/admin/recipes/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-recipes'] });
      setIsEditDialogOpen(false);
      setEditingRecipe(null);
      alert('Recipe updated successfully');
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Failed to update recipe');
    },
  });

  // Delete recipe mutation
  const deleteRecipeMutation = useMutation({
    mutationFn: async (id: string) => {
      await http.delete(`/api/admin/recipes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-recipes'] });
      alert('Recipe deleted successfully');
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Failed to delete recipe');
    },
  });

  const handleEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setIsEditDialogOpen(true);
  };

  const handleUpdateRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecipe) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const title = formData.get('title') as string;
    const servings = parseInt(formData.get('servings') as string) || 1;
    const ingredients = (formData.get('ingredients') as string).split('\n').filter(i => i.trim());
    const instructions = (formData.get('instructions') as string).split('\n').filter(i => i.trim());
    const tags = (formData.get('tags') as string).split(',').map(t => t.trim()).filter(t => t);
    const notes = formData.get('notes') as string;
    const calories = parseInt(formData.get('calories') as string) || 0;
    const protein_g = parseFloat(formData.get('protein_g') as string) || 0;
    const carbs_g = parseFloat(formData.get('carbs_g') as string) || 0;
    const fat_g = parseFloat(formData.get('fat_g') as string) || 0;

    updateRecipeMutation.mutate({
      id: editingRecipe.id,
      data: {
        title,
        servings,
        ingredients: ingredients as any, // API will handle conversion
        steps: instructions,
        tags,
        summary: notes,
        nutrition: {
          calories,
          protein: protein_g,
          carbs: carbs_g,
          fat: fat_g,
        },
      },
    });
  };

  const handleDeleteRecipe = (recipe: Recipe) => {
    deleteRecipeMutation.mutate(recipe.id);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatIngredients = (ingredients: any[]) => {
    if (!ingredients || ingredients.length === 0) return 'No ingredients';
    return ingredients.slice(0, 2).map(ing =>
      typeof ing === 'string' ? ing : ing.item || ing
    ).join(', ') + (ingredients.length > 2 ? '...' : '');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Recipe Management
          </CardTitle>
          <CardDescription>
            Manage recipes, ingredients, and nutritional information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6">
            <Label htmlFor="search">Search Recipes</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Recipes Table */}
          <div className="border rounded-lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Recipe</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Ingredients</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Tags</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Created</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        Loading recipes...
                      </td>
                    </tr>
                  ) : recipesData?.recipes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No recipes found
                      </td>
                    </tr>
                  ) : (
                    recipesData?.recipes.map((recipe) => (
                      <tr key={recipe.id} className="border-t">
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium">{recipe.title}</div>
                            {recipe.summary && (
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {recipe.summary}
                              </div>
                            )}
                            {recipe.servings && (
                              <div className="text-xs text-muted-foreground">
                                Serves {recipe.servings}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-muted-foreground">
                            {formatIngredients(recipe.ingredients)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {recipe.tags?.slice(0, 2).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {recipe.tags && recipe.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{recipe.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDate(recipe.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditRecipe(recipe)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Recipe</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{recipe.title}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteRecipe(recipe)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {recipesData && recipesData.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, recipesData.total)} of {recipesData.total} recipes
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {page} of {recipesData.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === recipesData.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Recipe Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Recipe</DialogTitle>
            <DialogDescription>
              Update recipe information, ingredients, and instructions
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateRecipe}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={editingRecipe?.title}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="servings">Servings</Label>
                  <Input
                    id="servings"
                    name="servings"
                    type="number"
                    min="1"
                    defaultValue={editingRecipe?.servings || 1}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="calories">Calories per Serving</Label>
                  <Input
                    id="calories"
                    name="calories"
                    type="number"
                    min="0"
                    defaultValue={editingRecipe?.nutrition?.calories || 0}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="protein_g">Protein (g)</Label>
                  <Input
                    id="protein_g"
                    name="protein_g"
                    type="number"
                    min="0"
                    step="0.1"
                    defaultValue={editingRecipe?.nutrition?.protein || 0}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="carbs_g">Carbs (g)</Label>
                  <Input
                    id="carbs_g"
                    name="carbs_g"
                    type="number"
                    min="0"
                    step="0.1"
                    defaultValue={editingRecipe?.nutrition?.carbs || 0}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fat_g">Fat (g)</Label>
                  <Input
                    id="fat_g"
                    name="fat_g"
                    type="number"
                    min="0"
                    step="0.1"
                    defaultValue={editingRecipe?.nutrition?.fat || 0}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ingredients">Ingredients (one per line)</Label>
                <Textarea
                  id="ingredients"
                  name="ingredients"
                  rows={6}
                  defaultValue={editingRecipe?.ingredients?.map(ing =>
                    typeof ing === 'string' ? ing : ing.item || ing
                  ).join('\n') || ''}
                  placeholder="1 cup flour&#10;2 eggs&#10;1/2 cup milk"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="instructions">Instructions (one per line)</Label>
                <Textarea
                  id="instructions"
                  name="instructions"
                  rows={6}
                  defaultValue={editingRecipe?.steps?.join('\n') || ''}
                  placeholder="Mix dry ingredients&#10;Add wet ingredients&#10;Bake at 350°F for 30 minutes"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  name="tags"
                  defaultValue={editingRecipe?.tags?.join(', ') || ''}
                  placeholder="italian, pasta, quick"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  defaultValue={editingRecipe?.summary || ''}
                  placeholder="Additional notes about the recipe..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateRecipeMutation.isPending}>
                {updateRecipeMutation.isPending ? 'Updating...' : 'Update Recipe'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
