import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import Home from './features/recipes/pages/Home';
import Browse from './features/recipes/pages/Browse';
import RecipeDetail from './features/recipes/pages/Detail';
import Submit from './features/recipes/pages/Submit';
import { Login } from './features/auth/pages/Login';
import { Register } from './features/auth/pages/Register';
import { AdminDashboard } from './features/admin/pages/AdminDashboard';

// Create a client with enhanced configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as any).status;
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
