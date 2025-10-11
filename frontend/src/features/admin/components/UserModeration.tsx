import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../../components/ui/alert-dialog';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { http } from '../../../lib/http';
import { Shield, UserX, UserCheck, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface BlockedUser {
  userId: number;
  displayName: string;
  username: string | null;
  email: string;
  role: string;
  reason: string;
  blockedAt: string;
}

interface BlockUserData {
  blockedUserId: number;
  reason: string;
}

export const UserModeration = () => {
  const [blockingUserId, setBlockingUserId] = useState<number | null>(null);
  const [blockingReason, setBlockingReason] = useState('');
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch blocked users
  const { data: blockedUsers, isLoading } = useQuery({
    queryKey: ['admin-blocks'],
    queryFn: async () => {
      const response = await http.get<{ blocks: BlockedUser[] }>('/social/blocks');
      return response.data;
    },
  });

  // Block user mutation
  const blockUserMutation = useMutation({
    mutationFn: async (data: BlockUserData) => {
      const response = await http.post('/social/blocks', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blocks'] });
      setIsBlockDialogOpen(false);
      setBlockingUserId(null);
      setBlockingReason('');
      toast.success('User blocked successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to block user');
    },
  });

  // Unblock user mutation
  const unblockUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await http.delete(`/api/social/blocks/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blocks'] });
      toast.success('User unblocked successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to unblock user');
    },
  });

  const handleBlockUser = () => {
    if (!blockingUserId || !blockingReason.trim()) return;
    blockUserMutation.mutate({ blockedUserId: blockingUserId, reason: blockingReason.trim() });
  };

  const handleUnblockUser = (user: BlockedUser) => {
    unblockUserMutation.mutate(user.userId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            User Moderation
          </CardTitle>
          <CardDescription>
            Manage blocked users and moderation actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Block User Button */}
          <div className="mb-6">
            <Button onClick={() => setIsBlockDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Block User
            </Button>
          </div>

          {/* Blocked Users Table */}
          <div className="border rounded-lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">User</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Role</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Reason</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Blocked On</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        Loading blocked users...
                      </td>
                    </tr>
                  ) : !blockedUsers?.blocks || blockedUsers.blocks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No blocked users
                      </td>
                    </tr>
                  ) : (
                    blockedUsers.blocks.map((user) => (
                      <tr key={user.userId} className="border-t">
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium">{user.displayName}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                            {user.username && (
                              <div className="text-sm text-muted-foreground">@{user.username}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-muted-foreground line-clamp-2 max-w-xs">
                            {user.reason}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDate(user.blockedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <UserCheck className="h-4 w-4 mr-2" />
                                Unblock
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Unblock User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to unblock {user.displayName}?
                                  They will regain access to commenting and social features.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleUnblockUser(user)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  Unblock User
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          {blockedUsers?.blocks && blockedUsers.blocks.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Total blocked users: {blockedUsers.blocks.length}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Block User Dialog */}
      <Dialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-red-500" />
              Block User
            </DialogTitle>
            <DialogDescription>
              Block a user from commenting and participating in social features
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="user-id">User ID</Label>
              <Input
                id="user-id"
                type="number"
                placeholder="Enter user ID to block..."
                value={blockingUserId || ''}
                onChange={(e) => setBlockingUserId(parseInt(e.target.value) || null)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="block-reason">Reason for Blocking</Label>
              <Textarea
                id="block-reason"
                placeholder="Describe the reason for blocking this user..."
                value={blockingReason}
                onChange={(e) => setBlockingReason(e.target.value)}
                rows={3}
                required
              />
            </div>

            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="text-xs text-muted-foreground space-y-1">
                <div><strong>Note:</strong> Blocking a user will:</div>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li>Prevent them from commenting on recipes</li>
                  <li>Prevent them from submitting suggestions</li>
                  <li>Hide their existing comments (moderated flag)</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBlockDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBlockUser}
              disabled={blockUserMutation.isPending || !blockingUserId || !blockingReason.trim()}
              variant="destructive"
            >
              {blockUserMutation.isPending ? 'Blocking...' : 'Block User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
