import { useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Slider } from "./ui/slider";
import { Card } from "./ui/card";
import { Button } from "./ui/button";

interface AudioSource {
  id: string;
  name: string;
  volume: number;
  muted: boolean;
  color: string;
}

interface AudioSourceSeparationProps {
  mode: "musical" | "human";
  sources: AudioSource[];
  onVolumeChange: (id: string, volume: number) => void;
  onMuteToggle: (id: string) => void;
  audioData: Float32Array | null;
  audioContextRef: React.RefObject<AudioContext | null>;
  currentTime: number;
  onCurrentTimeChange: (time: number) => void;
  playbackSpeed: number;
  onPlaybackSpeedChange: (speed: number) => void;
}

export const AudioSourceSeparation = ({
  mode,
  sources,
  onVolumeChange,
  onMuteToggle,
}: AudioSourceSeparationProps) => {
  return (
    <>
      {/* Critical: Use <style jsx global> for Next.js or just <style> with proper scoping */}
      <style>{`
        .scrollable-sources {
          scrollbar-width: thin;
          scrollbar-color: rgba(100, 100, 100, 0.4) transparent;
        }
        .scrollable-sources::-webkit-scrollbar {
          width: 6px;
        }
        .scrollable-sources::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 3px;
        }
        .scrollable-sources::-webkit-scrollbar-thumb {
          background: rgba(100, 100, 100, 0.4);
          border-radius: 3px;
        }
        .scrollable-sources::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 100, 100, 0.6);
        }
      `}</style>

      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="mb-4 pb-3 border-b border-border/40">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            {mode === "musical" ? "Separated Tracks" : "Separated Speakers"}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Adjust volume for each source independently
          </p>
        </div>

        {/* Scrollable Area - This is the key */}
        <div className="flex-1 overflow-y-auto scrollable-sources pr-2 -mr-2">
          <div className="space-y-3 min-h-full">
            {sources.map((source) => (
              <Card
                key={source.id}
                className="p-4 bg-card/80 backdrop-blur-sm border border-border/60 hover:border-primary/50 transition-all duration-200 shadow-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-2 h-10 rounded-full flex-shrink-0"
                      style={{ backgroundColor: source.color }}
                    />
                    <div className="min-w-0">
                      <h4 className="font-medium text-foreground truncate">
                        {source.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(source.volume * 100)}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onMuteToggle(source.id)}
                      className="h-8 w-8"
                    >
                      {source.muted ? (
                        <VolumeX className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Volume2 className="h-4 w-4 text-primary" />
                      )}
                    </Button>

                    <div className="flex items-center gap-3 w-60">
                      <span className="text-xs text-muted-foreground w-10">0%</span>
                      <Slider
                        value={[source.volume * 100]}
                        onValueChange={(v) => onVolumeChange(source.id, v[0] / 100)}
                        max={200}
                        step={1}
                        disabled={source.muted}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-12 text-right">200%</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-border/30">
          <p className="text-xs text-muted-foreground text-center">
            AI separation runs automatically after upload
          </p>
        </div>
      </div>
    </>
  );
};