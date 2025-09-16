# Implementation Plan

To build a production-ready TypeScript React recipe app that integrates with the existing Node.js Express API for reads and submits raw recipe text to n8n webhook for processing and database writes. The app will feature recipe submission, browsing, searching, detailed views, and print-friendly cards.

The existing API provides basic CRUD for recipes with ingredients, instructions, and tags stored as strings. Additional endpoints will be added for search, tags list, and pagination. The frontend will parse ingredient strings into structured data for display. N8n webhook returns processed recipe ID immediately without polling.

[Types]
Define TypeScript interfaces for API responses and internal data structures, extending the existing API schema with structured ingredient parsing and additional fields.

Core types:
- Recipe: id, title, summary?, servings?, totalTimeMin?, tags?, imageUrl?, sourceUrl?, createdAt, updatedAt, ingredients (IngredientLine[]), steps (string[]), nutrition?, author?, status?
- IngredientLine: qty?, unit?, item, note?, section?
- Nutrition: calories?, protein?, carbs?, fat?, [key: string]: number?
- Tag: id, name, count?
- UserRef: id, name?, avatarUrl?
- JobStatus: status ('pending'|'processing'|'completed'|'error'), recipeId?, error?

API response types will mirror the existing OpenAPI spec, with ingredients as string[] initially, parsed client-side into IngredientLine[].

[Files]
New React application structure with Vite, TypeScript, and required dependencies.

New files:
- src/main.tsx - App entry point
- src/App.tsx - Main app component with routing
- src/index.css - Global styles with Tailwind
- src/vite-env.d.ts - Vite type definitions
- src/types/api.ts - API response types
- src/types/index.ts - Re-export types
- src/lib/http.ts - Axios instance with interceptors
- src/lib/api.ts - Typed API functions (getRecipes, getRecipe, getTags, searchRecipes)
- src/lib/utils.ts - Utility functions (parseIngredients, scaleRecipe, etc.)
- src/lib/print.ts - Print utilities with react-to-print
- src/stores/recipeStore.ts - Zustand store for UI state
- src/components/ui/ - Shadcn/ui components (Button, Input, etc.)
- src/components/RecipeCard.tsx - Recipe list item
- src/components/RecipeForm.tsx - Submission form
- src/components/RecipeDetail.tsx - Full recipe view
- src/components/PrintCard.tsx - Print-optimized layout
- src/features/recipes/pages/Home.tsx - Quick submit and recent recipes
- src/features/recipes/pages/Browse.tsx - Search and filter recipes
- src/features/recipes/pages/Detail.tsx - Recipe details with tabs
- src/features/recipes/pages/Submit.tsx - Advanced submission form
- src/features/recipes/components/ - Feature-specific components
- src/features/recipes/api/ - API hooks with TanStack Query
- src/features/recipes/hooks/ - Custom hooks
- src/test/ - Vitest tests and MSW mocks
- .env.example - Environment variables
- vitest.config.ts - Test configuration
- tailwind.config.js - Tailwind configuration
- components.json - Shadcn/ui config
- eslint.config.js - ESLint configuration
- prettier.config.js - Prettier configuration

Modified files:
- api/server.js - Add GET /api/tags, GET /api/recipes/search endpoints
- api/openapi.yaml - Update spec with new endpoints
- docker-compose.yml - Add frontend service
- Dockerfile - Multi-stage build for React app

[Functions]
New API functions in src/lib/api.ts:
- getRecipes(params?: { page?, limit?, search?, tags?, sort? }) - Paginated recipe list
- getRecipe(id: string) - Single recipe details
- getTags() - All available tags with counts
- searchRecipes(query: string, filters?) - Search with filters

New utility functions:
- parseIngredients(ingredients: string[]): IngredientLine[] - Parse strings to structured
- scaleIngredients(ingredients: IngredientLine[], factor: number): IngredientLine[] - Scale quantities
- estimateNutrition(ingredients: IngredientLine[]): Nutrition - Client-side estimation
- formatRecipeForPrint(recipe: Recipe) - Format for printing

New hooks:
- useRecipes(query) - TanStack Query for recipes
- useRecipe(id) - Single recipe
- useTags() - Tags list
- useSubmitRecipe() - Mutation for n8n submission

[Classes]
No new classes; using functional components with hooks.

Zustand store class for UI state management:
- RecipeStore: printOptions, formDrafts, uiState (modals, toasts)

[Dependencies]
New npm packages:
- Frontend: @tanstack/react-query, axios, zustand, react-hook-form, @hookform/resolvers, zod, @radix-ui/* (shadcn), tailwindcss, lucide-react, react-to-print, react-router-dom, vite, typescript, vitest, @testing-library/react, msw
- Backend: Add search functionality (perhaps pg_search or simple LIKE queries)

Environment variables:
- VITE_API_BASE_URL=http://localhost:3001
- VITE_N8N_WEBHOOK_URL=https://n8n.wwwfake.com/webhook/6d9a4773-fb73-409c-b39a-cca1b6d82b41

[Testing]
Unit tests for utilities and components with Vitest/RTL.
Integration tests for API calls with MSW mocking n8n responses.
E2E tests optional, focus on component and API integration tests.

Test files:
- src/test/setup.ts - Test setup
- src/test/mocks/handlers.ts - MSW API mocks
- src/components/__tests__/RecipeCard.test.tsx
- src/lib/__tests__/utils.test.ts
- src/features/recipes/api/__tests__/hooks.test.ts

[Implementation Order]
1. Set up Vite TypeScript project with Tailwind and shadcn/ui
2. Define types and API client
3. Add search and tags endpoints to backend API
4. Implement basic routing and layout
5. Build Home page with quick submit form
6. Implement Browse page with search and filters
7. Create RecipeDetail page with tabs and print
8. Add Zustand store for UI state
9. Implement print functionality
10. Add tests and MSW mocks
11. Update Docker setup for full-stack
12. Polish UI/UX and accessibility
