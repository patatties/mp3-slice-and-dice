import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Scissors, Plus, Download, Trash2 } from "lucide-react";
import { SplitPoint } from "./AudioEditor";
import { useState } from "react";

interface SplitPointsListProps {
  splitPoints: SplitPoint[];
  onRemoveSplitPoint: (id: string) => void;
  onAddSplitPoint: (time: number) => void;
  onDownloadSegment: (startTime: number, endTime: number, segmentIndex: number) => void;
  onDeleteSegment: (segmentIndex: number) => void;
  duration: number;
  isDownloadingSegment: boolean;
}

export const SplitPointsList = ({
  splitPoints,
  onRemoveSplitPoint,
  onAddSplitPoint,
  onDownloadSegment,
  onDeleteSegment,
  duration,
  isDownloadingSegment,
}: SplitPointsListProps) => {
  const [timeInput, setTimeInput] = useState("");
  
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const estimateFileSize = (durationInSeconds: number) => {
    // Estimate MP3 file size at 192kbps
    const bitrate = 192; // kbps
    const sizeInKB = (durationInSeconds * bitrate) / 8;
    const sizeInMB = sizeInKB / 1024;
    return sizeInMB.toFixed(1);
  };

  const parseTimeInput = (input: string): number | null => {
    const parts = input.split(':');
    if (parts.length !== 2) return null;
    
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    
    if (isNaN(minutes) || isNaN(seconds) || seconds >= 60) return null;
    
    const totalSeconds = minutes * 60 + seconds;
    return totalSeconds <= duration ? totalSeconds : null;
  };

  const handleAddSplitPoint = () => {
    const time = parseTimeInput(timeInput);
    if (time !== null) {
      onAddSplitPoint(time);
      setTimeInput("");
    }
  };

  const getSegments = () => {
    const points = [0, ...splitPoints.map(p => p.time), duration];
    const segments = [];
    
    for (let i = 0; i < points.length - 1; i++) {
      segments.push({
        start: points[i],
        end: points[i + 1],
        duration: points[i + 1] - points[i],
        index: i + 1,
      });
    }
    
    return segments;
  };

  const segments = getSegments();

  return (
    <Card className="bg-gradient-card border-border/50 shadow-card p-6">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Scissors className="h-5 w-5 text-split-point" />
          <h3 className="text-lg font-semibold">Split Points & Segments</h3>
        </div>
        
        {splitPoints.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-muted-foreground">
                Add Split Point
              </h4>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="mm:ss"
                  value={timeInput}
                  onChange={(e) => setTimeInput(e.target.value)}
                  className="w-20 h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddSplitPoint();
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleAddSplitPoint}
                  disabled={!timeInput}
                  className="h-8 px-3"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Audio Segments ({segments.length})
              </h4>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {segments.map((segment) => (
                  <Card
                    key={segment.index}
                    className="bg-secondary/30 border-border/30 p-3 hover:bg-segment-hover/10 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Segment {segment.index}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {formatTime(segment.duration)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>{formatTime(segment.start)} → {formatTime(segment.end)}</div>
                        <div className="text-accent">~{estimateFileSize(segment.duration)} MB</div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => onDownloadSegment(segment.start, segment.end, segment.index)}
                          disabled={isDownloadingSegment}
                          className="flex-1 h-7 text-xs bg-accent/80 hover:bg-accent text-accent-foreground"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          {isDownloadingSegment ? 'Processing...' : 'Download MP3'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onDeleteSegment(segment.index)}
                          className="h-7 px-2 text-xs"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {splitPoints.length === 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-muted-foreground">
                Add Split Points
              </h4>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="mm:ss"
                  value={timeInput}
                  onChange={(e) => setTimeInput(e.target.value)}
                  className="w-20 h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddSplitPoint();
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleAddSplitPoint}
                  disabled={!timeInput}
                  className="h-8 px-3"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
            </div>
            <div className="text-center py-8 text-muted-foreground">
              <Scissors className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No split points set yet</p>
              <p className="text-sm">Click on the waveform or use the time input above</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};