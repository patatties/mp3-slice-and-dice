import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WaveformDisplay } from "./WaveformDisplay";
import { AudioControls } from "./AudioControls";
import { SplitPointsList } from "./SplitPointsList";
import { Download, RotateCcw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
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
  // Only support MP3 format
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [isFfmpegLoading, setIsFfmpegLoading] = useState(false);
  const [isEncoding, setIsEncoding] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isStartingDownload, setIsStartingDownload] = useState(false);

  useEffect(() => {
    // Always load FFmpeg since we only support MP3
    ensureFfmpeg().catch(() => {});
  }, []);

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

  const updateSplitPoint = (id: string, newTime: number) => {
    setSplitPoints(splitPoints.map(point => 
      point.id === id ? { ...point, time: Math.max(0, Math.min(duration, newTime)) } : point
    ).sort((a, b) => a.time - b.time));
    toast.success('Split point updated');
  };

  const downloadSegments = async () => {
    if (!audioBuffer) {
      toast.error('Audio not ready for processing');
      return;
    }

    const points = [0, ...splitPoints.map(p => p.time), duration];
    
    try {
      setIsStartingDownload(true);
      setIsEncoding(true);
      setProcessingProgress(0);
      await ensureFfmpeg();

      // First, process all segments
      const segmentBlobs: { blob: Blob; filename: string }[] = [];
      
      for (let i = 0; i < points.length - 1; i++) {
        const startTime = points[i];
        const endTime = points[i + 1];
        const segmentBuffer = await extractSegment(audioBuffer, startTime, endTime);
        const blob = await audioBufferToMp3Blob(segmentBuffer);
        
        const filename = `${audioFile.name.replace(/\.[^/.]+$/, '')}_segment_${i + 1}.mp3`;
        segmentBlobs.push({ blob, filename });
        
        // Update progress
        const progress = ((i + 1) / (points.length - 1)) * 100;
        setProcessingProgress(progress);
      }
      
      toast.success('All segments processed! Starting downloads...');
      
      // Now download all segments at once
      segmentBlobs.forEach(({ blob, filename }) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
      
      toast.success(`Downloaded ${segmentBlobs.length} MP3 segments`);
    } catch (error) {
      console.error('Error downloading segments:', error);
      toast.error('Error processing audio segments');
    } finally {
      setIsEncoding(false);
      setProcessingProgress(0);
      setIsStartingDownload(false);
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

  // Removed WAV support - only MP3 now

  const ensureFfmpeg = async (): Promise<FFmpeg> => {
    if (ffmpegRef.current) return ffmpegRef.current;
    setIsFfmpegLoading(true);

    const ffmpeg = new FFmpeg();
    try {
      // Debug logs to help trace loading/encoding
      try {
        ffmpeg.on('log', ({ message }) => console.debug('[ffmpeg]', message));
        ffmpeg.on('progress', ({ progress, time }) => console.debug('[ffmpeg-progress]', progress, time));
      } catch {}

      const loadWithBase = async (base: string) => {
        await ffmpeg.load({
          coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
          workerURL: await toBlobURL(`${base}/ffmpeg-core.worker.js`, 'text/javascript'),
        });
      };

      try {
        // 1) Preferred: jsDelivr (dist for all three files)
        await loadWithBase('https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist');
      } catch (e1) {
        console.warn('FFmpeg load failed from jsDelivr/dist, trying unpkg/dist', e1);
        try {
          // 2) Fallback: unpkg (dist)
          await loadWithBase('https://unpkg.com/@ffmpeg/core@0.12.6/dist');
        } catch (e2) {
          console.warn('FFmpeg load failed from unpkg/dist, trying mixed esm/dist', e2);
          // 3) Last resort: esm for core/wasm + dist for worker
          await ffmpeg.load({
            coreURL: await toBlobURL('https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js', 'text/javascript'),
            wasmURL: await toBlobURL('https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm', 'application/wasm'),
            workerURL: await toBlobURL('https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/ffmpeg-core.worker.js', 'text/javascript'),
          });
        }
      }

      ffmpegRef.current = ffmpeg;
      return ffmpeg;
    } catch (e) {
      console.error('FFmpeg load failed on all strategies', e);
      toast.error('Kon MP3-encoder niet laden. Controleer je netwerk of adblockers.');
      throw e;
    } finally {
      setIsFfmpegLoading(false);
    }
  };

  const audioBufferToMp3Blob = async (buffer: AudioBuffer): Promise<Blob> => {
    const ffmpeg = await ensureFfmpeg();

    // Create WAV blob for FFmpeg input
    const wavBlob = await createWavBlob(buffer);
    const wavBytes = new Uint8Array(await wavBlob.arrayBuffer());
    await ffmpeg.writeFile('input.wav', wavBytes);

    try {
      await ffmpeg.exec(['-i', 'input.wav', '-c:a', 'libmp3lame', '-b:a', '192k', 'output.mp3']);
      const mp3Data = await ffmpeg.readFile('output.mp3');
      return new Blob([mp3Data as Uint8Array], { type: 'audio/mpeg' });
    } finally {
      // Best effort cleanup
      try { await (ffmpeg as any).deleteFile('input.wav'); } catch {}
      try { await (ffmpeg as any).deleteFile('output.mp3'); } catch {}
    }
  };

  const createWavBlob = (buffer: AudioBuffer): Blob => {
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
            <div className="flex flex-col gap-2">
              <Button
                onClick={downloadSegments}
                disabled={splitPoints.length === 0 || isFfmpegLoading || isEncoding || isStartingDownload}
                className="bg-accent hover:bg-accent/90 text-accent-foreground relative"
              >
                {isStartingDownload && (
                  <div className="absolute inset-0 flex items-center justify-center bg-accent/90 rounded-md">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-accent-foreground/30 border-t-accent-foreground"></div>
                  </div>
                )}
                <Download className="h-4 w-4 mr-2" />
                {isFfmpegLoading
                  ? 'MP3 encoder laden...'
                  : isStartingDownload
                    ? 'Voorbereiden...'
                    : isEncoding
                      ? 'MP3 encoderen...'
                      : 'Download MP3 segmenten'}
              </Button>
              {isEncoding && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Progress value={processingProgress} className="w-24" />
                  <span>{Math.round(processingProgress)}%</span>
                </div>
              )}
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
          onUpdateSplitPoint={updateSplitPoint}
        />
      </Card>
      
      {splitPoints.length > 0 && (
        <SplitPointsList
          splitPoints={splitPoints}
          onRemoveSplitPoint={removeSplitPoint}
          onAddSplitPoint={addSplitPoint}
          duration={duration}
        />
      )}
      
      <audio ref={audioRef} src={audioUrl} />
    </div>
  );
};