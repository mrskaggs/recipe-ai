import React, { useState } from 'react';
import { Flag, Loader2, AlertTriangle } from 'lucide-react';
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

interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: 'comment' | 'chat_message' | 'profile' | 'other';
  contentId: number;
  recipeId: number;
}

const reportReasons = [
  { value: 'spam', label: 'Spam or unwanted content' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'inappropriate', label: 'Inappropriate or offensive content' },
  { value: 'offensive', label: 'Hate speech or offensive language' },
  { value: 'other', label: 'Other (please specify)' },
];

const ReportDialog: React.FC<ReportDialogProps> = ({
  isOpen,
  onClose,
  contentType,
  contentId,
}) => {
  const { submitContentReport } = useSocialStore();
  const { addToast } = useToasts();
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      addToast({
        type: 'error',
        title: 'Reason Required',
        description: 'Please select a reason for your report.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await submitContentReport({
        contentType,
        contentId,
        reason: selectedReason as any,
        description: description.trim() || undefined,
      });

      addToast({
        type: 'success',
        title: 'Report Submitted',
        description: 'Thank you for helping keep our community safe. We will review this report soon.',
      });

      handleClose();
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Report Failed',
        description: 'Failed to submit your report. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setDescription('');
    setIsSubmitting(false);
    onClose();
  };

  const getContentTypeLabel = () => {
    switch (contentType) {
      case 'comment':
        return 'comment';
      case 'chat_message':
        return 'chat message';
      case 'profile':
        return 'profile';
      default:
        return 'content';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Flag className="h-5 w-5 text-destructive" />
            <span>Report {getContentTypeLabel()}</span>
          </DialogTitle>
          <DialogDescription>
            Help us keep our community safe by reporting content that violates our community guidelines.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Report Reason */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Why are you reporting this {getContentTypeLabel()}?</Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {reportReasons.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Description */}
          {(selectedReason === 'other' || selectedReason === 'harassment' || selectedReason === 'offensive') && (
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Additional details (optional)
              </Label>
              <Textarea
                id="description"
                placeholder="Please provide more details about why this content should be reported..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[80px] resize-none"
                maxLength={500}
              />
              <div className="text-xs text-muted-foreground">
                {description.length}/500 characters
              </div>
            </div>
          )}

          {/* Important Note */}
          <div className="flex items-start space-x-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium">Important:</p>
              <p>All reports are reviewed by moderators. False reports may result in account restrictions.</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedReason || isSubmitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              <>
                <Flag className="h-4 w-4 mr-2" />
                Submit Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;
