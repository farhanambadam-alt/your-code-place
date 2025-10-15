import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface FileEditorModalProps {
  file: { name: string; path: string; sha: string; download_url?: string };
  owner: string;
  repo: string;
  branch: string;
  onClose: () => void;
  onSave: () => void;
}

export function FileEditorModal({
  file,
  owner,
  repo,
  branch,
  onClose,
  onSave,
}: FileEditorModalProps) {
  const [content, setContent] = useState("");
  const [commitMessage, setCommitMessage] = useState(`Update ${file.name}`);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchFileContent();
  }, [file.path]);

  const fetchFileContent = async () => {
    setIsLoading(true);
    try {
      if (!file.download_url) {
        toast({
          title: "Cannot edit file",
          description: "This file type can't be edited here.",
          variant: "destructive",
        });
        onClose();
        return;
      }

      // Add cache-busting to ensure fresh content
      const url = `${file.download_url}${file.download_url.includes('?') ? '&' : '?'}_t=${Date.now()}`;
      const response = await fetch(url, { cache: 'no-store' });
      
      if (!response.ok) {
        const { getHumanFriendlyError } = await import('@/lib/error-messages');
        const friendlyError = getHumanFriendlyError({
          status: response.status,
          operation: 'fetch'
        });
        toast({
          title: friendlyError.title,
          description: friendlyError.description,
          variant: "destructive",
        });
        return;
      }
      
      const text = await response.text();
      setContent(text);
    } catch (err) {
      console.error('Error fetching file content:', err);
      const { getHumanFriendlyError, extractErrorMessage } = await import('@/lib/error-messages');
      const friendlyError = getHumanFriendlyError({
        message: extractErrorMessage(err),
        operation: 'fetch'
      });
      toast({
        title: friendlyError.title,
        description: friendlyError.description,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-file', {
        body: {
          owner,
          repo,
          path: file.path,
          content,
          sha: file.sha,
          message: commitMessage,
          branch,
        }
      });

      if (error) {
        console.error('Error updating file:', error);
        const { getHumanFriendlyError, extractErrorStatus, extractErrorMessage } = await import('@/lib/error-messages');
        const friendlyError = getHumanFriendlyError({
          status: extractErrorStatus(error),
          message: extractErrorMessage(error),
          operation: 'update'
        });
        toast({
          title: friendlyError.title,
          description: friendlyError.description,
          variant: "destructive",
        });
        return;
      }

      onSave();
    } catch (err) {
      console.error('Exception updating file:', err);
      const { getHumanFriendlyError, extractErrorMessage } = await import('@/lib/error-messages');
      const friendlyError = getHumanFriendlyError({
        message: extractErrorMessage(err),
        operation: 'update'
      });
      toast({
        title: friendlyError.title,
        description: friendlyError.description,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit {file.name}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="commit-message">Commit Message</Label>
                <Input
                  id="commit-message"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Update file..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file-content">File Content</Label>
                <Textarea
                  id="file-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="font-mono text-sm min-h-[400px]"
                  placeholder="File content..."
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
