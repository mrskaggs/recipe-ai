import React, { useState } from 'react';
import { Lightbulb, Loader2, CheckCircle2 } from 'lucide-react';
import { useSocialStore } from '../../../stores/socialStore';
import { useToasts } from '../../../stores/recipeStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Input } from '../../../components/ui/input';

interface SuggestionFormProps {
  isOpen: boolean;
  onClose: () => void;
  recipeId: number;
}

const suggestionTypes = [
  { value: 'improvement', label: 'Recipe Improvement', description: 'Suggestions to improve the recipe instructions or ingredients' },
  { value: 'variation', label: 'Recipe Variation', description: 'Alternative approaches or substitutions' },
  { value: 'correction', label: 'Correction', description: 'Fix errors, typos, or incorrect information' },
];

const SuggestionForm: React.FC<SuggestionFormProps> = ({
  isOpen,
  onClose,
  recipeId,
}) => {
  const { addSuggestion } = useSocialStore();
  const { addToast } = useToasts();
  const [title, setTitle] = useState('');
  const [suggestionType, setSuggestionType] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) {
      addToast({
        type: 'error',
        title: 'Description Required',
        description: 'Please provide details about your suggestion.',
      });
      return;
    }

    if (!suggestionType) {
      addToast({
        type: 'error',
        title: 'Type Required',
        description: 'Please select the type of suggestion.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await addSuggestion(recipeId, {
        title: title.trim() || undefined,
        description: description.trim(),
        suggestionType: suggestionType as any,
      });

      addToast({
        type: 'success',
        title: 'Suggestion Submitted',
        description: 'Thank you for your suggestion! We appreciate your contribution to improving this recipe.',
      });

      handleClose();
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Submission Failed',
        description: 'Failed to submit your suggestion. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setSuggestionType('');
    setDescription('');
    setIsSubmitting(false);
    onClose();
  };

  const selectedType = suggestionTypes.find(type => type.value === suggestionType);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <span>Suggest an Improvement</span>
          </DialogTitle>
          <DialogDescription>
            Help improve this recipe by sharing your suggestions, corrections, or variations.
            All suggestions are reviewed by the community.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Suggestion Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">What type of suggestion is this?</Label>
            <Select value={suggestionType} onValueChange={setSuggestionType}>
              <SelectTrigger>
                <SelectValue placeholder="Select suggestion type..." />
              </SelectTrigger>
              <SelectContent>
                {suggestionTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedType && (
              <p className="text-xs text-muted-foreground">{selectedType.description}</p>
            )}
          </div>

          {/* Title (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Title (optional)
            </Label>
            <Input
              id="title"
              placeholder="Brief summary of your suggestion..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
            <div className="text-xs text-muted-foreground">
              {title.length}/100 characters
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Suggestion Details <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Provide detailed information about your suggestion..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px] resize-none"
              maxLength={1000}
              required
            />
            <div className="text-xs text-muted-foreground">
              Be specific and explain why your suggestion would improve the recipe. {description.length}/1000 characters
            </div>
          </div>

          {/* Guidelines */}
          <div className="flex items-start space-x-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium">Suggestion Guidelines:</p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-xs">
                <li>Be respectful and constructive</li>
                <li>Include specific details about what you're suggesting</li>
                <li>Explain the benefits of your suggestion</li>
                <li>Test your suggestions if possible</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!description.trim() || !suggestionType || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              <>
                <Lightbulb className="h-4 w-4 mr-2" />
                Submit Suggestion
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SuggestionForm;
