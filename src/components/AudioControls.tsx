import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";

interface AudioControlsProps {
  audioRef: React.RefObject<HTMLAudioElement>;
  audioUrl: string;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTime: number;
  duration: number;
  volume: number;
  setVolume: (volume: number) => void;
}

export const AudioControls = ({
  audioRef,
  isPlaying,
  setIsPlaying,
  currentTime,
  duration,
  volume,
  setVolume,
}: AudioControlsProps) => {
  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (values: number[]) => {
    const audio = audioRef.current;
    if (!audio || duration === 0) return;

    const newTime = (values[0] / 100) * duration;
    audio.currentTime = newTime;
  };

  const handleSkip = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds));
  };

  const handleVolumeChange = (values: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newVolume = values[0] / 100;
    audio.volume = newVolume;
    setVolume(newVolume);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSkip(-10)}
          className="hover:bg-secondary"
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        
        <Button
          onClick={handlePlayPause}
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground w-16 h-16 rounded-full"
        >
          {isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6 ml-1" />
          )}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSkip(10)}
          className="hover:bg-secondary"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-2">
        <Slider
          value={[progress]}
          onValueChange={handleSeek}
          max={100}
          step={0.1}
          className="w-full"
        />
        
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-3 mt-4">
        <Volume2 className="h-4 w-4 text-muted-foreground" />
        <Slider
          value={[volume * 100]}
          onValueChange={handleVolumeChange}
          max={100}
          step={1}
          className="w-24"
        />
        <span className="text-sm text-muted-foreground w-8">
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
};