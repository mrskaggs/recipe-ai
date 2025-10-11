import { http } from './http';
import type {
  Recipe,
  RecipesResponse,
  RecipeSearchParams,
  Tag,
  SubmitRecipeRequest,
  SubmitRecipeResponse,
  JobStatus,
  Comment,
  CommentsResponse,
  CreateCommentRequest,
  UpdateCommentRequest,
  ReportRequest,
  Suggestion,
  SuggestionsResponse,
  CreateSuggestionRequest,

  ReportsResponse,
  ModerateCommentRequest,
} from '../types';

// Recipes API
export const getRecipes = async (params?: RecipeSearchParams): Promise<RecipesResponse> => {
  const response = await http.get('/recipes', { params });
  return response.data;
};

export const getRecipe = async (id: string): Promise<Recipe> => {
  const response = await http.get(`/recipes/${id}`);
  return response.data;
};

export const getTags = async (): Promise<Tag[]> => {
  const response = await http.get('/tags');
  return response.data;
};

export const searchRecipes = async (query: string, filters?: Omit<RecipeSearchParams, 'search'>): Promise<RecipesResponse> => {
  const params = { search: query, ...filters };
  const response = await http.get('/recipes/search', { params });
  return response.data;
};

// Recipe submission via our API (which calls n8n webhook)
export const submitRecipe = async (recipeData: SubmitRecipeRequest): Promise<SubmitRecipeResponse> => {
  const response = await http.post('/recipes/submit', recipeData);
  return response.data;
};

// Create recipe directly (authenticated users)
export const createRecipe = async (recipeData: Partial<Recipe>): Promise<{ recipeId: string }> => {
  const response = await http.post('/recipes/create', recipeData);
  return response.data;
};

// Update recipe (recipe owners only)
export const updateRecipe = async (id: string, recipeData: Partial<Recipe>): Promise<{ recipeId: string }> => {
  const response = await http.put(`/recipes/${id}`, recipeData);
  return response.data;
};

// Delete recipe (recipe owners only)
export const deleteRecipe = async (id: string): Promise<void> => {
  await http.delete(`/recipes/${id}`);
};

// Approve/edit recipe after AI processing
export const approveRecipe = async (id: string, recipeData: Partial<Recipe>): Promise<{ recipeId: string }> => {
  const response = await http.put(`/recipes/${id}/approve`, recipeData);
  return response.data;
};

// Get user's recipes
export const getUserRecipes = async (params?: { page?: number; limit?: number }): Promise<RecipesResponse> => {
  const response = await http.get('/user/recipes', { params });
  return response.data;
};

// Check job status (if polling is needed)
export const getJobStatus = async (jobId: string): Promise<JobStatus> => {
  const response = await http.get(`/jobs/${jobId}`);
  return response.data;
};

// Social Features API

// Comments API
export const getComments = async (
  recipeId: number,
  params?: { page?: number; limit?: number; sort?: string; order?: string }
): Promise<CommentsResponse> => {
  const response = await http.get(`/social/recipes/${recipeId}/comments`, { params });
  return response.data;
};

export const createComment = async (
  recipeId: number,
  commentData: CreateCommentRequest
): Promise<Comment> => {
  const response = await http.post(`/social/recipes/${recipeId}/comments`, commentData);
  return response.data;
};

export const updateComment = async (
  commentId: number,
  commentData: UpdateCommentRequest
): Promise<Comment> => {
  const response = await http.put(`/social/comments/${commentId}`, commentData);
  return response.data;
};

export const deleteComment = async (commentId: number): Promise<void> => {
  await http.delete(`/social/comments/${commentId}`);
};

// Suggestions API
export const getSuggestions = async (
  recipeId: number,
  params?: { page?: number; limit?: number; status?: string }
): Promise<SuggestionsResponse> => {
  const response = await http.get(`/social/recipes/${recipeId}/suggestions`, { params });
  return response.data;
};

export const createSuggestion = async (
  recipeId: number,
  suggestionData: CreateSuggestionRequest
): Promise<Suggestion> => {
  const response = await http.post(`/social/recipes/${recipeId}/suggestions`, suggestionData);
  return response.data;
};

// Reports API
export const submitReport = async (reportData: ReportRequest): Promise<{ id: number; createdAt: string; message: string }> => {
  const response = await http.post('/social/reports', reportData);
  return response.data;
};

// Admin-only moderation API
export const getReports = async (
  params?: { page?: number; limit?: number; status?: string }
): Promise<ReportsResponse> => {
  const response = await http.get('/social/reports', { params });
  return response.data;
};

export const reviewReport = async (
  reportId: number,
  reviewData: { action?: string; status?: string; actionTaken?: string }
): Promise<void> => {
  await http.put(`/social/reports/${reportId}`, reviewData);
};

export const moderateComment = async (
  commentId: number,
  moderationData: ModerateCommentRequest
): Promise<void> => {
  await http.put(`/social/moderate/comments/${commentId}`, moderationData);
};

export const blockUser = async (blockedUserId: number, reason: string): Promise<void> => {
  await http.post('/social/blocks', { blockedUserId, reason });
};

export const unblockUser = async (userId: number): Promise<void> => {
  await http.delete(`/social/blocks/${userId}`);
};

export const getBlockedUsers = async (): Promise<{ blocks: Array<{ userId: number; displayName: string; username: string; email: string; role: string; reason: string; blockedAt: string }> }> => {
  const response = await http.get('/social/blocks');
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
