import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Play, Pause, Square, Upload, Download, Volume2, VolumeX, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { AudioSeparationService, SeparationJob, pollJobStatus } from "@/services/audioSeparationApi";

interface SeparatedTrack {
  id: string;
  name: string;
  originalFilename: string;
  volume: number;
  muted: boolean;
  color: string;
  audioBuffer?: AudioBuffer;
  audioUrl?: string;
  downloadUrl?: string;
  error?: string;
}

interface SourceNode {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

interface AudioSourceSeparationProps {
  mode: "musical" | "human";
  audioData?: Float32Array | null;
  audioContextRef: React.RefObject<AudioContext | null>;
  currentTime: number;
  onCurrentTimeChange: (time: number) => void;
  playbackSpeed: number;
  onPlaybackSpeedChange: (speed: number) => void;
  audioFile?: File | null;
}

export const AudioSourceSeparation = ({
  mode,
  audioContextRef,
  currentTime,
  onCurrentTimeChange,
  playbackSpeed,
  onPlaybackSpeedChange,
  audioFile,
}: AudioSourceSeparationProps) => {
  const [separatedTracks, setSeparatedTracks] = useState<SeparatedTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentJob, setCurrentJob] = useState<SeparationJob | null>(null);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  const sourceNodesRef = useRef<Map<string, SourceNode>>(new Map());
  const audioBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const startTimeRef = useRef<number>(0);
  const animationRef = useRef<number>();
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleSeparate = async () => {
    console.log("🔄 Starting separation process...");
    
    if (!audioFile) {
      toast.error("Please upload an audio file first");
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);
    setSeparatedTracks([]); // Clear previous tracks
    setDuration(0); // Reset duration
    
    try {
      // Check backend health
      const isHealthy = await AudioSeparationService.checkHealth();
      if (!isHealthy) {
        toast.error("Backend service is not available");
        setIsProcessing(false);
        return;
      }

      const separationType = mode === "musical" ? "music" : "speech";
      console.log(`🎵 Starting ${separationType} separation with 5 stems`);
      
      const job = await AudioSeparationService.separateAudio(audioFile, separationType, 5);

      setCurrentJob(job);
      toast.success(`Separation started! Job ID: ${job.job_id}`);

      // Start polling for status
      await pollJobStatus(
        job.job_id,
        (updatedJob) => {
          setCurrentJob(updatedJob);
          setProcessingProgress(50);
          console.log("🔄 Job status update:", updatedJob.status);
        },
        async (completedJob) => {
          setProcessingProgress(100);
          setCurrentJob(completedJob);
          console.log("✅ Separation completed:", completedJob);
          
          // Load separated audio files
          await loadSeparatedTracks(completedJob);
          
          setIsProcessing(false);
          toast.success("Separation completed successfully!");
        },
        (error) => {
          setIsProcessing(false);
          console.error("❌ Separation failed:", error);
          toast.error(`Separation failed: ${error}`);
        },
        2000, // 2 second interval
        300 // 10 minute timeout
      );

    } catch (error) {
      setIsProcessing(false);
      console.error("Separation error:", error);
      toast.error(`Separation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const loadSeparatedTracks = async (job: SeparationJob) => {
    if (!job.output_files || !audioContextRef.current) {
      console.warn("No output files or audio context available");
      toast.error("No separated files found");
      return;
    }

    const context = audioContextRef.current;
    audioBuffersRef.current.clear();

    console.log("🎵 Loading separated tracks:", job.output_files);

    const colorPalette = [
      "#ec4899", "#8b5cf6", "#f59e0b", "#10b981", "#3b82f6", 
      "#6366f1", "#ef4444", "#84cc16", "#06b6d4", "#f97316"
    ];

    const newTracks: SeparatedTrack[] = [];
    const loadPromises: Promise<void>[] = [];

    for (let i = 0; i < job.output_files.length; i++) {
      const outputFile = job.output_files[i];
      
      const loadPromise = (async () => {
        try {
          console.log(`📥 Loading track: ${outputFile.name} from ${outputFile.url}`);
          
          const blob = await AudioSeparationService.downloadFile(outputFile.url);
          const arrayBuffer = await blob.arrayBuffer();
          const audioBuffer = await context.decodeAudioData(arrayBuffer);
          
          // Create a clean name from filename
          const trackName = outputFile.name
            .replace('.wav', '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letter of each word

          const track: SeparatedTrack = {
            id: `track-${i}-${Date.now()}`,
            name: trackName,
            originalFilename: outputFile.name,
            volume: 1,
            muted: false,
            color: colorPalette[i % colorPalette.length],
            audioBuffer,
            audioUrl: URL.createObjectURL(blob),
            downloadUrl: outputFile.url
          };

          // Store the audio buffer
          audioBuffersRef.current.set(track.id, audioBuffer);
          newTracks.push(track);

          console.log(`✅ Loaded track: ${trackName} (${audioBuffer.duration.toFixed(2)}s)`);

        } catch (error) {
          console.error(`❌ Failed to load track ${outputFile.name}:`, error);
          
          const errorTrack: SeparatedTrack = {
            id: `error-${i}-${Date.now()}`,
            name: outputFile.name.replace('.wav', ''),
            originalFilename: outputFile.name,
            volume: 1,
            muted: true,
            color: colorPalette[i % colorPalette.length],
            error: `Failed to load: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
          
          newTracks.push(errorTrack);
        }
      })();

      loadPromises.push(loadPromise);
    }

    // Wait for all tracks to load
    await Promise.all(loadPromises);

    // Update state with all loaded tracks
    setSeparatedTracks(newTracks);
    
    // Calculate maximum duration for seek slider
    const validDurations = newTracks
      .filter(track => track.audioBuffer && track.audioBuffer.duration > 0)
      .map(track => track.audioBuffer!.duration);
    
    const maxDuration = validDurations.length > 0 ? Math.max(...validDurations) : 0;
    setDuration(maxDuration);
    
    const successfulTracks = newTracks.filter(track => !track.error);
    const failedTracks = newTracks.filter(track => track.error);
    
    console.log(`🎉 Successfully loaded ${successfulTracks.length} tracks, ${failedTracks.length} failed`);
    
    if (failedTracks.length > 0) {
      toast.error(`Failed to load ${failedTracks.length} tracks. Check console for details.`);
    }
  };

  const playAllTracks = async (seekTime?: number) => {
    if (!audioContextRef.current) {
      toast.error("Audio context not available");
      return;
    }

    const context = audioContextRef.current;
    
    // Stop any existing playback
    stopAllTracks();

    // Check if we have any audio buffers loaded
    const validTracks = separatedTracks.filter(track => 
      audioBuffersRef.current.get(track.id) && !track.muted && !track.error
    );

    if (validTracks.length === 0) {
      toast.error("No valid tracks available to play. Check if tracks are muted or failed to load.");
      return;
    }

    // Ensure seekTime is a valid finite number
    const safeSeekTime = (seekTime !== undefined && Number.isFinite(seekTime)) 
      ? Math.max(0, Math.min(seekTime, duration - 0.1)) // Clamp between 0 and duration
      : (Number.isFinite(currentTime) ? Math.max(0, currentTime) : 0);

    console.log("▶️ Starting playback at:", safeSeekTime, "duration:", duration);

    startTimeRef.current = context.currentTime - safeSeekTime;
    
    // Create audio nodes for each valid track
    validTracks.forEach(track => {
      const audioBuffer = audioBuffersRef.current.get(track.id);
      if (audioBuffer && audioBuffer.duration > 0) {
        const sourceNode = context.createBufferSource();
        const gainNode = context.createGain();

        sourceNode.buffer = audioBuffer;
        gainNode.gain.value = track.volume;

        sourceNode.connect(gainNode);
        gainNode.connect(context.destination);

        // Apply playback speed
        sourceNode.playbackRate.value = playbackSpeed;

        sourceNodesRef.current.set(track.id, { source: sourceNode, gain: gainNode });

        try {
          // Ensure we don't seek beyond the buffer duration
          const safeStartOffset = Math.min(safeSeekTime, audioBuffer.duration - 0.01);
          sourceNode.start(0, safeStartOffset);
          console.log(`🎵 Started track ${track.name} at offset:`, safeStartOffset);
        } catch (error) {
          console.error(`❌ Error starting track ${track.name}:`, error);
        }
      }
    });

    setIsPlaying(true);
    onCurrentTimeChange(safeSeekTime);

    // Update playback position
    const updateTime = () => {
      if (!context || isSeeking) return;

      const elapsed = context.currentTime - startTimeRef.current;
      
      // Check if any track is still playing
      const anyTrackPlaying = Array.from(sourceNodesRef.current.values())
        .some(({ source }) => source.buffer && elapsed < source.buffer.duration);

      if (!anyTrackPlaying || elapsed >= duration) {
        stopAllTracks();
        onCurrentTimeChange(0);
      } else {
        onCurrentTimeChange(elapsed);
        animationRef.current = requestAnimationFrame(updateTime);
      }
    };

    animationRef.current = requestAnimationFrame(updateTime);
  };

  const stopAllTracks = () => {
    sourceNodesRef.current.forEach(({ source }) => {
      try {
        source.stop();
      } catch (e) {
        // Source might already be stopped
      }
    });
    
    sourceNodesRef.current.clear();
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    setIsPlaying(false);
  };

  const pauseAllTracks = () => {
    stopAllTracks();
  };

  // Custom click-to-seek handler
  const handleSliderClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!sliderRef.current || duration <= 0) return;

    const slider = sliderRef.current;
    const rect = slider.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = Math.max(0, Math.min(duration, percentage * duration));

    console.log("🎯 Click seek to:", newTime, `(${percentage * 100}%)`);
    
    onCurrentTimeChange(newTime);
    
    if (isPlaying) {
      // If playing, restart from new position
      playAllTracks(newTime);
    }
  };

  const handleSeek = (newTime: number) => {
    // Ensure newTime is a valid finite number
    const safeNewTime = Number.isFinite(newTime) 
      ? Math.max(0, Math.min(newTime, duration))
      : 0;
    
    console.log("⏩ Seeking to:", safeNewTime);
    onCurrentTimeChange(safeNewTime);
  };

  const handleSeekEnd = (newTime: number) => {
    // Ensure newTime is a valid finite number
    const safeNewTime = Number.isFinite(newTime) 
      ? Math.max(0, Math.min(newTime, duration))
      : 0;
    
    console.log("⏩ Seek ended at:", safeNewTime);
    setIsSeeking(false);
    
    if (isPlaying) {
      // If was playing, restart from new position
      playAllTracks(safeNewTime);
    } else {
      // If was paused, just update the time
      onCurrentTimeChange(safeNewTime);
    }
  };

  const handleTrackVolumeChange = (trackId: string, volume: number) => {
    setSeparatedTracks(prev => prev.map(track => 
      track.id === trackId ? { ...track, volume } : track
    ));

    // Update gain node in real-time if playing
    const node = sourceNodesRef.current.get(trackId);
    if (node) {
      node.gain.gain.value = volume;
    }
  };

  const handleTrackMuteToggle = (trackId: string) => {
    setSeparatedTracks(prev => prev.map(track => 
      track.id === trackId ? { ...track, muted: !track.muted } : track
    ));

    // Update gain node in real-time if playing
    const node = sourceNodesRef.current.get(trackId);
    if (node) {
      const track = separatedTracks.find(t => t.id === trackId);
      if (track) {
        node.gain.gain.value = track.muted ? 0 : track.volume;
      }
    }
  };

  const handleDownload = async (track: SeparatedTrack) => {
    if (!track.downloadUrl) {
      toast.error("No download available for this track");
      return;
    }

    try {
      const blob = await AudioSeparationService.downloadFile(track.downloadUrl);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${track.name}_separated.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${track.name}`);
    } catch (error) {
      console.error("Download error:", error);
      toast.error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Update gain nodes when volume changes
  useEffect(() => {
    sourceNodesRef.current.forEach((node, trackId) => {
      const track = separatedTracks.find(t => t.id === trackId);
      if (track) {
        node.gain.gain.value = track.muted ? 0 : track.volume;
      }
    });
  }, [separatedTracks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllTracks();
      // Clean up object URLs
      separatedTracks.forEach(track => {
        if (track.audioUrl) {
          URL.revokeObjectURL(track.audioUrl);
        }
      });
    };
  }, []);

  // Safe duration display function
  const formatDuration = (duration: number | undefined | null): string => {
    if (duration === undefined || duration === null || !Number.isFinite(duration)) {
      return "0:00";
    }
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Safe current time display
  const displayCurrentTime = formatDuration(currentTime);
  const displayTotalDuration = formatDuration(duration);

  return (
    <div className="flex flex-col space-y-4">
      {/* Processing Controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">
            AI {mode === "musical" ? "Music" : "Speech"} Separation
          </h3>
          <Button
            onClick={handleSeparate}
            disabled={isProcessing || !audioFile}
            size="sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isProcessing ? "Processing..." : "Separate Sources"}
          </Button>
        </div>

        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processing audio...</span>
              <span>{processingProgress}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary rounded-full h-2 transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              />
            </div>
            {currentJob && (
              <div className="text-xs text-muted-foreground">
                <p>Job: {currentJob.job_id}</p>
                <p>Status: {currentJob.status}</p>
              </div>
            )}
          </div>
        )}

        {!audioFile && (
          <p className="text-sm text-muted-foreground">
            Upload an audio file to enable separation
          </p>
        )}
      </Card>

      {/* Master Playback Controls */}
      <Card className="p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Button
            size="sm"
            onClick={isPlaying ? pauseAllTracks : () => playAllTracks()}
            disabled={separatedTracks.length === 0 || isProcessing}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={stopAllTracks}
            disabled={!isPlaying}
          >
            <Square className="h-4 w-4" />
          </Button>
          
          <div className="flex-1" />
          
          <div className="flex items-center space-x-2">
            <Label htmlFor="playback-speed" className="text-xs whitespace-nowrap">Speed:</Label>
            <Slider
              id="playback-speed"
              min={0.5}
              max={2}
              step={0.1}
              value={[playbackSpeed]}
              onValueChange={([value]) => onPlaybackSpeedChange(value)}
              className="w-20"
            />
            <span className="text-xs w-8">{playbackSpeed}x</span>
          </div>
        </div>

        {/* Seek Slider with custom click handler */}
        {duration > 0 && (
          <div className="space-y-2 mt-4">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{displayCurrentTime}</span>
              <span>{displayTotalDuration}</span>
            </div>
            <div 
              ref={sliderRef}
              className="relative w-full cursor-pointer"
              onClick={handleSliderClick}
            >
              <Slider
                value={[Number.isFinite(currentTime) ? currentTime : 0]}
                onValueChange={([value]) => handleSeek(value[0])}
                onValueCommit={([value]) => handleSeekEnd(value[0])}
                max={duration}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground mt-2">
          {separatedTracks.length > 0 && (
            <span>
              {separatedTracks.filter(t => !t.error).length} tracks loaded
              {separatedTracks.filter(t => t.error).length > 0 && 
                `, ${separatedTracks.filter(t => t.error).length} failed`
              }
            </span>
          )}
        </div>
      </Card>

      {/* Separated Tracks Controls - Dynamic height based on content */}
      <div className="space-y-3">
        {separatedTracks.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">
              {audioFile 
                ? "Click 'Separate Sources' to extract individual tracks" 
                : "Upload an audio file to get started"
              }
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {separatedTracks.map((track) => {
              const audioBuffer = audioBuffersRef.current.get(track.id);
              const trackDuration = audioBuffer?.duration;
              
              return (
                <Card key={track.id} className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: track.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <Label htmlFor={`mute-${track.id}`} className="font-medium truncate block">
                          {track.name}
                        </Label>
                        {audioBuffer && (
                          <p className="text-xs text-muted-foreground">
                            {formatDuration(trackDuration)}
                          </p>
                        )}
                        {track.error && (
                          <p className="text-xs text-red-500 flex items-center">
                            <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{track.error}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(track)}
                        disabled={!track.downloadUrl || !!track.error}
                        title="Download"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTrackMuteToggle(track.id)}
                        title={track.muted ? "Unmute" : "Mute"}
                        disabled={!!track.error}
                      >
                        {track.muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-muted-foreground w-8 flex-shrink-0">
                      {Math.round(track.volume * 100)}%
                    </span>
                    <Slider
                      value={[track.volume]}
                      onValueChange={([value]) => handleTrackVolumeChange(track.id, value)}
                      max={1}
                      step={0.01}
                      className="flex-1"
                      disabled={!audioBuffer || !!track.error}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};