import { ChatHeader } from "@/components/ChatHeader";

const Canvas = () => {
  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Canvas</h1>
          <p className="text-muted-foreground">Visual workflow canvas coming soon...</p>
        </div>
      </div>
    </div>
  );
};

export default Canvas;
