import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Music, Dog, Users, Sliders } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  const [hoveredMode, setHoveredMode] = useState<string | null>(null);

  const modes = [
    {
      id: "generic",
      title: "Generic Mode",
      description: "Customize frequency subdivisions with flexible controls",
      icon: Sliders,
      color: "cyan",
      path: "/equalizer/generic",
    },
    {
      id: "music",
      title: "Musical Instruments",
      description: "Control individual instruments in a musical mix",
      icon: Music,
      color: "magenta",
      path: "/equalizer/music",
    },
    {
      id: "animals",
      title: "Animal Sounds",
      description: "Adjust different animal sounds in a mixture",
      icon: Dog,
      color: "purple",
      path: "/equalizer/animals",
    },
    {
      id: "voices",
      title: "Human Voices",
      description: "Manage multiple voice tracks independently",
      icon: Users,
      color: "cyan",
      path: "/equalizer/voices",
    },
  ];

  const getGlowClass = (color: string) => {
    switch (color) {
      case "cyan":
        return "hover:shadow-[0_0_30px_hsla(var(--glow-cyan),0.6)]";
      case "magenta":
        return "hover:shadow-[0_0_30px_hsla(var(--glow-magenta),0.6)]";
      case "purple":
        return "hover:shadow-[0_0_30px_hsla(var(--glow-purple),0.6)]";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Sliders className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Signal Equalizer
                </h1>
                <p className="text-xs text-muted-foreground">Professional Audio Processing</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 container mx-auto px-6 py-12">
        <div className="text-center mb-16 animate-slide-up">
          <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Choose Your Equalizer Mode
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Process and manipulate audio signals with precision using our advanced equalizer modes
          </p>
        </div>

        {/* Mode Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {modes.map((mode, index) => {
            const Icon = mode.icon;
            return (
              <Card
                key={mode.id}
                className={`relative p-8 bg-card border-2 transition-all duration-300 cursor-pointer group ${getGlowClass(
                  mode.color
                )} ${
                  hoveredMode === mode.id ? "border-primary scale-[1.02]" : "border-border"
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
                onMouseEnter={() => setHoveredMode(mode.id)}
                onMouseLeave={() => setHoveredMode(null)}
                onClick={() => navigate(mode.path)}
              >
                <div className="flex flex-col items-start gap-4">
                  <div
                    className={`p-4 rounded-xl bg-gradient-to-br ${
                      mode.color === "cyan"
                        ? "from-primary/20 to-primary/5"
                        : mode.color === "magenta"
                        ? "from-secondary/20 to-secondary/5"
                        : "from-accent/20 to-accent/5"
                    } transition-transform duration-300 ${
                      hoveredMode === mode.id ? "scale-110" : ""
                    }`}
                  >
                    <Icon
                      className={`h-8 w-8 ${
                        mode.color === "cyan"
                          ? "text-primary"
                          : mode.color === "magenta"
                          ? "text-secondary"
                          : "text-accent"
                      }`}
                    />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2">{mode.title}</h3>
                    <p className="text-muted-foreground">{mode.description}</p>
                  </div>

                  <Button
                    className={`w-full transition-all duration-300 ${
                      hoveredMode === mode.id ? "translate-x-2" : ""
                    }`}
                    variant={hoveredMode === mode.id ? "default" : "outline"}
                  >
                    Launch Mode
                  </Button>
                </div>

                {/* Decorative Corner */}
                <div
                  className={`absolute top-0 right-0 w-32 h-32 opacity-20 transition-opacity duration-300 ${
                    hoveredMode === mode.id ? "opacity-40" : ""
                  }`}
                  style={{
                    background: `radial-gradient(circle at top right, ${
                      mode.color === "cyan"
                        ? "hsl(var(--glow-cyan))"
                        : mode.color === "magenta"
                        ? "hsl(var(--glow-magenta))"
                        : "hsl(var(--glow-purple))"
                    }, transparent)`,
                  }}
                />
              </Card>
            );
          })}
        </div>

        {/* Features Section */}
        <div className="mt-20 text-center">
          <h3 className="text-2xl font-bold mb-8">Key Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { title: "Real-time Processing", desc: "Instant audio manipulation" },
              { title: "Dual Viewers", desc: "Compare input and output signals" },
              { title: "Spectrograms", desc: "Visual frequency analysis" },
            ].map((feature, i) => (
              <div
                key={i}
                className="p-6 rounded-xl bg-card border border-border animate-fade-in"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <h4 className="font-semibold mb-2">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 backdrop-blur-sm py-6">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          Signal Equalizer © 2025 - Advanced Audio Processing Platform
        </div>
      </footer>
    </div>
  );
};

export default Index;
