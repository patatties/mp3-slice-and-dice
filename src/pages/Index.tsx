import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Music } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const tools = [
    {
      title: "Audio Splitter",
      description: "Upload your audio, set split points, and download individual segments with ease.",
      icon: Music,
      path: "/audio-splitter",
      color: "bg-primary/10 text-primary"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-12">
        <header className="text-center mb-16">
          <h1 className="text-6xl font-bold bg-gradient-accent bg-clip-text text-transparent mb-4">
            Patatties Tools
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Een verzameling handige tools om je werk makkelijker te maken. Kies een tool hieronder om te beginnen.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {tools.map((tool) => (
            <Link key={tool.path} to={tool.path}>
              <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${tool.color} flex items-center justify-center mb-4`}>
                    <tool.icon className="w-6 h-6" />
                  </div>
                  <CardTitle>{tool.title}</CardTitle>
                  <CardDescription>{tool.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Klik om te openen →
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground/80">
            🔒 Alle tools werken in je browser. We slaan geen data op.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
