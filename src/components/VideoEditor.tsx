import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VideoTimelineDisplay } from "./VideoTimelineDisplay";
import { VideoControls } from "./VideoControls";
import { VideoSplitPointsList } from "./VideoSplitPointsList";
import { Download, RotateCcw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

interface VideoEditorProps {
  videoFile: File;
  videoUrl: string;
  onReset: () => void;
}

export interface SplitPoint {
  id: string;
  time: number;
  label: string;
}

export const VideoEditor = ({ videoFile, videoUrl, onReset }: VideoEditorProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [splitPoints, setSplitPoints] = useState<SplitPoint[]>([]);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [isFfmpegLoading, setIsFfmpegLoading] = useState(false);
  const [isEncoding, setIsEncoding] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isStartingDownload, setIsStartingDownload] = useState(false);
  const [buttonClicked, setButtonClicked] = useState(false);
  const [isDownloadingSegment, setIsDownloadingSegment] = useState(false);

  useEffect(() => {
    ensureFfmpeg().catch(() => {});
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [videoUrl]);

  const addSplitPoint = (time: number) => {
    const newPoint: SplitPoint = {
      id: Math.random().toString(36),
      time,
      label: `Split ${splitPoints.length + 1}`,
    };
    
    setSplitPoints([...splitPoints, newPoint].sort((a, b) => a.time - b.time));
    toast.success(`Split punt toegevoegd op ${formatTime(time)}`);
  };

  const removeSplitPoint = (id: string) => {
    setSplitPoints(splitPoints.filter(point => point.id !== id));
    toast.success('Split punt verwijderd');
  };

  const updateSplitPoint = (id: string, newTime: number) => {
    setSplitPoints(splitPoints.map(point => 
      point.id === id ? { ...point, time: Math.max(0, Math.min(duration, newTime)) } : point
    ).sort((a, b) => a.time - b.time));
    toast.success('Split punt bijgewerkt');
  };

  const handleDownloadClick = () => {
    setButtonClicked(true);
    downloadSegments();
  };

  const downloadSegments = async () => {
    const points = [0, ...splitPoints.map(p => p.time), duration];
    
    try {
      setIsStartingDownload(true);
      setIsEncoding(true);
      setProcessingProgress(0);
      const ffmpeg = await ensureFfmpeg();

      // Load video file into FFmpeg
      await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));

      const segmentBlobs: { blob: Blob; filename: string }[] = [];
      
      for (let i = 0; i < points.length - 1; i++) {
        const startTime = points[i];
        const endTime = points[i + 1];
        
        // Use FFmpeg to extract segment
        const outputFilename = `segment_${i + 1}.mp4`;
        await ffmpeg.exec([
          '-i', 'input.mp4',
          '-ss', startTime.toString(),
          '-to', endTime.toString(),
          '-c', 'copy',
          outputFilename
        ]);
        
        const data = await ffmpeg.readFile(outputFilename);
        const blob = new Blob([data as Uint8Array], { type: 'video/mp4' });
        
        const filename = `${videoFile.name.replace(/\.[^/.]+$/, '')}_segment_${i + 1}.mp4`;
        segmentBlobs.push({ blob, filename });
        
        // Cleanup
        try { await (ffmpeg as any).deleteFile(outputFilename); } catch {}
        
        const progress = ((i + 1) / (points.length - 1)) * 100;
        setProcessingProgress(progress);
      }
      
      // Cleanup input file
      try { await (ffmpeg as any).deleteFile('input.mp4'); } catch {}
      
      toast.success('Alle segmenten verwerkt! Downloads starten...');
      
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
      
      toast.success(`${segmentBlobs.length} video segmenten gedownload`);
    } catch (error) {
      console.error('Error downloading segments:', error);
      toast.error('Fout bij verwerken video segmenten');
    } finally {
      setIsEncoding(false);
      setProcessingProgress(0);
      setIsStartingDownload(false);
      setButtonClicked(false);
    }
  };

  const downloadSingleSegment = async (startTime: number, endTime: number, segmentIndex: number) => {
    try {
      setIsDownloadingSegment(true);
      const ffmpeg = await ensureFfmpeg();

      await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
      
      const outputFilename = 'segment.mp4';
      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-ss', startTime.toString(),
        '-to', endTime.toString(),
        '-c', 'copy',
        outputFilename
      ]);
      
      const data = await ffmpeg.readFile(outputFilename);
      const blob = new Blob([data as Uint8Array], { type: 'video/mp4' });
      
      const filename = `${videoFile.name.replace(/\.[^/.]+$/, '')}_segment_${segmentIndex}.mp4`;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Cleanup
      try { await (ffmpeg as any).deleteFile('input.mp4'); } catch {}
      try { await (ffmpeg as any).deleteFile(outputFilename); } catch {}
      
      toast.success(`Segment ${segmentIndex} gedownload!`);
    } catch (error) {
      console.error('Error downloading segment:', error);
      toast.error('Fout bij verwerken video segment');
    } finally {
      setIsDownloadingSegment(false);
    }
  };

  const deleteSegment = (segmentIndex: number) => {
    const totalSegments = splitPoints.length + 1;
    
    if (segmentIndex === totalSegments) {
      const splitPointIndex = segmentIndex - 2;
      if (splitPointIndex >= 0 && splitPointIndex < splitPoints.length) {
        removeSplitPoint(splitPoints[splitPointIndex].id);
        toast.success(`Laatste segment samengevoegd met vorig segment`);
      }
    } else {
      const splitPointIndex = segmentIndex - 1;
      if (splitPointIndex >= 0 && splitPointIndex < splitPoints.length) {
        removeSplitPoint(splitPoints[splitPointIndex].id);
        toast.success(`Segment ${segmentIndex} samengevoegd met volgend segment`);
      }
    }
  };

  const ensureFfmpeg = async (): Promise<FFmpeg> => {
    if (ffmpegRef.current) return ffmpegRef.current;
    setIsFfmpegLoading(true);

    const ffmpeg = new FFmpeg();
    try {
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
        await loadWithBase('https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist');
      } catch (e1) {
        console.warn('FFmpeg load failed from jsDelivr/dist, trying unpkg/dist', e1);
        try {
          await loadWithBase('https://unpkg.com/@ffmpeg/core@0.12.6/dist');
        } catch (e2) {
          console.warn('FFmpeg load failed from unpkg/dist, trying mixed esm/dist', e2);
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
      toast.error('Kon video encoder niet laden. Controleer je netwerk of adblockers.');
      throw e;
    } finally {
      setIsFfmpegLoading(false);
    }
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
              {videoFile.name}
            </h3>
            <p className="text-muted-foreground">
              Duur: {formatTime(duration)} • {splitPoints.length} split punten
            </p>
          </div>
          
          <div className="flex gap-3">
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleDownloadClick}
                disabled={splitPoints.length === 0 || isFfmpegLoading || isEncoding || isStartingDownload}
                className={`bg-accent hover:bg-accent/90 text-accent-foreground relative transition-all duration-200 ${
                  buttonClicked ? 'scale-95 bg-accent/80' : 'hover:scale-105'
                }`}
              >
                {(buttonClicked || isStartingDownload) ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-accent/90 rounded-md animate-pulse">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-accent-foreground/30 border-t-accent-foreground"></div>
                  </div>
                ) : null}
                <div className={`flex items-center transition-opacity duration-150 ${
                  buttonClicked || isStartingDownload ? 'opacity-0' : 'opacity-100'
                }`}>
                  <Download className="h-4 w-4 mr-2" />
                  <span>
                    {isFfmpegLoading
                      ? 'Video encoder laden...'
                      : isEncoding
                        ? 'Video verwerken...'
                        : 'Download video segmenten'}
                  </span>
                </div>
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
        
        <VideoControls
          videoRef={videoRef}
          videoUrl={videoUrl}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          setVolume={setVolume}
        />
        
        <VideoTimelineDisplay
          videoUrl={videoUrl}
          duration={duration}
          currentTime={currentTime}
          splitPoints={splitPoints}
          onAddSplitPoint={addSplitPoint}
          onUpdateSplitPoint={updateSplitPoint}
        />
      </Card>
      
      {splitPoints.length > 0 && (
        <VideoSplitPointsList
          splitPoints={splitPoints}
          onRemoveSplitPoint={removeSplitPoint}
          onAddSplitPoint={addSplitPoint}
          onDownloadSegment={downloadSingleSegment}
          onDeleteSegment={deleteSegment}
          duration={duration}
          isDownloadingSegment={isDownloadingSegment}
        />
      )}
      
      <video ref={videoRef} src={videoUrl} style={{ display: 'none' }} />
    </div>
  );
};
