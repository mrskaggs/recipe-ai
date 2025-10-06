import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import type { Recipe } from '../types/api';

// Print options interface
export interface PrintOptions {
  includeNutrition: boolean;
  includeNotes: boolean;
  fontSize: 'small' | 'medium' | 'large';
  paperSize: 'a4' | 'letter';
  showImages: boolean;
  servings: number;
}

// Form draft interface
export interface FormDraft {
  id: string;
  title: string;
  ingredients: string;
  instructions: string;
  tags: string;
  lastModified: number;
}

// Toast interface
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
}

// Modal state interface
export interface ModalState {
  isOpen: boolean;
  type?: string;
  data?: any;
}

// User recipes interface
export interface UserRecipesState {
  recipes: Recipe[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// UI state interface
export interface UiState {
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  activeTab: string;
  loadingStates: Record<string, boolean>;
}

// Main store interface
interface RecipeStore {
  // Print options
  printOptions: PrintOptions;
  setPrintOptions: (options: Partial<PrintOptions>) => void;

  // Form drafts
  formDrafts: FormDraft[];
  saveFormDraft: (draft: Omit<FormDraft, 'id' | 'lastModified'>) => void;
  loadFormDraft: (id: string) => FormDraft | undefined;
  deleteFormDraft: (id: string) => void;
  clearOldDrafts: () => void;

  // UI state
  uiState: UiState;
  setUiState: (state: Partial<UiState>) => void;
  setLoading: (key: string, loading: boolean) => void;

  // Modals
  modals: Record<string, ModalState>;
  openModal: (type: string, data?: any) => void;
  closeModal: (type: string) => void;

  // Toasts
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Favorites
  favoriteRecipes: string[];
  toggleFavorite: (recipeId: string) => void;
  isFavorite: (recipeId: string) => boolean;

  // Recently viewed
  recentlyViewed: string[];
  addToRecentlyViewed: (recipeId: string) => void;

  // Search history
  searchHistory: string[];
  addToSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;

  // User recipes
  userRecipes: UserRecipesState;
  setUserRecipesLoading: (loading: boolean) => void;
  setUserRecipesError: (error: string | null) => void;
  setUserRecipes: (recipes: Recipe[], pagination: UserRecipesState['pagination']) => void;
  addUserRecipe: (recipe: Recipe) => void;
  updateUserRecipe: (recipeId: string, updates: Partial<Recipe>) => void;
  removeUserRecipe: (recipeId: string) => void;
}

// Default print options
const defaultPrintOptions: PrintOptions = {
  includeNutrition: true,
  includeNotes: true,
  fontSize: 'medium',
  paperSize: 'a4',
  showImages: true,
  servings: 1,
};

// Default UI state
const defaultUiState: UiState = {
  theme: 'system',
  sidebarOpen: false,
  activeTab: 'ingredients',
  loadingStates: {},
};

// Default user recipes state
const defaultUserRecipesState: UserRecipesState = {
  recipes: [],
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
};

export const useRecipeStore = create<RecipeStore>()(
  persist(
    (set, get) => ({
      // Print options
      printOptions: defaultPrintOptions,
      setPrintOptions: (options) =>
        set((state) => ({
          printOptions: { ...state.printOptions, ...options },
        })),

      // Form drafts
      formDrafts: [],
      saveFormDraft: (draftData) => {
        const draft: FormDraft = {
          ...draftData,
          id: `draft-${Date.now()}`,
          lastModified: Date.now(),
        };

        set((state) => ({
          formDrafts: [draft, ...state.formDrafts.slice(0, 9)], // Keep only 10 most recent
        }));
      },

      loadFormDraft: (id) => {
        return get().formDrafts.find((draft) => draft.id === id);
      },

      deleteFormDraft: (id) =>
        set((state) => ({
          formDrafts: state.formDrafts.filter((draft) => draft.id !== id),
        })),

      clearOldDrafts: () => {
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        set((state) => ({
          formDrafts: state.formDrafts.filter(
            (draft) => draft.lastModified > oneWeekAgo
          ),
        }));
      },

      // UI state
      uiState: defaultUiState,
      setUiState: (newState) =>
        set((state) => ({
          uiState: { ...state.uiState, ...newState },
        })),

      setLoading: (key, loading) =>
        set((state) => ({
          uiState: {
            ...state.uiState,
            loadingStates: {
              ...state.uiState.loadingStates,
              [key]: loading,
            },
          },
        })),

      // Modals
      modals: {},
      openModal: (type, data) =>
        set((state) => ({
          modals: {
            ...state.modals,
            [type]: { isOpen: true, type, data },
          },
        })),

      closeModal: (type) =>
        set((state) => ({
          modals: {
            ...state.modals,
            [type]: { ...state.modals[type], isOpen: false },
          },
        })),

      // Toasts
      toasts: [],
      addToast: (toastData) => {
        const toast: Toast = {
          ...toastData,
          id: `toast-${Date.now()}`,
          duration: toastData.duration || 5000,
        };

        set((state) => ({
          toasts: [...state.toasts, toast],
        }));

        // Auto-remove toast after duration
        if (toast.duration && toast.duration > 0) {
          setTimeout(() => {
            get().removeToast(toast.id);
          }, toast.duration);
        }
      },

      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((toast) => toast.id !== id),
        })),

      clearToasts: () =>
        set(() => ({
          toasts: [],
        })),

      // Favorites
      favoriteRecipes: [],
      toggleFavorite: (recipeId) => {
        const isCurrentlyFavorite = get().favoriteRecipes.includes(recipeId);

        set((state) => ({
          favoriteRecipes: isCurrentlyFavorite
            ? state.favoriteRecipes.filter((id) => id !== recipeId)
            : [...state.favoriteRecipes, recipeId],
        }));

        if (isCurrentlyFavorite) {
          toast.success('Removed from Favorites', {
            description: 'Recipe has been removed from your favorites.',
          });
        } else {
          toast.success('Added to Favorites', {
            description: 'Recipe has been added to your favorites.',
          });
        }
      },

      isFavorite: (recipeId) => {
        return get().favoriteRecipes.includes(recipeId);
      },

      // Recently viewed
      recentlyViewed: [],
      addToRecentlyViewed: (recipeId) =>
        set((state) => ({
          recentlyViewed: [
            recipeId,
            ...state.recentlyViewed.filter((id) => id !== recipeId),
          ].slice(0, 10), // Keep only 10 most recent
        })),

      // Search history
      searchHistory: [],
      addToSearchHistory: (query) => {
        if (!query.trim()) return;

        set((state) => ({
          searchHistory: [
            query,
            ...state.searchHistory.filter((q) => q !== query),
          ].slice(0, 20), // Keep only 20 most recent
        }));
      },

      clearSearchHistory: () =>
        set(() => ({
          searchHistory: [],
        })),

      // User recipes
      userRecipes: defaultUserRecipesState,
      setUserRecipesLoading: (loading) =>
        set((state) => ({
          userRecipes: { ...state.userRecipes, loading },
        })),

      setUserRecipesError: (error) =>
        set((state) => ({
          userRecipes: { ...state.userRecipes, error, loading: false },
        })),

      setUserRecipes: (recipes, pagination) =>
        set((state) => ({
          userRecipes: {
            ...state.userRecipes,
            recipes,
            pagination,
            loading: false,
            error: null,
          },
        })),

      addUserRecipe: (recipe) =>
        set((state) => ({
          userRecipes: {
            ...state.userRecipes,
            recipes: [recipe, ...state.userRecipes.recipes],
            pagination: {
              ...state.userRecipes.pagination,
              total: state.userRecipes.pagination.total + 1,
            },
          },
        })),

      updateUserRecipe: (recipeId, updates) =>
        set((state) => ({
          userRecipes: {
            ...state.userRecipes,
            recipes: state.userRecipes.recipes.map((recipe) =>
              recipe.id === recipeId ? { ...recipe, ...updates } : recipe
            ),
          },
        })),

      removeUserRecipe: (recipeId) =>
        set((state) => ({
          userRecipes: {
            ...state.userRecipes,
            recipes: state.userRecipes.recipes.filter((recipe) => recipe.id !== recipeId),
            pagination: {
              ...state.userRecipes.pagination,
              total: Math.max(0, state.userRecipes.pagination.total - 1),
            },
          },
        })),
    }),
    {
      name: 'recipe-store',
      partialize: (state) => ({
        printOptions: state.printOptions,
        formDrafts: state.formDrafts,
        uiState: {
          theme: state.uiState.theme,
          sidebarOpen: state.uiState.sidebarOpen,
        },
        favoriteRecipes: state.favoriteRecipes,
        recentlyViewed: state.recentlyViewed,
        searchHistory: state.searchHistory,
      }),
    }
  )
);

// Helper hooks for specific functionality
export const usePrintOptions = () => {
  const { printOptions, setPrintOptions } = useRecipeStore();
  return { printOptions, setPrintOptions };
};

export const useFormDrafts = () => {
  const { formDrafts, saveFormDraft, loadFormDraft, deleteFormDraft, clearOldDrafts } = useRecipeStore();
  return { formDrafts, saveFormDraft, loadFormDraft, deleteFormDraft, clearOldDrafts };
};

export const useFavorites = () => {
  const { favoriteRecipes, toggleFavorite, isFavorite } = useRecipeStore();
  return { favoriteRecipes, toggleFavorite, isFavorite };
};

export const useToasts = () => {
  const { toasts, addToast, removeToast, clearToasts } = useRecipeStore();
  return { toasts, addToast, removeToast, clearToasts };
};

export const useModals = () => {
  const { modals, openModal, closeModal } = useRecipeStore();
  return { modals, openModal, closeModal };
};

export const useUserRecipes = () => {
  const {
    userRecipes,
    setUserRecipesLoading,
    setUserRecipesError,
    setUserRecipes,
    addUserRecipe,
    updateUserRecipe,
    removeUserRecipe,
  } = useRecipeStore();
  return {
    userRecipes,
    setUserRecipesLoading,
    setUserRecipesError,
    setUserRecipes,
    addUserRecipe,
    updateUserRecipe,
    removeUserRecipe,
  };
};
