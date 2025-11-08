import { Volume2, VolumeX } from "lucide-react";
import { Slider } from "./ui/slider";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import SignalViewer from "./SignalViewer";

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
}

export const AudioSourceSeparation = ({
  mode,
  sources,
  onVolumeChange,
  onMuteToggle,
  audioData,
}: AudioSourceSeparationProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            {mode === "musical" ? "🎵 Separated Tracks" : "🎤 Separated Speakers"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {mode === "musical" 
              ? "Control individual instrument volumes and view waveforms" 
              : "Control individual speaker volumes and view waveforms"}
          </p>
        </div>
        <Badge variant="secondary" className="bg-primary/10 text-primary">
          AI Powered
        </Badge>
      </div>

      <div className="grid gap-4">
        {sources.map((source) => (
          <Card 
            key={source.id} 
            className="p-4 bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all duration-300"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-2 h-10 rounded-full"
                    style={{ backgroundColor: source.color }}
                  />
                  <div>
                    <h4 className="font-medium text-foreground">{source.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      Volume: {Math.round(source.volume * 100)}%
                    </p>
                  </div>
                </div>
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
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-8">0%</span>
                <Slider
                  value={[source.volume * 100]}
                  onValueChange={(value) => onVolumeChange(source.id, value[0] / 100)}
                  max={100}
                  step={1}
                  className="flex-1"
                  disabled={source.muted}
                />
                <span className="text-xs text-muted-foreground w-12 text-right">100%</span>
              </div>

              {/* Signal Viewer for this source */}
              <div className="mt-4">
                <SignalViewer
                  title=""
                  data={audioData}
                  color={source.color.replace('#', '')}
                  zoom={1}
                  pan={0}
                  onZoomChange={() => {}}
                  onPanChange={() => {}}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
        <p className="text-xs text-muted-foreground text-center">
          💡 AI separation will process your audio and generate individual waveforms when you upload a file
        </p>
      </div>
    </div>
  );
};
