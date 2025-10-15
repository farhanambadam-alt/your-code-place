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
import { Pencil, Download, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface FileViewerModalProps {
  file: { name: string; path: string; sha: string; download_url?: string };
  owner: string;
  repo: string;
  branch: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDownload: () => void;
}

export function FileViewerModal({
  file,
  owner,
  repo,
  branch,
  onClose,
  onEdit,
  onDelete,
  onDownload,
}: FileViewerModalProps) {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isBinary, setIsBinary] = useState(false);

  useEffect(() => {
    fetchFileContent();
  }, [file.path]);

  const fetchFileContent = async () => {
    setIsLoading(true);
    try {
      if (!file.download_url) {
        setIsBinary(true);
        setIsLoading(false);
        return;
      }

      const response = await fetch(file.download_url);
      const text = await response.text();

      // Simple binary detection
      if (text.includes('\0')) {
        setIsBinary(true);
      } else {
        setContent(text);
      }
    } catch (err) {
      console.error('Error fetching file content:', err);
      toast({
        title: "Failed to load file",
        description: "Could not fetch file content.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{file.name}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isBinary ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Cannot preview binary file</p>
              <p className="text-sm text-muted-foreground mt-2">
                Download the file to view its contents
              </p>
            </div>
          ) : (
            <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm font-mono">
              {content}
            </pre>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" onClick={onDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
          <Button onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
