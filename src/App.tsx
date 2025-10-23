import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Agents from "./pages/Agents";
import EnhancedChat from "./components/Chat";
import Stage from "./pages/Stage";
import Canvas from "./pages/Canvas";
import ImageAnalysis from "./pages/ImageAnalysis";
import VoiceAnalysis from "./pages/VoiceAnalysis";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/chat" element={<EnhancedChat />} />
        <Route path="/chat/:id" element={<EnhancedChat />} />
        <Route path="/stage" element={<Stage />} />
        <Route path="/canvas" element={<Canvas />} />
        <Route path="/image" element={<ImageAnalysis />} />
        <Route path="/voice" element={<VoiceAnalysis />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
