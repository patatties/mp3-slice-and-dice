import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Music } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  acceptedTypes?: 'audio' | 'video';
  label?: string;
}

export const FileUpload = ({ onFileUpload, acceptedTypes = 'audio', label }: FileUploadProps) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileUpload(acceptedFiles[0]);
      }
    },
    [onFileUpload]
  );

  const acceptConfig = acceptedTypes === 'audio' 
    ? { 'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.ogg'] }
    : { 'video/*': ['.mp4', '.webm', '.mov', '.avi', '.mkv'] };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptConfig,
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
                  {isDragActive 
                    ? `Drop your ${label || acceptedTypes} file here` 
                    : `Upload ${label || acceptedTypes} File`}
                </h3>
                <p className="text-muted-foreground">
                  {acceptedTypes === 'audio' 
                    ? "Drag and drop your MP3, WAV, or other audio file here, or click to browse"
                    : "Drag and drop your MP4, WebM, MOV, or other video file here, or click to browse"}
                </p>
              </div>
              
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Choose File
              </Button>
              
              <div className="text-sm text-muted-foreground">
                {acceptedTypes === 'audio' 
                  ? "Supported formats: MP3, WAV, M4A, AAC, OGG"
                  : "Supported formats: MP4, WebM, MOV, AVI, MKV"}
              </div>
            </div>
        </div>
      </Card>
    </div>
  );
};