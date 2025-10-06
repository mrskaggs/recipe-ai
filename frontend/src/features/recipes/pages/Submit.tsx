import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Badge } from '../../../components/ui/badge';
import { Loader2, Wand2, Plus, X, FileText, ChefHat } from 'lucide-react';
import { submitRecipe } from '../../../lib/api';
import { useAuth } from '../../auth/hooks/useAuth';

const Submit = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    recipeText: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 10) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.recipeText.trim()) {
      newErrors.recipeText = 'Recipe text is required';
    } else if (formData.recipeText.length < 10) {
      newErrors.recipeText = 'Recipe text must be at least 10 characters';
    }

    if (formData.title && formData.title.length > 100) {
      newErrors.title = 'Title must be less than 100 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Authentication Required', {
        description: 'Please log in to submit a recipe.',
      });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await submitRecipe({
        title: formData.title.trim() || undefined,
        recipeText: formData.recipeText,
        tags: tags.length > 0 ? tags : undefined,
      });

      toast.success('Recipe Submitted!', {
        description: 'Your recipe is being processed by AI. You\'ll be notified when it\'s ready for review.',
      });

      // Reset form
      setFormData({ title: '', recipeText: '' });
      setTags([]);
      setErrors({});

      // Navigate to user profile
      navigate('/profile');

    } catch (error: any) {
      console.error('Error submitting recipe:', error);
      toast.error('Submission Failed', {
        description: error.response?.data?.error || 'Failed to submit recipe. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Submit Recipe</h1>
          <p className="mt-2 text-muted-foreground">
            Share your recipe with the community
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              You need to be logged in to submit recipes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/login')}>
              Log In to Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Submit Recipe</h1>
        <p className="mt-2 text-muted-foreground">
          Share your recipe with the community using AI-powered processing
        </p>
      </div>

      <Tabs defaultValue="ai" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            AI-Powered
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Manual Entry
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                AI Recipe Processing
              </CardTitle>
              <CardDescription>
                Paste your recipe text and let AI extract ingredients, instructions, and nutritional information automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-medium">
                    Recipe Title (Optional)
                  </label>
                  <Input
                    id="title"
                    placeholder="e.g., Grandma's Chocolate Chip Cookies"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  />
                  {errors.title && (
                    <p className="text-sm text-destructive">{errors.title}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Leave blank and AI will extract it from your recipe text
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="recipeText" className="text-sm font-medium">
                    Recipe Text *
                  </label>
                  <Textarea
                    id="recipeText"
                    placeholder="Paste your complete recipe here. Include ingredients, instructions, servings, etc.

Example:
Chocolate Chip Cookies

Ingredients:
- 2 1/4 cups all-purpose flour
- 1 tsp baking soda
- 1 cup butter, softened
- 3/4 cup granulated sugar
- 1 cup chocolate chips

Instructions:
1. Preheat oven to 375°F
2. Mix dry ingredients
3. Cream butter and sugars
4. Combine wet and dry ingredients
5. Fold in chocolate chips
6. Bake for 9-11 minutes

Makes 24 cookies"
                    className="min-h-[300px] font-mono text-sm"
                    value={formData.recipeText}
                    onChange={(e) => setFormData(prev => ({ ...prev, recipeText: e.target.value }))}
                  />
                  {errors.recipeText && (
                    <p className="text-sm text-destructive">{errors.recipeText}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Include ingredients, instructions, servings, and any other details. The more information you provide, the better the AI processing.
                  </p>
                </div>

                {/* Tags Section */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Tags (Optional)</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a tag (e.g., dessert, quick, vegetarian)"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" onClick={addTag}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Add up to 10 tags to help others find your recipe
                  </p>
                </div>

                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing Recipe...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Submit for AI Processing
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                Manual Recipe Entry
              </CardTitle>
              <CardDescription>
                Enter your recipe details manually. This option gives you full control over the final result.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border-2 border-dashed p-8 text-center">
                <ChefHat className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Manual Entry Coming Soon</h3>
                <p className="mt-2 text-muted-foreground">
                  We're working on a comprehensive manual recipe entry form. For now, please use the AI-powered option above.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Submit;
