import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WaveformDisplay } from "./WaveformDisplay";
import { AudioControls } from "./AudioControls";
import { SplitPointsList } from "./SplitPointsList";
import { Download, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import * as lamejs from "lamejs";

interface AudioEditorProps {
  audioFile: File;
  audioUrl: string;
  onReset: () => void;
}

export interface SplitPoint {
  id: string;
  time: number;
  label: string;
}

export const AudioEditor = ({ audioFile, audioUrl, onReset }: AudioEditorProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [splitPoints, setSplitPoints] = useState<SplitPoint[]>([]);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [audioUrl]);

  useEffect(() => {
    // Load audio buffer for processing
    const loadAudioBuffer = async () => {
      try {
        const arrayBuffer = await audioFile.arrayBuffer();
        const audioContext = new AudioContext();
        const buffer = await audioContext.decodeAudioData(arrayBuffer);
        setAudioBuffer(buffer);
      } catch (error) {
        console.error('Error loading audio buffer:', error);
        toast.error('Error processing audio file');
      }
    };

    loadAudioBuffer();
  }, [audioFile]);

  const addSplitPoint = (time: number) => {
    const newPoint: SplitPoint = {
      id: Math.random().toString(36),
      time,
      label: `Split ${splitPoints.length + 1}`,
    };
    
    setSplitPoints([...splitPoints, newPoint].sort((a, b) => a.time - b.time));
    toast.success(`Split point added at ${formatTime(time)}`);
  };

  const removeSplitPoint = (id: string) => {
    setSplitPoints(splitPoints.filter(point => point.id !== id));
    toast.success('Split point removed');
  };

  const downloadSegments = async () => {
    if (!audioBuffer) {
      toast.error('Audio not ready for processing');
      return;
    }

    const points = [0, ...splitPoints.map(p => p.time), duration];
    
    try {
      for (let i = 0; i < points.length - 1; i++) {
        const startTime = points[i];
        const endTime = points[i + 1];
        const segmentBuffer = await extractSegment(audioBuffer, startTime, endTime);
        const blob = await audioBufferToMp3Blob(segmentBuffer);
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${audioFile.name.replace(/\.[^/.]+$/, '')}_segment_${i + 1}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
      toast.success(`Downloaded ${points.length - 1} audio segments`);
    } catch (error) {
      console.error('Error downloading segments:', error);
      toast.error('Error processing audio segments');
    }
  };

  const extractSegment = async (buffer: AudioBuffer, startTime: number, endTime: number): Promise<AudioBuffer> => {
    const audioContext = new AudioContext();
    const startSample = Math.floor(startTime * buffer.sampleRate);
    const endSample = Math.floor(endTime * buffer.sampleRate);
    const segmentLength = endSample - startSample;
    
    const segmentBuffer = audioContext.createBuffer(
      buffer.numberOfChannels,
      segmentLength,
      buffer.sampleRate
    );
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      const segmentData = segmentBuffer.getChannelData(channel);
      
      for (let i = 0; i < segmentLength; i++) {
        segmentData[i] = channelData[startSample + i];
      }
    }
    
    return segmentBuffer;
  };

  const audioBufferToMp3Blob = async (buffer: AudioBuffer): Promise<Blob> => {
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const mp3encoder = new lamejs.Mp3Encoder(numberOfChannels, sampleRate, 128);
    
    const mp3Data = [];
    const sampleBlockSize = 1152;
    
    // Convert float32 to int16
    const leftChannel = buffer.getChannelData(0);
    const rightChannel = numberOfChannels > 1 ? buffer.getChannelData(1) : leftChannel;
    
    const left = new Int16Array(leftChannel.length);
    const right = new Int16Array(rightChannel.length);
    
    for (let i = 0; i < leftChannel.length; i++) {
      left[i] = Math.max(-32768, Math.min(32767, leftChannel[i] * 32768));
      right[i] = Math.max(-32768, Math.min(32767, rightChannel[i] * 32768));
    }
    
    // Encode in chunks
    for (let i = 0; i < left.length; i += sampleBlockSize) {
      const leftChunk = left.subarray(i, i + sampleBlockSize);
      const rightChunk = right.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
      
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }
    
    // Finalize encoding
    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
    
    return new Blob(mp3Data, { type: 'audio/mp3' });
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card border-border/50 shadow-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-semibold text-foreground">
              {audioFile.name}
            </h3>
            <p className="text-muted-foreground">
              Duration: {formatTime(duration)} • {splitPoints.length} split points
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={downloadSegments}
              disabled={splitPoints.length === 0}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Segments
            </Button>
            <Button
              onClick={onReset}
              variant="outline"
              className="border-border/50 hover:bg-secondary"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
        
        <AudioControls
          audioRef={audioRef}
          audioUrl={audioUrl}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          currentTime={currentTime}
          duration={duration}
        />
        
        <WaveformDisplay
          audioUrl={audioUrl}
          audioBuffer={audioBuffer}
          duration={duration}
          currentTime={currentTime}
          splitPoints={splitPoints}
          onAddSplitPoint={addSplitPoint}
        />
      </Card>
      
      {splitPoints.length > 0 && (
        <SplitPointsList
          splitPoints={splitPoints}
          onRemoveSplitPoint={removeSplitPoint}
          duration={duration}
        />
      )}
      
      <audio ref={audioRef} src={audioUrl} />
    </div>
  );
};