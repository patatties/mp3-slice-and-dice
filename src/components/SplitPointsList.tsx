import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Scissors } from "lucide-react";
import { SplitPoint } from "./AudioEditor";

interface SplitPointsListProps {
  splitPoints: SplitPoint[];
  onRemoveSplitPoint: (id: string) => void;
  duration: number;
}

export const SplitPointsList = ({
  splitPoints,
  onRemoveSplitPoint,
  duration,
}: SplitPointsListProps) => {
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Split Points ({splitPoints.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {splitPoints.map((point) => (
                  <Badge
                    key={point.id}
                    variant="outline"
                    className="bg-split-point/10 border-split-point/30 text-split-point flex items-center gap-2 px-3 py-1"
                  >
                    <span>{formatTime(point.time)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveSplitPoint(point.id)}
                      className="h-4 w-4 p-0 hover:bg-destructive/20"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
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
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Segment {segment.index}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {formatTime(segment.duration)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(segment.start)} → {formatTime(segment.end)}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {splitPoints.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Scissors className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No split points set yet</p>
            <p className="text-sm">Click on the waveform to add split points</p>
          </div>
        )}
      </div>
    </Card>
  );
};