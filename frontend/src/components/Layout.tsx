import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChefHat, Home, Search, Plus, LogIn, LogOut, User, Shield } from 'lucide-react';
import { useAuth } from '../features/auth/hooks/useAuth';
import { Button } from './ui/button';
import { Squash as Hamburger } from 'hamburger-react';
import { useState } from 'react';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Browse', href: '/browse', icon: Search },
    { name: 'Submit', href: '/submit', icon: Plus, requiresAuth: true },
  ];

  const userNavigation = [
    { name: 'Profile', href: '/profile', icon: User },
  ];

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center space-x-2" onClick={closeMenu}>
              <ChefHat className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">Recipe AI</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <nav className="flex space-x-6">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;

                  // Hide auth-required routes if not authenticated
                  if (item.requiresAuth && !isAuthenticated) {
                    return null;
                  }

                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}

                {/* Admin link - only show for admin users */}
                {isAuthenticated && user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      location.pathname === '/admin'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <Shield className="h-4 w-4" />
                    <span>Admin</span>
                  </Link>
                )}
              </nav>

              {/* Authentication UI */}
              <div className="flex items-center space-x-4">
                {isAuthenticated ? (
                  <div className="flex items-center space-x-4">
                    {/* User Navigation */}
                    <nav className="flex space-x-4">
                      {userNavigation.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href;

                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                              isActive
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            <span>{item.name}</span>
                          </Link>
                        );
                      })}
                    </nav>

                    <div className="flex items-center space-x-2 text-sm">
                      <User className="h-4 w-4" />
                      <span>{user?.username || user?.email}</span>
                      {user?.role === 'admin' && (
                        <span className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded">
                          Admin
                        </span>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/login">
                        <LogIn className="h-4 w-4 mr-2" />
                        Login
                      </Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link to="/register">Sign Up</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Navigation Toggle */}
            <div className="md:hidden">
              <Hamburger
                toggled={isMenuOpen}
                toggle={setIsMenuOpen}
                size={20}
                color="#374151"
              />
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {isMenuOpen && (
            <div className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 bg-card border-t">
                {/* Navigation Links */}
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;

                  // Hide auth-required routes if not authenticated
                  if (item.requiresAuth && !isAuthenticated) {
                    return null;
                  }

                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={closeMenu}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}

                {/* Admin link - only show for admin users */}
                {isAuthenticated && user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={closeMenu}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      location.pathname === '/admin'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <Shield className="h-5 w-5" />
                    <span>Admin</span>
                  </Link>
                )}

                <hr className="my-2" />

                {/* User Navigation & Auth for Mobile */}
                {isAuthenticated ? (
                  <>
                    {/* User Navigation */}
                    {userNavigation.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.href;

                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          onClick={closeMenu}
                          className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}

                    {/* User Info & Logout */}
                    <div className="px-3 py-2 text-sm text-muted-foreground flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>{user?.username || user?.email}</span>
                      {user?.role === 'admin' && (
                        <span className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded">
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="px-3 py-2">
                      <Button variant="outline" size="sm" onClick={handleLogout} className="w-full justify-start">
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="px-3 py-2 space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                      <Link to="/login" onClick={closeMenu}>
                        <LogIn className="h-4 w-4 mr-2" />
                        Login
                      </Link>
                    </Button>
                    <Button size="sm" className="w-full" asChild>
                      <Link to="/register" onClick={closeMenu}>
                        Sign Up
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>&copy; 2025 Recipe AI. All rights reserved.</p>
            <p>Powered by AI & PostgreSQL</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
