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
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

interface FrequencyRange {
  minFreq: number;
  maxFreq: number;
  gain: number;
}

interface AddFrequencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (range: FrequencyRange) => void;
  existingRanges: FrequencyRange[];
}

const AddFrequencyDialog = ({
  open,
  onOpenChange,
  onAdd,
  existingRanges,
}: AddFrequencyDialogProps) => {
  const [minFreq, setMinFreq] = useState(100);
  const [maxFreq, setMaxFreq] = useState(500);
  const [gain, setGain] = useState(1);

  const handleAdd = () => {
    if (minFreq >= maxFreq) {
      toast.error("Minimum frequency must be less than maximum frequency");
      return;
    }

    // Check for overlapping ranges
    const overlaps = existingRanges.some(
      (range) =>
        (minFreq >= range.minFreq && minFreq <= range.maxFreq) ||
        (maxFreq >= range.minFreq && maxFreq <= range.maxFreq) ||
        (minFreq <= range.minFreq && maxFreq >= range.maxFreq)
    );

    if (overlaps) {
      toast.error("This frequency range overlaps with an existing range");
      return;
    }

    onAdd({ minFreq, maxFreq, gain });
    setMinFreq(100);
    setMaxFreq(500);
    setGain(1);
    onOpenChange(false);
    toast.success(`Added frequency range ${minFreq}-${maxFreq}Hz`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Custom Frequency Range</DialogTitle>
          <DialogDescription>
            Define a frequency range (20Hz - 20,000Hz) and set its gain scale (0 - 2)
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-3">
            <Label htmlFor="minFreq" className="text-sm font-medium">
              Minimum Frequency: {minFreq}Hz
            </Label>
            <Slider
              id="minFreq"
              value={[minFreq]}
              onValueChange={(v) => setMinFreq(v[0])}
              min={20}
              max={19999}
              step={10}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Range: 20Hz - 19,999Hz
            </p>
          </div>
          
          <div className="grid gap-3">
            <Label htmlFor="maxFreq" className="text-sm font-medium">
              Maximum Frequency: {maxFreq}Hz
            </Label>
            <Slider
              id="maxFreq"
              value={[maxFreq]}
              onValueChange={(v) => setMaxFreq(v[0])}
              min={21}
              max={20000}
              step={10}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Range: 21Hz - 20,000Hz
            </p>
          </div>
          
          <div className="grid gap-3">
            <Label htmlFor="gain" className="text-sm font-medium">
              Gain Scale: {gain.toFixed(2)}
            </Label>
            <Slider
              id="gain"
              value={[gain]}
              onValueChange={(v) => setGain(v[0])}
              min={0}
              max={2}
              step={0.01}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              0 = silence, 1 = unchanged, 2 = double volume
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd}>Add Frequency</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddFrequencyDialog;
