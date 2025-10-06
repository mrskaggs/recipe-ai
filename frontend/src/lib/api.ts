import { http } from './http';
import type {
  Recipe,
  RecipesResponse,
  RecipeSearchParams,
  Tag,
  SubmitRecipeRequest,
  SubmitRecipeResponse,
  JobStatus,
} from '../types';

// Recipes API
export const getRecipes = async (params?: RecipeSearchParams): Promise<RecipesResponse> => {
  const response = await http.get('/api/recipes', { params });
  return response.data;
};

export const getRecipe = async (id: string): Promise<Recipe> => {
  const response = await http.get(`/api/recipes/${id}`);
  return response.data;
};

export const getTags = async (): Promise<Tag[]> => {
  const response = await http.get('/api/tags');
  return response.data;
};

export const searchRecipes = async (query: string, filters?: Omit<RecipeSearchParams, 'search'>): Promise<RecipesResponse> => {
  const params = { search: query, ...filters };
  const response = await http.get('/api/recipes/search', { params });
  return response.data;
};

// Recipe submission via our API (which calls n8n webhook)
export const submitRecipe = async (recipeData: SubmitRecipeRequest): Promise<SubmitRecipeResponse> => {
  const response = await http.post('/api/recipes/submit', recipeData);
  return response.data;
};

// Create recipe directly (authenticated users)
export const createRecipe = async (recipeData: Partial<Recipe>): Promise<{ recipeId: string }> => {
  const response = await http.post('/api/recipes/create', recipeData);
  return response.data;
};

// Update recipe (recipe owners only)
export const updateRecipe = async (id: string, recipeData: Partial<Recipe>): Promise<{ recipeId: string }> => {
  const response = await http.put(`/api/recipes/${id}`, recipeData);
  return response.data;
};

// Delete recipe (recipe owners only)
export const deleteRecipe = async (id: string): Promise<void> => {
  await http.delete(`/api/recipes/${id}`);
};

// Approve/edit recipe after AI processing
export const approveRecipe = async (id: string, recipeData: Partial<Recipe>): Promise<{ recipeId: string }> => {
  const response = await http.put(`/api/recipes/${id}/approve`, recipeData);
  return response.data;
};

// Get user's recipes
export const getUserRecipes = async (params?: { page?: number; limit?: number }): Promise<RecipesResponse> => {
  const response = await http.get('/api/user/recipes', { params });
  return response.data;
};

// Check job status (if polling is needed)
export const getJobStatus = async (jobId: string): Promise<JobStatus> => {
  const response = await http.get(`/api/jobs/${jobId}`);
  return response.data;
};

// Utility functions for data transformation
export const parseIngredients = (ingredients: string[]): import('../types').IngredientLine[] => {
  return ingredients.map(ingredient => {
    // Simple parsing logic - can be enhanced
    const parts = ingredient.split(' ');
    const qty = parseFloat(parts[0]);
    const unit = isNaN(qty) ? undefined : parts[1];
    const item = isNaN(qty) ? ingredient : parts.slice(2).join(' ');

    return {
      qty: isNaN(qty) ? undefined : qty,
      unit,
      item,
    };
  });
};

export const scaleIngredients = (
  ingredients: import('../types').IngredientLine[],
  factor: number
): import('../types').IngredientLine[] => {
  return ingredients.map(ingredient => ({
    ...ingredient,
    qty: ingredient.qty ? ingredient.qty * factor : undefined,
  }));
};

export const formatRecipeForPrint = (recipe: Recipe) => {
  return {
    ...recipe,
    ingredients: recipe.ingredients.map(ing =>
      `${ing.qty ? ing.qty : ''} ${ing.unit ? ing.unit : ''} ${ing.item}${ing.note ? ` (${ing.note})` : ''}`.trim()
    ),
  };
};
