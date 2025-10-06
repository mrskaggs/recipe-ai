import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { Separator } from '../../../components/ui/separator';
import { Badge } from '../../../components/ui/badge';
import { Loader2, User, Shield, ChefHat, Clock, CheckCircle, AlertCircle, Edit } from 'lucide-react';
import { useUserRecipes } from '../../../stores/recipeStore';
import { getUserRecipes } from '../../../lib/api';

// Profile update schema
const profileSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').optional().or(z.literal('')),
  email: z.string().email('Please enter a valid email address'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// Password change schema
const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export const Profile = () => {
  const { user, updateProfile, changePassword, isLoading } = useAuth();
  const { userRecipes, setUserRecipesLoading, setUserRecipes, setUserRecipesError } = useUserRecipes();
  const [profileMessage, setProfileMessage] = useState<string>('');
  const [passwordMessage, setPasswordMessage] = useState<string>('');
  const [approvingRecipe, setApprovingRecipe] = useState<string | null>(null);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || '',
      email: user?.email || '',
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  // Load user recipes on component mount
  useEffect(() => {
    const loadUserRecipes = async () => {
      if (!user) return;

      try {
        setUserRecipesLoading(true);
        const response = await getUserRecipes();
        setUserRecipes(response.recipes, response);
      } catch (error) {
        console.error('Error loading user recipes:', error);
        setUserRecipesError('Failed to load your recipes');
      }
    };

    loadUserRecipes();
  }, [user, setUserRecipesLoading, setUserRecipes, setUserRecipesError]);

  const handleApproveRecipe = async (recipeId: string) => {
    setApprovingRecipe(recipeId);
    try {
      // For now, just show a placeholder - we'll implement the actual approval flow later
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      // TODO: Implement actual recipe approval
      console.log('Recipe approval not yet implemented:', recipeId);
    } catch (error) {
      console.error('Error approving recipe:', error);
    } finally {
      setApprovingRecipe(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'processing':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Processing
          </Badge>
        );
      case 'pending_review':
        return (
          <Badge variant="outline" className="flex items-center gap-1 text-orange-600">
            <AlertCircle className="h-3 w-3" />
            Pending Review
          </Badge>
        );
      case 'published':
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-green-600">
            <CheckCircle className="h-3 w-3" />
            Published
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const onProfileSubmit = async (data: ProfileFormData) => {
    try {
      setProfileMessage('');
      await updateProfile({
        username: data.username || undefined,
        email: data.email,
      });
      setProfileMessage('Profile updated successfully!');
      setTimeout(() => setProfileMessage(''), 3000);
    } catch (err: any) {
      setProfileMessage(err.response?.data?.error || 'Failed to update profile');
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      setPasswordMessage('');
      await changePassword(data.currentPassword, data.newPassword);
      setPasswordMessage('Password changed successfully!');
      passwordForm.reset();
      setTimeout(() => setPasswordMessage(''), 3000);
    } catch (err: any) {
      setPasswordMessage(err.response?.data?.error || 'Failed to change password');
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p>Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account information</p>
        </div>

        {/* Profile Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your personal information and account details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              {profileMessage && (
                <Alert variant={profileMessage.includes('successfully') ? 'default' : 'destructive'}>
                  <AlertDescription>{profileMessage}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="Enter your username"
                    {...profileForm.register('username')}
                    disabled={isLoading}
                  />
                  {profileForm.formState.errors.username && (
                    <p className="text-sm text-destructive">
                      {profileForm.formState.errors.username.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    {...profileForm.register('email')}
                    disabled={isLoading}
                  />
                  {profileForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {profileForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Role: {user.role}</span>
              </div>

              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Profile
              </Button>
            </form>
          </CardContent>
        </Card>

        <Separator />

        {/* Password Change Card */}
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              {passwordMessage && (
                <Alert variant={passwordMessage.includes('successfully') ? 'default' : 'destructive'}>
                  <AlertDescription>{passwordMessage}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="Enter your current password"
                  {...passwordForm.register('currentPassword')}
                  disabled={isLoading}
                />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.currentPassword.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter your new password"
                    {...passwordForm.register('newPassword')}
                    disabled={isLoading}
                  />
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-sm text-destructive">
                      {passwordForm.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your new password"
                    {...passwordForm.register('confirmPassword')}
                    disabled={isLoading}
                  />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {passwordForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Change Password
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Member since:</span>
                <span>{new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last updated:</span>
                <span>{new Date(user.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* My Recipes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              My Recipes
            </CardTitle>
            <CardDescription>
              Manage your submitted recipes and track their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userRecipes.loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading your recipes...</span>
              </div>
            ) : userRecipes.error ? (
              <Alert variant="destructive">
                <AlertDescription>{userRecipes.error}</AlertDescription>
              </Alert>
            ) : userRecipes.recipes.length === 0 ? (
              <div className="text-center py-8">
                <ChefHat className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No recipes yet</h3>
                <p className="mt-2 text-muted-foreground">
                  You haven't submitted any recipes yet. Start by submitting your first recipe!
                </p>
                <Button className="mt-4" onClick={() => window.location.href = '/submit'}>
                  Submit Your First Recipe
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {userRecipes.recipes.map((recipe) => (
                  <div key={recipe.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">{recipe.title}</h4>
                        {getStatusBadge(recipe.status || 'draft')}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Created {new Date(recipe.createdAt).toLocaleDateString()}
                      </p>
                      {recipe.tags && recipe.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {recipe.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {recipe.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{recipe.tags.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {recipe.status === 'pending_review' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApproveRecipe(recipe.id)}
                          disabled={approvingRecipe === recipe.id}
                        >
                          {approvingRecipe === recipe.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Edit className="h-4 w-4 mr-1" />
                              Review
                            </>
                          )}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost">
                        View
                      </Button>
                    </div>
                  </div>
                ))}

                {userRecipes.pagination.totalPages > 1 && (
                  <div className="flex justify-center mt-6">
                    <p className="text-sm text-muted-foreground">
                      Showing {userRecipes.recipes.length} of {userRecipes.pagination.total} recipes
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
