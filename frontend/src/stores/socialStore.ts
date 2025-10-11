import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { toast } from 'sonner';
import {
  getComments,
  createComment,
  updateComment,
  deleteComment,
  getSuggestions,
  createSuggestion,
  submitReport,
  getReports,
  reviewReport,
  blockUser,
  unblockUser,
  getBlockedUsers
} from '../lib/api';
import socketClient from '../lib/socket';
import type {
  SocialStoreState,
  Comment,
  Suggestion,
  CreateSuggestionRequest,
  ReportRequest,
  ReportsResponse,
} from '../types/api';

export const useSocialStore = create<SocialStoreState & {
  // Actions
  fetchComments: (recipeId: number, page?: number, limit?: number) => Promise<void>;
  addComment: (recipeId: number, data: { content: string; parentId?: number }) => Promise<Comment | null>;
  editComment: (commentId: number, data: { content: string }) => Promise<void>;
  removeComment: (commentId: number) => Promise<void>;

  fetchSuggestions: (recipeId: number, page?: number, limit?: number) => Promise<void>;
  addSuggestion: (recipeId: number, data: CreateSuggestionRequest) => Promise<Suggestion | null>;

  submitContentReport: (data: ReportRequest) => Promise<void>;

  // Admin actions
  fetchReports: (params?: { page?: number; limit?: number; status?: string }) => Promise<void>;
  reviewUserReport: (reportId: number, action: { action?: string; status?: string; actionTaken?: string }) => Promise<void>;
  blockUserAdmin: (userId: number, reason: string) => Promise<void>;
  unblockUserAdmin: (userId: number) => Promise<void>;
  fetchBlockedUsers: () => Promise<void>;

  // Chat actions
  initializeChat: (recipeId: number) => void;
  cleanupChat: (recipeId: number) => void;
  sendChatMessage: (recipeId: number, content: string) => Promise<void>;
  editChatMessage: (messageId: number, content: string) => Promise<void>;
  deleteChatMessage: (messageId: number) => Promise<void>;
  startTyping: (recipeId: number) => void;
  stopTyping: (recipeId: number) => void;

  // Error handling
  clearError: (errorKey: string) => void;
  setLoading: (loadingKey: string, loading: boolean) => void;
}>()(
  devtools(
    (set) => ({
      // Initial state
      comments: {},
      chatMessages: {},
      suggestions: {},
      reports: null,
      typingUsers: {},
      isLoading: {},
      error: {},

      // Comments actions
      fetchComments: async (recipeId: number, page = 1, limit = 20) => {
        const key = `comments_${recipeId}`;
        set(state => ({ isLoading: { ...state.isLoading, [key]: true } }));

        try {
          const response = await getComments(recipeId, { page, limit });

          set(state => ({
            comments: {
              ...state.comments,
              [recipeId]: response
            },
            isLoading: { ...state.isLoading, [key]: false },
            error: { ...state.error, [key]: null }
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load comments';

          set(state => ({
            isLoading: { ...state.isLoading, [key]: false },
            error: { ...state.error, [key]: errorMessage }
          }));

          toast.error('Failed to Load Comments', {
            description: errorMessage
          });
        }
      },

      addComment: async (recipeId: number, data: { content: string; parentId?: number }) => {
        const key = `add_comment_${recipeId}`;
        set(state => ({ isLoading: { ...state.isLoading, [key]: true } }));

        try {
          const newComment = await createComment(recipeId, data);

          // Add to local state immediately for optimistic updates
          set(state => {
            const existingComments = state.comments[recipeId];
            if (!existingComments) return state;

            const updatedComments = {
              ...existingComments,
              comments: [newComment, ...existingComments.comments],
              total: existingComments.total + 1
            };

            return {
              comments: {
                ...state.comments,
                [recipeId]: updatedComments
              },
              isLoading: { ...state.isLoading, [key]: false },
              error: { ...state.error, [key]: null }
            };
          });

          toast.success('Comment Added', {
            description: 'Your comment has been posted successfully.'
          });

          return newComment;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to add comment';

          set(state => ({
            isLoading: { ...state.isLoading, [key]: false },
            error: { ...state.error, [key]: errorMessage }
          }));

          toast.error('Failed to Add Comment', {
            description: errorMessage
          });

          return null;
        }
      },

      editComment: async (commentId: number, data: { content: string }) => {
        const key = `edit_comment_${commentId}`;
        set(state => ({ isLoading: { ...state.isLoading, [key]: true } }));

        try {
          const updatedComment = await updateComment(commentId, data);

          // Update local state
          set(state => {
            const newComments = { ...state.comments };

            Object.keys(newComments).forEach(recipeId => {
              const commentsResponse = newComments[Number(recipeId)];
              if (commentsResponse) {
                commentsResponse.comments = commentsResponse.comments.map((comment: Comment) =>
                  comment.id === commentId ? updatedComment : comment
                );
              }
            });

            return {
              comments: newComments,
              isLoading: { ...state.isLoading, [key]: false },
              error: { ...state.error, [key]: null }
            };
          });

          toast.success('Comment Updated', {
            description: 'Your comment has been updated successfully.'
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update comment';

          set(state => ({
            isLoading: { ...state.isLoading, [key]: false },
            error: { ...state.error, [key]: errorMessage }
          }));

          toast.error('Failed to Update Comment', {
            description: errorMessage
          });
        }
      },

      removeComment: async (commentId: number) => {
        const key = `delete_comment_${commentId}`;
        set(state => ({ isLoading: { ...state.isLoading, [key]: true } }));

        try {
          await deleteComment(commentId);

          // Remove from local state
          set(state => {
            const newComments = { ...state.comments };

            Object.keys(newComments).forEach(recipeId => {
              const commentsResponse = newComments[Number(recipeId)];
              if (commentsResponse) {
                commentsResponse.comments = commentsResponse.comments.filter((comment: Comment) =>
                  comment.id !== commentId
                );
                commentsResponse.total = Math.max(0, commentsResponse.total - 1);
              }
            });

            return {
              comments: newComments,
              isLoading: { ...state.isLoading, [key]: false },
              error: { ...state.error, [key]: null }
            };
          });

          toast.success('Comment Deleted', {
            description: 'Your comment has been deleted successfully.'
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete comment';

          set(state => ({
            isLoading: { ...state.isLoading, [key]: false },
            error: { ...state.error, [key]: errorMessage }
          }));

          toast.error('Failed to Delete Comment', {
            description: errorMessage
          });
        }
      },

      // Suggestions actions
      fetchSuggestions: async (recipeId: number, page = 1, limit = 10) => {
        const key = `suggestions_${recipeId}`;
        set(state => ({ isLoading: { ...state.isLoading, [key]: true } }));

        try {
          const response = await getSuggestions(recipeId, { page, limit });

          set(state => ({
            suggestions: {
              ...state.suggestions,
              [recipeId]: response
            },
            isLoading: { ...state.isLoading, [key]: false },
            error: { ...state.error, [key]: null }
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load suggestions';

          set(state => ({
            isLoading: { ...state.isLoading, [key]: false },
            error: { ...state.error, [key]: errorMessage }
          }));

          toast.error('Failed to Load Suggestions', {
            description: errorMessage
          });
        }
      },

      addSuggestion: async (recipeId: number, data: CreateSuggestionRequest) => {
        const key = `add_suggestion_${recipeId}`;
        set(state => ({ isLoading: { ...state.isLoading, [key]: true } }));

        try {
          const newSuggestion = await createSuggestion(recipeId, data);

          // Add to local state
          set(state => {
            const existingSuggestions = state.suggestions[recipeId];
            if (!existingSuggestions) return state;

            const updatedSuggestions = {
              ...existingSuggestions,
              suggestions: [newSuggestion, ...existingSuggestions.suggestions],
              total: existingSuggestions.total + 1
            };

            return {
              suggestions: {
                ...state.suggestions,
                [recipeId]: updatedSuggestions
              },
              isLoading: { ...state.isLoading, [key]: false },
              error: { ...state.error, [key]: null }
            };
          });

          toast.success('Suggestion Added', {
            description: 'Your suggestion has been submitted successfully.'
          });

          return newSuggestion;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to add suggestion';

          set(state => ({
            isLoading: { ...state.isLoading, [key]: false },
            error: { ...state.error, [key]: errorMessage }
          }));

          toast.error('Failed to Add Suggestion', {
            description: errorMessage
          });

          return null;
        }
      },

      submitContentReport: async (data: ReportRequest) => {
        const key = 'submit_report';
        set(state => ({ isLoading: { ...state.isLoading, [key]: true } }));

        try {
          await submitReport(data);

          set(state => ({
            isLoading: { ...state.isLoading, [key]: false },
            error: { ...state.error, [key]: null }
          }));

          toast.success('Report Submitted', {
            description: 'Thank you for helping keep our community safe. We will review this report soon.'
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to submit report';

          set(state => ({
            isLoading: { ...state.isLoading, [key]: false },
            error: { ...state.error, [key]: errorMessage }
          }));

          toast.error('Failed to Submit Report', {
            description: errorMessage
          });
        }
      },

      // Admin actions
      fetchReports: async (params = { page: 1, limit: 20, status: 'pending' }) => {
        const key = 'reports';
        set(state => ({ isLoading: { ...state.isLoading, [key]: true } }));

        try {
          const response: ReportsResponse = await getReports(params);

          set(state => ({
            reports: response,
            isLoading: { ...state.isLoading, [key]: false },
            error: { ...state.error, [key]: null }
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load reports';

          set(state => ({
            isLoading: { ...state.isLoading, [key]: false },
            error: { ...state.error, [key]: errorMessage }
          }));

          toast.error('Failed to Load Reports', {
            description: errorMessage
          });
        }
      },

      reviewUserReport: async (reportId: number, action: { action?: string; status?: string; actionTaken?: string }) => {
        const key = `review_report_${reportId}`;
        set(state => ({ isLoading: { ...state.isLoading, [key]: true } }));

        try {
          await reviewReport(reportId, action);

          // Update local state if reports are loaded
          set(state => {
            if (!state.reports) return state;

            const updatedReports: ReportsResponse = {
              ...state.reports,
              reports: state.reports.reports.map(report =>
                report.id === reportId ?
                  { ...report, status: action.status || report.status } :
                  report
              )
            };

            return {
              reports: updatedReports,
              isLoading: { ...state.isLoading, [key]: false },
              error: { ...state.error, [key]: null }
            };
          });

          toast.success('Report Reviewed', {
            description: 'The report has been reviewed successfully.'
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to review report';

          set(state => ({
            isLoading: { ...state.isLoading, [key]: false },
            error: { ...state.error, [key]: errorMessage }
          }));

          toast.error('Failed to Review Report', {
            description: errorMessage
          });
        }
      },

      blockUserAdmin: async (userId: number, reason: string) => {
        const key = `block_user_${userId}`;
        set(state => ({ isLoading: { ...state.isLoading, [key]: true } }));

        try {
          await blockUser(userId, reason);

          set(state => ({
            isLoading: { ...state.isLoading, [key]: false },
            error: { ...state.error, [key]: null }
          }));

          toast.success('User Blocked', {
            description: 'The user has been blocked successfully.'
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to block user';

          set(state => ({
            isLoading: { ...state.isLoading, [key]: false },
            error: { ...state.error, [key]: errorMessage }
          }));

          toast.error('Failed to Block User', {
            description: errorMessage
          });
        }
      },

      unblockUserAdmin: async (userId: number) => {
        const key = `unblock_user_${userId}`;
        set(state => ({ isLoading: { ...state.isLoading, [key]: true } }));

        try {
          await unblockUser(userId);

          set(state => ({
            isLoading: { ...state.isLoading, [key]: false },
            error: { ...state.error, [key]: null }
          }));

          toast.success('User Unblocked', {
            description: 'The user has been unblocked successfully.'
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to unblock user';

          set(state => ({
            isLoading: { ...state.isLoading, [key]: false },
            error: { ...state.error, [key]: errorMessage }
          }));

          toast.error('Failed to Unblock User', {
            description: errorMessage
          });
        }
      },

      fetchBlockedUsers: async () => {
        const key = 'blocked_users';
        set(state => ({ isLoading: { ...state.isLoading, [key]: true } }));

        try {
          const response = await getBlockedUsers();

          set(state => ({
            isLoading: { ...state.isLoading, [key]: false },
            error: { ...state.error, [key]: null }
          }));

          return response.blocks;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load blocked users';

          set(state => ({
            isLoading: { ...state.isLoading, [key]: false },
            error: { ...state.error, [key]: errorMessage }
          }));

          toast.error('Failed to Load Blocked Users', {
            description: errorMessage
          });
        }
      },

      // Chat actions
      initializeChat: (recipeId: number) => {
        // Connect to socket if not already connected
        socketClient.connect();

        // Join room
        socketClient.joinRecipeChat(recipeId);

        // Initialize chat messages array if needed
        set(state => ({
          chatMessages: {
            ...state.chatMessages,
            [recipeId]: state.chatMessages[recipeId] || []
          },
          typingUsers: {
            ...state.typingUsers,
            [recipeId]: []
          }
        }));

        // Set up event listeners for this recipe
        const unsubscribeMessage = socketClient.onMessage((message) => {
          if (message.recipeId === recipeId) {
            set(state => ({
              chatMessages: {
                ...state.chatMessages,
                [recipeId]: [...(state.chatMessages[recipeId] || []), message]
              }
            }));
          }
        });

        const unsubscribeEdited = socketClient.onMessageEdited((data) => {
          set(state => {
            const messages = state.chatMessages[recipeId] || [];
            const updatedMessages = messages.map(msg =>
              msg.id === data.id ?
                { ...msg, content: data.content, edited: data.edited, editedAt: data.editedAt } :
                msg
            );

            return {
              chatMessages: {
                ...state.chatMessages,
                [recipeId]: updatedMessages
              }
            };
          });
        });

        const unsubscribeDeleted = socketClient.onMessageDeleted((data) => {
          set(state => {
            const messages = state.chatMessages[recipeId] || [];
            const updatedMessages = messages.map(msg =>
              msg.id === data.id ? { ...msg, isDeleted: true } : msg
            );

            return {
              chatMessages: {
                ...state.chatMessages,
                [recipeId]: updatedMessages
              }
            };
          });
        });

        const unsubscribeTyping = socketClient.onTyping((data) => {
          set(state => {
            const currentTyping = state.typingUsers[recipeId] || [];
            const existingUserIndex = currentTyping.findIndex(user => user.userId === data.userId);

            let newTyping;
            if (data.isTyping && existingUserIndex === -1) {
              newTyping = [...currentTyping, data];
            } else if (!data.isTyping && existingUserIndex !== -1) {
              newTyping = currentTyping.filter((_, index) => index !== existingUserIndex);
            } else {
              newTyping = currentTyping;
            }

            return {
              typingUsers: {
                ...state.typingUsers,
                [recipeId]: newTyping
              }
            };
          });
        });

        // Store cleanup functions
        return () => {
          unsubscribeMessage();
          unsubscribeEdited();
          unsubscribeDeleted();
          unsubscribeTyping();
        };
      },

      cleanupChat: (recipeId: number) => {
        socketClient.leaveRecipeChat(recipeId);

        // Clear typing users for this room
        set(state => ({
          typingUsers: {
            ...state.typingUsers,
            [recipeId]: []
          }
        }));
      },

      sendChatMessage: async (recipeId: number, content: string) => {
        socketClient.sendMessage(recipeId, content);
      },

      editChatMessage: async (messageId: number, content: string) => {
        socketClient.editMessage(messageId, content);
      },

      deleteChatMessage: async (messageId: number) => {
        socketClient.deleteMessage(messageId);
      },

      startTyping: (recipeId: number) => {
        socketClient.startTyping(recipeId);
      },

      stopTyping: (recipeId: number) => {
        socketClient.stopTyping(recipeId);
      },

      // Utility functions
      clearError: (errorKey: string) => {
        set(state => ({
          error: { ...state.error, [errorKey]: null }
        }));
      },

      setLoading: (loadingKey: string, loading: boolean) => {
        set(state => ({
          isLoading: { ...state.isLoading, [loadingKey]: loading }
        }));
      },
    }),
    {
      name: 'social-store',
    }
  )
);
