import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  frequencies: number[];
  gains: number[];
  createdAt: string;
}

interface PresetManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFrequencies: number[];
  currentGains: number[];
  onLoad: (preset: EqualizerPreset) => void;
}

const PresetManager = ({
  open,
  onOpenChange,
  currentFrequencies,
  currentGains,
  onLoad,
}: PresetManagerProps) => {
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<EqualizerPreset[]>(() => {
    const saved = localStorage.getItem("equalizer-presets");
    return saved ? JSON.parse(saved) : [];
  });
  const [mode, setMode] = useState<"save" | "load">("save");

  const handleSave = () => {
    if (!presetName.trim()) {
      toast.error("Please enter a preset name");
      return;
    }

    const newPreset: EqualizerPreset = {
      name: presetName.trim(),
      frequencies: currentFrequencies,
      gains: currentGains,
      createdAt: new Date().toISOString(),
    };

    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    localStorage.setItem("equalizer-presets", JSON.stringify(updatedPresets));

    toast.success(`Saved preset: ${newPreset.name}`);
    setPresetName("");
  };

  const handleLoad = (preset: EqualizerPreset) => {
    onLoad(preset);
    onOpenChange(false);
    toast.success(`Loaded preset: ${preset.name}`);
  };

  const handleDelete = (index: number) => {
    const updatedPresets = presets.filter((_, i) => i !== index);
    setPresets(updatedPresets);
    localStorage.setItem("equalizer-presets", JSON.stringify(updatedPresets));
    toast.success("Preset deleted");
  };

  const handleExport = (preset: EqualizerPreset) => {
    const dataStr = JSON.stringify(preset, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = `${preset.name.replace(/\s+/g, "_")}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
    toast.success("Preset exported");
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const preset = JSON.parse(e.target?.result as string) as EqualizerPreset;
        const updatedPresets = [...presets, preset];
        setPresets(updatedPresets);
        localStorage.setItem("equalizer-presets", JSON.stringify(updatedPresets));
        toast.success(`Imported preset: ${preset.name}`);
      } catch (error) {
        toast.error("Failed to import preset");
      }
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Equalizer Presets</DialogTitle>
          <DialogDescription>
            Save your custom equalizer settings or load previously saved presets.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button
            variant={mode === "save" ? "default" : "outline"}
            onClick={() => setMode("save")}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            Save New
          </Button>
          <Button
            variant={mode === "load" ? "default" : "outline"}
            onClick={() => setMode("load")}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            Load Preset
          </Button>
        </div>

        {mode === "save" ? (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="preset-name">Preset Name</Label>
              <Input
                id="preset-name"
                placeholder="e.g., Raghad's Equalizer"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
              />
            </div>
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">Current Settings:</p>
              <p className="text-muted-foreground">
                {currentFrequencies.length} frequency bands configured
              </p>
            </div>
            <Button onClick={handleSave} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Save Preset
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("preset-import")?.click()}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import File
              </Button>
              <input
                id="preset-import"
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
            </div>

            <ScrollArea className="h-[300px]">
              {presets.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No saved presets yet
                </div>
              ) : (
                <div className="space-y-2">
                  {presets.map((preset, index) => (
                    <Card
                      key={index}
                      className="p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{preset.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {preset.frequencies.length} bands •{" "}
                            {new Date(preset.createdAt).toLocaleDateString()}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {preset.frequencies.map((freq, i) => (
                              <span
                                key={i}
                                className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded"
                              >
                                {freq >= 1000 ? `${(freq / 1000).toFixed(1)}k` : freq}Hz
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleLoad(preset)}
                            title="Load preset"
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleExport(preset)}
                            title="Export preset"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(index)}
                            title="Delete preset"
                          >
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
