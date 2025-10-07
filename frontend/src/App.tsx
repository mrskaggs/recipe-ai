import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';

// Lazy load pages for code splitting
const Home = lazy(() => import('./features/recipes/pages/Home'));
const Browse = lazy(() => import('./features/recipes/pages/Browse'));
const RecipeDetail = lazy(() => import('./features/recipes/pages/Detail'));
const Submit = lazy(() => import('./features/recipes/pages/Submit'));
const Login = lazy(() => import('./features/auth/pages/Login').then(module => ({ default: module.Login })));
const Register = lazy(() => import('./features/auth/pages/Register').then(module => ({ default: module.Register })));
const Profile = lazy(() => import('./features/auth/pages/Profile').then(module => ({ default: module.Profile })));
const AdminDashboard = lazy(() => import('./features/admin/pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));

// Create a client with enhanced configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as { status: number }).status;
          if (status >= 400 && status < 500) {
            return false;
          }
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <div className="App">
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50"
            >
              Skip to main content
            </a>
            <Layout>
              <main id="main-content" role="main">
                <ErrorBoundary>
                  <Suspense
                    fallback={
                      <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    }
                  >
                    <Routes>
                      {/* Public routes */}
                      <Route path="/" element={<Home />} />
                      <Route path="/browse" element={<Browse />} />
                      <Route path="/recipe/:id" element={<RecipeDetail />} />

                      {/* Auth routes - redirect to home if already authenticated */}
                      <Route
                        path="/login"
                        element={
                          <ProtectedRoute requireAuth={false}>
                            <Login />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/register"
                        element={
                          <ProtectedRoute requireAuth={false}>
                            <Register />
                          </ProtectedRoute>
                        }
                      />

                      {/* Protected routes - require authentication */}
                      <Route
                        path="/submit"
                        element={
                          <ProtectedRoute>
                            <Submit />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/profile"
                        element={
                          <ProtectedRoute>
                            <Profile />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/profile/:id"
                        element={<Profile />}
                      />

                      {/* Admin routes - require admin role */}
                      <Route
                        path="/admin"
                        element={
                          <ProtectedRoute requiredRole="admin">
                            <AdminDashboard />
                          </ProtectedRoute>
                        }
                      />
                    </Routes>
                  </Suspense>
                  <Toaster position="top-right" richColors />
                </ErrorBoundary>
              </main>
            </Layout>
          </div>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
