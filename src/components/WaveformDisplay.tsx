import { useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { SplitPoint } from "./AudioEditor";

interface WaveformDisplayProps {
  audioUrl: string;
  audioBuffer: AudioBuffer | null;
  duration: number;
  currentTime: number;
  splitPoints: SplitPoint[];
  onAddSplitPoint: (time: number) => void;
}

export const WaveformDisplay = ({
  audioUrl,
  audioBuffer,
  duration,
  currentTime,
  splitPoints,
  onAddSplitPoint,
}: WaveformDisplayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  useEffect(() => {
    if (!audioBuffer) return;

    // Generate waveform data
    const data = generateWaveformData(audioBuffer, 1000);
    setWaveformData(data);
  }, [audioBuffer]);

  useEffect(() => {
    if (!canvasRef.current || waveformData.length === 0) return;

    drawWaveform();
  }, [waveformData, currentTime, splitPoints]);

  const generateWaveformData = (buffer: AudioBuffer, samples: number): number[] => {
    const rawData = buffer.getChannelData(0);
    const blockSize = Math.floor(rawData.length / samples);
    const filteredData = [];

    for (let i = 0; i < samples; i++) {
      let blockStart = blockSize * i;
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[blockStart + j]);
      }
      filteredData.push(sum / blockSize);
    }

    return filteredData;
  };

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Draw waveform background
    const barWidth = width / waveformData.length;
    const maxAmplitude = Math.max(...waveformData);

    waveformData.forEach((amplitude, index) => {
      const barHeight = (amplitude / maxAmplitude) * (height / 2);
      const x = index * barWidth;
      const y = height / 2;

      // Progress indicator
      const progress = currentTime / duration;
      const isPlayed = index / waveformData.length < progress;

      ctx.fillStyle = isPlayed ? 'hsl(195 100% 55%)' : 'hsl(220 20% 30%)';
      ctx.fillRect(x, y - barHeight, barWidth - 1, barHeight);
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });

    // Draw split points
    splitPoints.forEach(point => {
      const x = (point.time / duration) * width;
      ctx.strokeStyle = 'hsl(45 100% 60%)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Draw split point label
      ctx.fillStyle = 'hsl(45 100% 60%)';
      ctx.font = '12px monospace';
      ctx.fillText(point.label, x + 5, 15);
    });

    // Draw current time indicator
    const currentX = (currentTime / duration) * width;
    ctx.strokeStyle = 'hsl(280 100% 70%)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(currentX, 0);
    ctx.lineTo(currentX, height);
    ctx.stroke();
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || duration === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = x / canvas.width;
    const time = percentage * duration;

    onAddSplitPoint(time);
  };

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      canvas.width = container.clientWidth;
      canvas.height = 150;
      drawWaveform();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [waveformData]);

  return (
    <Card className="bg-waveform-bg border-border/30 p-4">
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Click on the waveform to add split points
        </div>
        
        <div ref={containerRef} className="w-full">
          <canvas
            ref={canvasRef}
            className="w-full cursor-crosshair rounded border border-border/20"
            onClick={handleCanvasClick}
            style={{ height: '150px' }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0:00</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </Card>
  );
};

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};