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
  popularity?: PopularityMetrics;
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

export interface PopularityMetrics {
  views: number;
  likes: number;
  favorites: number;
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
  sort?: 'title' | 'createdAt' | 'servings' | 'calories' | 'view_count' | 'like_count' | 'favorite_count';
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

// Social Features Types
export interface Comment {
  id: number;
  recipeId: number;
  parentId?: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    displayName: string;
    role: 'user' | 'admin';
  };
  replyCount: number;
  replies: Comment[];
}

export interface CommentsResponse {
  comments: Comment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateCommentRequest {
  content: string;
  parentId?: number;
}

export interface UpdateCommentRequest {
  content: string;
}

export interface ReportRequest {
  contentType: 'comment' | 'chat_message' | 'profile' | 'other';
  contentId: number;
  reason: 'spam' | 'harassment' | 'inappropriate' | 'offensive' | 'other';
  description?: string;
}

export interface Suggestion {
  id: number;
  recipeId: number;
  title?: string;
  description: string;
  suggestionType: 'improvement' | 'variation' | 'correction';
  status: 'pending' | 'accepted' | 'rejected' | 'implemented';
  createdAt: string;
  updatedAt: string;
  acceptedBy?: number;
  acceptedAt?: string;
  author: {
    id: number;
    displayName: string;
    role: 'user' | 'admin';
  };
}

export interface SuggestionsResponse {
  suggestions: Suggestion[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateSuggestionRequest {
  title?: string;
  description: string;
  suggestionType?: 'improvement' | 'variation' | 'correction';
}

export interface ChatMessage {
  id: number;
  recipeId: number;
  userId: number;
  userDisplayName: string;
  userRole: 'user' | 'admin';
  content: string;
  messageType: 'message' | 'system' | 'notification';
  createdAt: string;
  edited: boolean;
  editedAt?: string;
  isDeleted: boolean;
}

export interface TypingIndicator {
  userId: number;
  displayName: string;
  isTyping: boolean;
}

export interface Report {
  id: number;
  contentType: 'comment' | 'chat_message' | 'profile' | 'other';
  contentId: number;
  reason: 'spam' | 'harassment' | 'inappropriate' | 'offensive' | 'other';
  description?: string;
  status: string; // Allow string for flexibility
  createdAt: string;
  reviewedBy?: number;
  reviewedAt?: string;
  actionTaken?: string;
  reporter: {
    id: number;
    displayName: string;
  };
  reportedUser: {
    id: number;
    displayName: string;
  };
}

export interface ReportsResponse {
  reports: Report[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ModerateCommentRequest {
  action: 'approve' | 'hide';
}

export interface SocialStoreState {
  comments: Record<number, CommentsResponse>;
  chatMessages: Record<number, ChatMessage[]>;
  suggestions: Record<number, SuggestionsResponse>;
  reports: ReportsResponse | null;
  typingUsers: Record<number, TypingIndicator[]>;
  isLoading: Record<string, boolean>;
  error: Record<string, string | null>;
}
