import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface DeleteConfirmDialogProps {
  file: { name: string; path: string; sha: string; type: "file" | "dir" };
  owner: string;
  repo: string;
  branch: string;
  onClose: () => void;
  onDelete: () => void;
}

export function DeleteConfirmDialog({
  file,
  owner,
  repo,
  branch,
  onClose,
  onDelete,
}: DeleteConfirmDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-file', {
        body: {
          owner,
          repo,
          path: file.path,
          sha: file.sha,
          message: `Delete ${file.name}`,
          branch,
        }
      });

      if (error) {
        console.error('Error deleting file:', error);
        toast({
          title: "Deletion failed",
          description: "Could not delete the file. Please try again.",
          variant: "destructive",
        });
        return;
      }

      onDelete();
    } catch (err) {
      console.error('Exception deleting file:', err);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {file.type === "dir" ? "Folder" : "File"}?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{file.name}</strong>?
            {file.type === "dir" && (
              <span className="block mt-2 text-destructive">
                This will delete the folder and all its contents.
              </span>
            )}
            <span className="block mt-2">
              This action cannot be undone.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
