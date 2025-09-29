import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { VideoEditor } from "@/components/VideoEditor";
import { toast } from "sonner";

const VideoSplitter = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('video/')) {
      toast.error("Upload een video bestand (MP4, WebM, MOV, etc.)");
      return;
    }

    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    toast.success("Video bestand geladen!");
  };

  const handleReset = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoFile(null);
    setVideoUrl(null);
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-accent bg-clip-text text-transparent mb-2">
            Video Splitter
          </h1>
          <p className="text-sm text-muted-foreground/60 mb-4">by Patatties</p>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Upload je video, stel splitpunten in, en download individuele segmenten met gemak.
          </p>
          
          <div className="max-w-md mx-auto mb-6">
            <div className="bg-card/50 backdrop-blur-sm rounded-lg p-6 border border-border/50">
              <h2 className="text-lg font-semibold mb-4 text-foreground">Hoe het werkt:</h2>
              <ol className="text-left space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-medium">1</span>
                  Upload je video (MP4, WebM, MOV)
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-medium">2</span>
                  Bepaal je splitpunten
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-medium">3</span>
                  Druk op download video segmenten
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-medium">4</span>
                  De downloads volgen elkaar op
                </li>
              </ol>
            </div>
          </div>

          <p className="text-sm text-muted-foreground/80 max-w-lg mx-auto">
            🔒 Alle verwerking gebeurt in je browser. We slaan geen data of video's op.
          </p>
        </header>

        {!videoFile ? (
          <FileUpload onFileUpload={handleFileUpload} acceptedTypes="video" label="video" />
        ) : (
          <VideoEditor 
            videoFile={videoFile} 
            videoUrl={videoUrl!} 
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
};

export default VideoSplitter;
