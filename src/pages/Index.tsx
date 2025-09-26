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
          <h1 className="text-5xl font-bold bg-gradient-accent bg-clip-text text-transparent mb-4">
            AudioSplit Pro
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional MP3 splitting tool. Upload your audio file, set split points, and download individual segments.
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