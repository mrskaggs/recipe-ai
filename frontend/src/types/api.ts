export interface Recipe {
  id: string;
  title: string;
  summary?: string;
  servings?: number;
  totalTimeMin?: number;
  tags?: string[];
  imageUrl?: string;
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
  ingredients: IngredientLine[];
  steps: string[];
  nutrition?: Nutrition;
  author?: UserRef;
  status?: RecipeStatus;
}

export interface IngredientLine {
  qty?: number;
  unit?: string;
  item: string;
  note?: string;
  section?: string;
}

export interface Nutrition {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  [key: string]: number | undefined;
}

export interface Tag {
  id: string;
  name: string;
  count?: number;
}

export interface UserRef {
  id: string;
  name?: string;
  avatarUrl?: string;
}

export type RecipeStatus = 'draft' | 'processing' | 'pending_review' | 'published';

export interface JobStatus {
  status: 'pending' | 'processing' | 'completed' | 'error';
  recipeId?: string;
  error?: string;
}

// API Request/Response types
export interface RecipesResponse {
  recipes: Recipe[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RecipeSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string[];
  sort?: 'title' | 'createdAt' | 'servings' | 'calories';
  order?: 'asc' | 'desc';
}

export interface SubmitRecipeRequest {
  title?: string;
  recipeText: string;
  tags?: string[];
  servings?: number;
  totalTimeMin?: number;
  imageUrl?: string;
  sourceUrl?: string;
}

export interface SubmitRecipeResponse {
  jobId: string;
  status: JobStatus;
}
