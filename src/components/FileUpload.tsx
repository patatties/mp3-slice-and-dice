import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Music } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileUpload: (file: File) => void;
}

export const FileUpload = ({ onFileUpload }: FileUploadProps) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileUpload(acceptedFiles[0]);
      }
    },
    [onFileUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.ogg']
    },
    multiple: false,
  });

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="bg-gradient-card border-border/50 shadow-card">
        <div
          {...getRootProps()}
          className={cn(
            "p-12 text-center cursor-pointer transition-all duration-300",
            "hover:shadow-glow hover:border-primary/50",
            isDragActive && "border-primary shadow-glow"
          )}
        >
          <input {...getInputProps()} />
          
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="p-6 rounded-full bg-gradient-accent">
                {isDragActive ? (
                  <Upload className="h-12 w-12 text-white" />
                ) : (
                  <Music className="h-12 w-12 text-white" />
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold">
                {isDragActive ? "Drop your audio file here" : "Upload MP3 File"}
              </h3>
              <p className="text-muted-foreground">
                Drag and drop your MP3, WAV, or other audio file here, or click to browse
              </p>
            </div>
            
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Choose File
            </Button>
            
            <div className="text-sm text-muted-foreground space-y-1">
              <div>Supported formats: MP3, WAV, M4A, AAC, OGG</div>
              <div className="flex items-center justify-center gap-1 text-xs">
                🔒 <span className="text-primary">Your files stay private</span> - everything is processed locally in your browser
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};