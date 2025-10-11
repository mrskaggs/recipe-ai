import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { http } from '../../../lib/http';
import { Flag, Eye, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Report {
  id: number;
  contentType: string;
  contentId: number;
  reason: string;
  description: string | null;
  status: string;
  reviewedBy: number | null;
  reviewedAt: string | null;
  actionTaken: string | null;
  createdAt: string;
  reporter: {
    id: number;
    displayName: string;
  };
  reportedUser: {
    id: number;
    displayName: string;
  };
}

interface ReportsResponse {
  reports: Report[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const ReportManagement = () => {
  const [page, setPage] = useState(1);
  const [reviewingReport, setReviewingReport] = useState<Report | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState('');
  const [actionDescription, setActionDescription] = useState('');
  const queryClient = useQueryClient();

  // Fetch reports
  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['admin-reports', page],
    queryFn: async () => {
      const response = await http.get<ReportsResponse>(`/social/reports?page=${page}&limit=10`);
      return response.data;
    },
  });

  // Review report mutation
  const reviewReportMutation = useMutation({
    mutationFn: async ({ reportId, action, actionTaken }: {
      reportId: number;
      action: string;
      actionTaken: string;
    }) => {
      const response = await http.put(`/social/reports/${reportId}`, {
        action,
        actionTaken,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      setIsReviewDialogOpen(false);
      setReviewingReport(null);
      setSelectedAction('');
      setActionDescription('');
      toast.success('Report reviewed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to review report');
    },
  });

  const handleReviewReport = (report: Report) => {
    setReviewingReport(report);
    setSelectedAction('');
    setActionDescription('');
    setIsReviewDialogOpen(true);
  };

  const handleSubmitReview = () => {
    if (!reviewingReport || !selectedAction || !actionDescription.trim()) return;

    reviewReportMutation.mutate({
      reportId: reviewingReport.id,
      action: selectedAction,
      actionTaken: actionDescription,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getReasonBadgeVariant = (reason: string) => {
    switch (reason) {
      case 'spam':
        return 'secondary';
      case 'harassment':
      case 'offensive':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Report Management
          </CardTitle>
          <CardDescription>
            Review and manage user reports of inappropriate content
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Reports Table */}
          <div className="border rounded-lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Report Details</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Reason</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Reported By</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        Loading reports...
                      </td>
                    </tr>
                  ) : reportsData?.reports.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No pending reports
                      </td>
                    </tr>
                  ) : (
                    reportsData?.reports.map((report) => (
                      <tr key={report.id} className="border-t">
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium">
                              {report.contentType} report
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Reported user: <span className="font-medium">{report.reportedUser.displayName}</span>
                            </div>
                            {report.description && (
                              <div className="text-sm text-muted-foreground line-clamp-2">
                                "{report.description}"
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={getReasonBadgeVariant(report.reason)}>
                            {report.reason}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            {report.reporter.displayName}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDate(report.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReviewReport(report)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Review
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {reportsData && reportsData.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, reportsData.total)} of {reportsData.total} reports
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {page} of {reportsData.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === reportsData.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Report Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Review Report
            </DialogTitle>
            <DialogDescription>
              Take action on this reported content
            </DialogDescription>
          </DialogHeader>

          {reviewingReport && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="text-sm font-medium mb-1">
                  Report: {reviewingReport.contentType}
                </div>
                <div className="text-sm text-muted-foreground mb-1">
                  Reason: <Badge variant={getReasonBadgeVariant(reviewingReport.reason)} className="text-xs">
                    {reviewingReport.reason}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Reported user: {reviewingReport.reportedUser.displayName}
                </div>
                {reviewingReport.description && (
                  <div className="text-sm text-muted-foreground mt-1">
                    "{reviewingReport.description}"
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="action">Action Taken</Label>
                <Select value={selectedAction} onValueChange={setSelectedAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an action..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warn_user">
                      Warn/notify user only
                    </SelectItem>
                    <SelectItem value="ban_user">
                      Block user from commenting
                    </SelectItem>
                    <SelectItem value="moderate_content">
                      Moderate/hide content
                    </SelectItem>
                    <SelectItem value="dismiss">
                      Dismiss report (no action)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="action-description">Action Description</Label>
                <Textarea
                  id="action-description"
                  placeholder="Describe the action taken..."
                  value={actionDescription}
                  onChange={(e) => setActionDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsReviewDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={reviewReportMutation.isPending || !selectedAction || !actionDescription.trim()}
            >
              {reviewReportMutation.isPending ? 'Processing...' : 'Submit Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
