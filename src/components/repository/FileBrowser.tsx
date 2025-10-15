import { 
  Folder, 
  FileCode, 
  FileImage, 
  FileText, 
  File, 
  Eye, 
  Pencil, 
  Download, 
  Trash2 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface FileItem {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: "file" | "dir";
  download_url?: string;
}

interface FileBrowserProps {
  files: FileItem[];
  isLoading: boolean;
  onFileClick: (file: FileItem) => void;
  onEdit: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
  onDownload: (file: FileItem) => void;
}

const getFileIcon = (file: FileItem) => {
  if (file.type === 'dir') return Folder;
  
  const ext = file.name.split('.').pop()?.toLowerCase();
  
  if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'go', 'rs'].includes(ext || '')) {
    return FileCode;
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '')) {
    return FileImage;
  }
  if (['md', 'txt', 'json', 'xml', 'yaml', 'yml'].includes(ext || '')) {
    return FileText;
  }
  
  return File;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

export function FileBrowser({ 
  files, 
  isLoading, 
  onFileClick, 
  onEdit, 
  onDelete, 
  onDownload 
}: FileBrowserProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="shadow-elevated">
            <CardContent className="p-4">
              <Skeleton className="h-12 w-12 rounded mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <Card className="shadow-elevated gradient-card">
        <CardContent className="py-16 text-center">
          <Folder className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-lg font-medium mb-2">This folder is empty</p>
          <p className="text-muted-foreground">
            Tap + to add files or create a new folder
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {files.map((file) => {
        const Icon = getFileIcon(file);
        const isFolder = file.type === 'dir';

        return (
          <Card 
            key={file.sha} 
            className="shadow-elevated gradient-card hover:shadow-glow transition-smooth group cursor-pointer"
            onClick={() => onFileClick(file)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <Icon className={`h-10 w-10 ${isFolder ? 'text-primary' : 'text-muted-foreground'}`} />
                
                {!isFolder && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFileClick(file);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(file);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload(file);
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(file);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <p className="font-medium text-sm truncate mb-1" title={file.name}>
                  {file.name}
                </p>
                {!isFolder && (
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
