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
  onUpdateSplitPoint: (id: string, newTime: number) => void;
}

export const WaveformDisplay = ({
  audioUrl,
  audioBuffer,
  duration,
  currentTime,
  splitPoints,
  onAddSplitPoint,
  onUpdateSplitPoint,
}: WaveformDisplayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    dragPointId: string | null;
    startX: number;
  }>({ isDragging: false, dragPointId: null, startX: 0 });
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);

  useEffect(() => {
    if (!audioBuffer) return;

    // Generate waveform data
    const data = generateWaveformData(audioBuffer, 1000);
    setWaveformData(data);
  }, [audioBuffer]);

  useEffect(() => {
    if (!canvasRef.current || waveformData.length === 0) return;

    drawWaveform();
  }, [waveformData, currentTime, splitPoints, hoveredPointId, dragState]);

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
      const isHovered = hoveredPointId === point.id;
      const isDragging = dragState.isDragging && dragState.dragPointId === point.id;
      
      // Draw split point line
      ctx.strokeStyle = isHovered || isDragging ? 'hsl(45 100% 70%)' : 'hsl(45 100% 60%)';
      ctx.lineWidth = isHovered || isDragging ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Draw interactive handle at top
      ctx.fillStyle = isHovered || isDragging ? 'hsl(45 100% 60%)' : 'hsl(45 100% 50%)';
      ctx.beginPath();
      ctx.roundRect(x - 6, 0, 12, 20, 4);
      ctx.fill();
      
      // Draw drag indicator
      if (isHovered || isDragging) {
        ctx.fillStyle = 'hsl(45 100% 80%)';
        ctx.fillRect(x - 1, 6, 2, 8);
        ctx.fillRect(x - 4, 6, 2, 8);
        ctx.fillRect(x + 2, 6, 2, 8);
      }

      // Draw split point label
      ctx.fillStyle = 'hsl(45 100% 60%)';
      ctx.font = '12px monospace';
      ctx.fillText(point.label, x + 8, 15);
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
    if (dragState.isDragging) return;
    
    const canvas = canvasRef.current;
    if (!canvas || duration === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    
    // Check if clicking near a split point (within 10px)
    const clickedPoint = splitPoints.find(point => {
      const pointX = (point.time / duration) * canvas.width;
      return Math.abs(x - pointX) <= 10;
    });
    
    if (clickedPoint) return; // Don't add new point if clicking on existing one
    
    const percentage = x / canvas.width;
    const time = percentage * duration;
    onAddSplitPoint(time);
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || duration === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    
    // Check if clicking on a split point handle (top 20px)
    if (event.clientY - rect.top <= 20) {
      const dragPoint = splitPoints.find(point => {
        const pointX = (point.time / duration) * canvas.width;
        return Math.abs(x - pointX) <= 6;
      });
      
      if (dragPoint) {
        setDragState({
          isDragging: true,
          dragPointId: dragPoint.id,
          startX: x
        });
        event.preventDefault();
      }
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || duration === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (dragState.isDragging && dragState.dragPointId) {
      // Update split point position while dragging
      const percentage = Math.max(0, Math.min(1, x / canvas.width));
      const newTime = percentage * duration;
      onUpdateSplitPoint(dragState.dragPointId, newTime);
    } else {
      // Check for hover on split point handles
      let hoveredId = null;
      if (y <= 20) {
        const hoveredPoint = splitPoints.find(point => {
          const pointX = (point.time / duration) * canvas.width;
          return Math.abs(x - pointX) <= 6;
        });
        hoveredId = hoveredPoint?.id || null;
      }
      setHoveredPointId(hoveredId);
    }
  };

  const handleMouseUp = () => {
    if (dragState.isDragging) {
      setDragState({ isDragging: false, dragPointId: null, startX: 0 });
    }
  };

  const handleMouseLeave = () => {
    setHoveredPointId(null);
    if (dragState.isDragging) {
      setDragState({ isDragging: false, dragPointId: null, startX: 0 });
    }
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
            className={`w-full rounded border border-border/20 ${
              hoveredPointId || dragState.isDragging 
                ? 'cursor-grab' 
                : 'cursor-crosshair'
            } ${dragState.isDragging ? 'cursor-grabbing' : ''}`}
            onClick={handleCanvasClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            style={{ height: '150px' }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0:00</span>
          <span>Estimated total: ~{((duration * 192) / 8 / 1024).toFixed(1)} MB</span>
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