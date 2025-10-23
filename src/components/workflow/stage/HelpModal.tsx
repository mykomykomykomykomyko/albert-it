import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface HelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HelpModal = ({ open, onOpenChange }: HelpModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agent Builder Console Help</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <section>
            <h3 className="font-semibold mb-2">Getting Started</h3>
            <p className="text-muted-foreground">
              The Agent Builder Console allows you to create multi-stage AI workflows by connecting agents and functions together.
            </p>
          </section>
          
          <section>
            <h3 className="font-semibold mb-2">Adding Stages</h3>
            <p className="text-muted-foreground">
              Click "Add Stage" to create a new workflow stage. Each stage can contain multiple agents and functions.
            </p>
          </section>
          
          <section>
            <h3 className="font-semibold mb-2">Adding Agents</h3>
            <p className="text-muted-foreground">
              Drag and drop agents from the library sidebar into stages, or use the "Add Agent" button on mobile.
            </p>
          </section>
          
          <section>
            <h3 className="font-semibold mb-2">Connecting Nodes</h3>
            <p className="text-muted-foreground">
              Click on an output port (bottom dot) and then click on an input port (top dot) to create connections between nodes.
            </p>
          </section>
          
          <section>
            <h3 className="font-semibold mb-2">Running Workflows</h3>
            <p className="text-muted-foreground">
              Click "Run Workflow" to execute your workflow. Enter input text in the sidebar and watch as each stage processes the data.
            </p>
          </section>
          
          <section>
            <h3 className="font-semibold mb-2">Saving & Loading</h3>
            <p className="text-muted-foreground">
              Use the Save button to download your workflow as JSON. Use Load to import previously saved workflows.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};