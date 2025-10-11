import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useSocialStore } from '../../../stores/socialStore';
import { useToasts } from '../../../stores/recipeStore';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';

interface CommentFormProps {
  recipeId: number;
  replyTo?: number;
  onCancel?: () => void;
  placeholder?: string;
}

const CommentForm: React.FC<CommentFormProps> = ({
  recipeId,
  replyTo,
  onCancel,
  placeholder = "Share your thoughts about this recipe..."
}) => {
  const { addComment } = useSocialStore();
  const { addToast } = useToasts();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedContent = content.trim();
    if (!trimmedContent) return;

    setIsSubmitting(true);

    try {
      await addComment(recipeId, {
        content: trimmedContent,
        parentId: replyTo
      });

      setContent('');
      if (onCancel) onCancel();

      addToast({
        type: 'success',
        title: replyTo ? 'Reply Added' : 'Comment Added',
        description: replyTo ? 'Your reply has been posted successfully.' : 'Your comment has been posted successfully.',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to Post',
        description: replyTo ? 'Failed to post your reply.' : 'Failed to post your comment.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-[100px] resize-none"
            disabled={isSubmitting}
          />
          <div className="text-xs text-muted-foreground">
            Press Ctrl+Enter to submit
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {content.length > 0 && `${content.length} characters`}
          </div>

          <div className="flex space-x-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={!content.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {replyTo ? 'Reply' : 'Comment'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CommentForm;
