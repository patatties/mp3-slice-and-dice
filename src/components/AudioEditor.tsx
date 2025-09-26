import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WaveformDisplay } from "./WaveformDisplay";
import { AudioControls } from "./AudioControls";
import { SplitPointsList } from "./SplitPointsList";
import { Download, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

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
  const [selectedFormat, setSelectedFormat] = useState<'wav' | 'mp3'>('wav');
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [isFfmpegLoading, setIsFfmpegLoading] = useState(false);
  const [isEncoding, setIsEncoding] = useState(false);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    if (selectedFormat === 'mp3') {
      ensureFfmpeg().catch(() => {});
    }
  }, [selectedFormat]);

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
    const fileExtension = selectedFormat;
    
    try {
      setIsEncoding(true);
      // Preload encoder if MP3 selected
      if (selectedFormat === 'mp3') {
        await ensureFfmpeg();
      }

      for (let i = 0; i < points.length - 1; i++) {
        const startTime = points[i];
        const endTime = points[i + 1];
        const segmentBuffer = await extractSegment(audioBuffer, startTime, endTime);
        const blob = await audioBufferToBlob(segmentBuffer, selectedFormat);
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${audioFile.name.replace(/\.[^/.]+$/, '')}_segment_${i + 1}.${fileExtension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
      toast.success(`Downloaded ${points.length - 1} ${selectedFormat.toUpperCase()} segments`);
    } catch (error) {
      console.error('Error downloading segments:', error);
      toast.error('Error processing audio segments');
    } finally {
      setIsEncoding(false);
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

  const audioBufferToBlob = async (buffer: AudioBuffer, format: 'wav' | 'mp3' = 'wav'): Promise<Blob> => {
    if (format === 'mp3') {
      return audioBufferToMp3Blob(buffer);
    }
    
    const numberOfChannels = buffer.numberOfChannels;
    const length = buffer.length * numberOfChannels * 2;
    const arrayBuffer = new ArrayBuffer(length + 44);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, length + 36, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);
    
    // Audio data
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  const ensureFfmpeg = async (): Promise<FFmpeg> => {
    if (ffmpegRef.current) return ffmpegRef.current;
    setIsFfmpegLoading(true);
    try {
      const ffmpeg = new FFmpeg();
      const base = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
        workerURL: await toBlobURL(`${base}/ffmpeg-core.worker.js`, 'text/javascript'),
      });
      ffmpegRef.current = ffmpeg;
      return ffmpeg;
    } catch (e) {
      console.error('FFmpeg load failed', e);
      toast.error('Kon MP3-encoder niet laden');
      throw e;
    } finally {
      setIsFfmpegLoading(false);
    }
  };

  const audioBufferToMp3Blob = async (buffer: AudioBuffer): Promise<Blob> => {
    const ffmpeg = await ensureFfmpeg();
    const wavBlob = await audioBufferToBlob(buffer, 'wav');
    const wavBytes = new Uint8Array(await wavBlob.arrayBuffer());
    await ffmpeg.writeFile('input.wav', wavBytes);
    await ffmpeg.exec(['-i', 'input.wav', '-c:a', 'libmp3lame', '-b:a', '192k', 'output.mp3']);
    const mp3Data = await ffmpeg.readFile('output.mp3');
    return new Blob([mp3Data as Uint8Array], { type: 'audio/mpeg' });
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
            <div className="flex items-center gap-2">
              <Select value={selectedFormat} onValueChange={(value: 'wav' | 'mp3') => setSelectedFormat(value)}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wav">WAV</SelectItem>
                  <SelectItem value="mp3">MP3</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={downloadSegments}
                disabled={splitPoints.length === 0 || (selectedFormat === 'mp3' && (isFfmpegLoading || isEncoding))}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                <Download className="h-4 w-4 mr-2" />
                {selectedFormat === 'mp3'
                  ? isFfmpegLoading
                    ? 'MP3 encoder laden...'
                    : isEncoding
                      ? 'MP3 encoderen...'
                      : 'Download MP3-segmenten'
                  : 'Download Segments'}
              </Button>
            </div>
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
          volume={volume}
          setVolume={setVolume}
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