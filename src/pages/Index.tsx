import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { AudioEditor } from "@/components/AudioEditor";
import { toast } from "sonner";

const Index = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('audio/')) {
      toast.error("Please upload an MP3 or audio file");
      return;
    }

    setAudioFile(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    toast.success("Audio file loaded successfully!");
  };

  const handleReset = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioFile(null);
    setAudioUrl(null);
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-accent bg-clip-text text-transparent mb-2">
            Audio Splitter
          </h1>
          <p className="text-sm text-muted-foreground/60 mb-4">by Patatties</p>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Upload your audio, set split points, and download individual segments with ease.
          </p>
          
          <div className="max-w-md mx-auto mb-6">
            <div className="bg-card/50 backdrop-blur-sm rounded-lg p-6 border border-border/50">
              <h2 className="text-lg font-semibold mb-4 text-foreground">How it works:</h2>
              <ol className="text-left space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-medium">1</span>
                  Upload your MP3
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-medium">2</span>
                  Decide your split points
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-medium">3</span>
                  Press download MP3 segments
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-medium">4</span>
                  The downloads will come one after the other
                </li>
              </ol>
            </div>
          </div>

          <p className="text-sm text-muted-foreground/80 max-w-lg mx-auto">
            🔒 All processing happens in your browser. We don't store any data or MP3 files.
          </p>
        </header>

        {!audioFile ? (
          <FileUpload onFileUpload={handleFileUpload} />
        ) : (
          <AudioEditor 
            audioFile={audioFile} 
            audioUrl={audioUrl!} 
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
};

export default Index;