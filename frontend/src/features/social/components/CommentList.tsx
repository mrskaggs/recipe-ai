import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageCircle,
  Reply,
  Edit,
  Trash2,
  Flag
} from 'lucide-react';
import { useSocialStore } from '../../../stores/socialStore';
import { useAuthStore } from '../../../features/auth/stores/authStore';
import { useToasts } from '../../../stores/recipeStore';
import type { Comment } from '../../../types/api';
import { Button } from '../../../components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog';

interface CommentListProps {
  recipeId: number;
}

interface CommentItemProps {
  comment: Comment;
  onReply: (commentId: number) => void;
  isReplying: boolean;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, onReply, isReplying }) => {
  const { user } = useAuthStore();
  const { editComment, removeComment } = useSocialStore();
  const { addToast } = useToasts();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);

  const canEdit = user && (user.id === comment.author.id || user.role === 'admin');
  const canDelete = user && (user.id === comment.author.id || user.role === 'admin');
  const isOwnComment = user && user.id === comment.author.id;

  const handleEdit = async () => {
    if (!editContent.trim()) return;

    try {
      await editComment(comment.id, { content: editContent.trim() });
      setIsEditing(false);
      addToast({
        type: 'success',
        title: 'Comment Updated',
        description: 'Your comment has been updated successfully.',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Update Failed',
        description: 'Failed to update comment.',
      });
    }
  };

  const handleDelete = async () => {
    try {
      await removeComment(comment.id);
      addToast({
        type: 'success',
        title: 'Comment Deleted',
        description: 'Your comment has been deleted successfully.',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        description: 'Failed to delete comment.',
      });
    }
  };

  const handleReport = () => {
    // TODO: Implement report functionality
    setShowReportDialog(false);
    addToast({
      type: 'success',
      title: 'Report Submitted',
      description: 'Thank you for helping keep our community safe.',
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex space-x-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
            {(comment.author.displayName || 'A').charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Comment Content */}
        <div className="flex-1 space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">{comment.author.displayName || 'Anonymous'}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
            {comment.author.role === 'admin' && (
              <span className="px-1.5 py-0.5 text-xs bg-destructive/10 text-destructive rounded">
                Admin
              </span>
            )}
            {comment.updatedAt !== comment.createdAt && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full min-h-[60px] px-3 py-2 text-sm border border-input rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                placeholder="Edit your comment..."
              />
              <div className="flex space-x-2">
                <Button size="sm" onClick={handleEdit}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm">{comment.content}</p>
          )}

          {/* Reply count */}
          {comment.replyCount > 0 && (
            <div className="text-xs text-muted-foreground">
              {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
            </div>
          )}
        </div>

        {/* Actions */}
        {!isEditing && (
          <div className="flex-shrink-0 flex space-x-1">
            <Button variant="ghost" size="sm" onClick={() => onReply(comment.id)}>
              <Reply className="h-4 w-4" />
            </Button>
            {canEdit && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {!isOwnComment && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReportDialog(true)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Flag className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-11 space-y-3 border-l-2 border-muted pl-4">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              isReplying={isReplying}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Dialog (Simple placeholder for now) */}
      <AlertDialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to report this comment for inappropriate content?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReport}>
              Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const CommentList: React.FC<CommentListProps> = ({ recipeId }) => {
  const { comments, isLoading } = useSocialStore();
  const { user } = useAuthStore();
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  const recipeComments = comments[recipeId];

  if (isLoading[`comments_${recipeId}`]) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center space-x-2">
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                <div className="h-3 w-12 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-16 bg-muted rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!recipeComments || !recipeComments.comments || recipeComments.comments.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No comments yet</h3>
        <p className="text-muted-foreground mb-4">
          {user ? 'Be the first to share your thoughts about this recipe!' : 'Log in to join the conversation.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {recipeComments.comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          onReply={(commentId) => setReplyingTo(commentId)}
          isReplying={replyingTo === comment.id}
        />
      ))}
    </div>
  );
};

export default CommentList;
