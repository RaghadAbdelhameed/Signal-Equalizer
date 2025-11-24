import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Save, Download, Upload, Trash2 } from "lucide-react";

export interface EqualizerPreset {
  name: string;
  ranges: { minFreq: number; maxFreq: number; gain: number }[];
  createdAt: string;
  version?: number; // optional, for future compatibility
}

interface PresetManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRanges: { minFreq: number; maxFreq: number; gain: number }[];
  onLoad: (preset: EqualizerPreset) => void;
}

const PresetManager = ({
  open,
  onOpenChange,
  currentRanges,
  onLoad,
}: PresetManagerProps) => {
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<EqualizerPreset[]>(() => {
    const saved = localStorage.getItem("equalizer-presets-v2");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [mode, setMode] = useState<"save" | "load">("save");

  const handleSave = () => {
    if (!presetName.trim()) {
      toast.error("Please enter a preset name");
      return;
    }

    const newPreset: EqualizerPreset = {
      name: presetName.trim(),
      ranges: currentRanges.map(r => ({ ...r })), // deep copy
      createdAt: new Date().toISOString(),
      version: 2,
    };

    const updated = [...presets.filter(p => p.name !== newPreset.name), newPreset];
    setPresets(updated);
    localStorage.setItem("equalizer-presets-v2", JSON.stringify(updated));

    toast.success(`Saved: ${newPreset.name}`);
    setPresetName("");
  };

  const handleLoad = (preset: EqualizerPreset) => {
    onLoad(preset);
    onOpenChange(false);
    toast.success(`Loaded: ${preset.name}`);
  };

  const handleDelete = (index: number) => {
    const updated = presets.filter((_, i) => i !== index);
    setPresets(updated);
    localStorage.setItem("equalizer-presets-v2", JSON.stringify(updated));
    toast.success("Preset deleted");
  };

  const handleExport = (preset: EqualizerPreset) => {
    const data = JSON.stringify(preset, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${preset.name.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Preset exported");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const preset = JSON.parse(ev.target?.result as string) as EqualizerPreset;
        if (!preset.ranges || !Array.isArray(preset.ranges)) throw new Error("Invalid format");

        const updated = [...presets, preset];
        setPresets(updated);
        localStorage.setItem("equalizer-presets-v2", JSON.stringify(updated));
        toast.success(`Imported: ${preset.name}`);
      } catch (err) {
        toast.error("Invalid preset file");
      }
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Presets (Full Ranges)</DialogTitle>
          <DialogDescription>
            Save and load complete frequency band settings (min/max + gain)
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button variant={mode === "save" ? "default" : "outline"} onClick={() => setMode("save")} className="flex-1">
            <Save className="h-4 w-4 mr-2" /> Save New
          </Button>
          <Button variant={mode === "load" ? "default" : "outline"} onClick={() => setMode("load")} className="flex-1">
            <Upload className="h-4 w-4 mr-2" /> Load
          </Button>
        </div>

        {mode === "save" ? (
          <div className="space-y-4">
            <div>
              <Label>Preset Name</Label>
              <Input
                placeholder="My Vocal Boost"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
            <Button onClick={handleSave} className="w-full">Save Preset</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Button variant="outline" size="sm" onClick={() => document.getElementById("import-preset")?.click()} className="w-full">
              <Upload className="h-4 w-4 mr-2" /> Import .json
            </Button>
            <input id="import-preset" type="file" accept=".json" className="hidden" onChange={handleImport} />

            <ScrollArea className="h-80">
              {presets.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No presets saved yet</p>
              ) : (
                <div className="space-y-3">
                  {presets.map((p, i) => (
                    <Card key={i} className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{p.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {p.ranges.length} bands • {new Date(p.createdAt).toLocaleDateString()}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {p.ranges.map((r, j) => (
                              <span key={j} className="text-xs bg-primary/10 px-2 py-0.5 rounded">
                                {r.minFreq}-{r.maxFreq}Hz ×{r.gain.toFixed(2)}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => handleLoad(p)} title="Load">
                            <Upload className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleExport(p)} title="Export">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(i)} title="Delete">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PresetManager;