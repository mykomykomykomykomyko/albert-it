import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, ArrowRight, Sparkles, Bot, Workflow, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GettingStartedWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const steps = [
  {
    title: 'Welcome to Albert',
    description: 'Your AI-powered assistant platform for building intelligent workflows',
    icon: Sparkles,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Albert combines the power of AI agents, workflows, and intelligent conversations to help you solve complex problems.
        </p>
        <div className="grid gap-3">
          <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
            <MessageSquare className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Chat Interface</p>
              <p className="text-sm text-muted-foreground">
                Have natural conversations with AI, upload files, and get instant answers
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
            <Bot className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Custom Agents</p>
              <p className="text-sm text-muted-foreground">
                Create specialized AI agents tailored to specific tasks
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
            <Workflow className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Visual Workflows</p>
              <p className="text-sm text-muted-foreground">
                Build complex multi-agent workflows with a visual canvas
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Start with Chat',
    description: 'The quickest way to get started',
    icon: MessageSquare,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          The chat interface is your main hub for interacting with AI. You can:
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary mt-0.5" />
            <span>Upload PDFs, Excel files, images, and documents</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary mt-0.5" />
            <span>Switch between different AI agents mid-conversation</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary mt-0.5" />
            <span>Use web search and built-in tools</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary mt-0.5" />
            <span>View full request payloads for transparency</span>
          </li>
        </ul>
        <Badge variant="secondary">Tip: Press Ctrl+Enter to send messages</Badge>
      </div>
    ),
    action: { label: 'Go to Chat', path: '/chat' },
  },
  {
    title: 'Create Custom Agents',
    description: 'Build AI assistants for specific tasks',
    icon: Bot,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Agents are specialized AI assistants with custom instructions. You can:
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary mt-0.5" />
            <span>Define system prompts to control agent behavior</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary mt-0.5" />
            <span>Add custom profile pictures and tags</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary mt-0.5" />
            <span>Share agents with team members</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary mt-0.5" />
            <span>Browse the agent marketplace for templates</span>
          </li>
        </ul>
        <Badge variant="secondary">Tip: Use frameworks from the library</Badge>
      </div>
    ),
    action: { label: 'Create Agent', path: '/agents' },
  },
  {
    title: 'Build Workflows',
    description: 'Connect agents for complex automation',
    icon: Workflow,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Workflows let you chain multiple agents and functions together:
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary mt-0.5" />
            <span>Drag and drop agents onto stages</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary mt-0.5" />
            <span>Connect nodes to pass data between stages</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary mt-0.5" />
            <span>Add functions like web search and API calls</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary mt-0.5" />
            <span>Save and share workflows with others</span>
          </li>
        </ul>
        <Badge variant="secondary">Tip: Start simple and iterate</Badge>
      </div>
    ),
    action: { label: 'Open Stage', path: '/stage' },
  },
];

export function GettingStartedWizard({ open, onOpenChange }: GettingStartedWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    if (dontShowAgain) {
      localStorage.setItem('getting-started-completed', 'true');
    }
    onOpenChange(false);
  };

  const handleAction = (path: string) => {
    if (dontShowAgain) {
      localStorage.setItem('getting-started-completed', 'true');
    }
    onOpenChange(false);
    navigate(path);
  };

  const handleSkip = () => {
    if (dontShowAgain) {
      localStorage.setItem('getting-started-completed', 'true');
    }
    onOpenChange(false);
  };

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            {step.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">{step.description}</p>

          <Card>
            <CardContent className="pt-6">
              {step.content}
            </CardContent>
          </Card>

          <div className="flex items-center gap-2">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  idx <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="dont-show" 
                checked={dontShowAgain}
                onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
              />
              <label 
                htmlFor="dont-show" 
                className="text-sm text-muted-foreground cursor-pointer select-none"
              >
                Don't show again
              </label>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleSkip}>
                Skip Tour
              </Button>
              {step.action && (
                <Button
                  variant="outline"
                  onClick={() => handleAction(step.action!.path)}
                >
                  {step.action.label}
                </Button>
              )}
              <Button onClick={handleNext}>
                {currentStep < steps.length - 1 ? (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  'Get Started'
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
