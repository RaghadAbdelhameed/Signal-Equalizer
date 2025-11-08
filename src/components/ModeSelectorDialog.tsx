import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Music, Dog, Users, Sliders } from "lucide-react";

interface ModeSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMode: (mode: string) => void;
  currentMode: string;
}

const ModeSelectorDialog = ({
  open,
  onOpenChange,
  onSelectMode,
  currentMode,
}: ModeSelectorDialogProps) => {
  const modes = [
    {
      id: "generic",
      title: "Generic Mode",
      description: "Customize frequency subdivisions with flexible controls",
      icon: Sliders,
      color: "cyan",
    },
    {
      id: "music",
      title: "Musical Instruments",
      description: "Control individual instruments in a musical mix",
      icon: Music,
      color: "magenta",
    },
    {
      id: "animals",
      title: "Animal Sounds",
      description: "Adjust different animal sounds in a mixture",
      icon: Dog,
      color: "purple",
    },
    {
      id: "voices",
      title: "Human Voices",
      description: "Manage multiple voice tracks independently",
      icon: Users,
      color: "cyan",
    },
  ];

  const handleSelectMode = (modeId: string) => {
    onSelectMode(modeId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Change Equalizer Mode</DialogTitle>
          <DialogDescription>
            Select the mode that best fits your audio processing needs
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 py-4">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isActive = currentMode === mode.id;
            return (
              <Card
                key={mode.id}
                className={`p-4 cursor-pointer transition-all duration-300 hover:border-primary ${
                  isActive ? "border-primary bg-primary/5" : "border-border"
                }`}
                onClick={() => handleSelectMode(mode.id)}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-lg ${
                      mode.color === "cyan"
                        ? "bg-primary/20"
                        : mode.color === "magenta"
                        ? "bg-secondary/20"
                        : "bg-accent/20"
                    }`}
                  >
                    <Icon
                      className={`h-6 w-6 ${
                        mode.color === "cyan"
                          ? "text-primary"
                          : mode.color === "magenta"
                          ? "text-secondary"
                          : "text-accent"
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                      {mode.title}
                      {isActive && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                          Active
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground">{mode.description}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModeSelectorDialog;
