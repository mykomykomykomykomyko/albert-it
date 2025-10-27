import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LearnMoreTooltipProps {
  title: string;
  description: string;
  linkTo?: string;
  linkText?: string;
  onLearnMore?: () => void;
}

export function LearnMoreTooltip({ title, description, linkTo, linkText = 'Learn more', onLearnMore }: LearnMoreTooltipProps) {
  const navigate = useNavigate();

  const handleLearnMore = () => {
    if (onLearnMore) {
      onLearnMore();
    } else if (linkTo) {
      navigate(linkTo);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-5 w-5">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold">{title}</p>
            <p className="text-sm">{description}</p>
            {(linkTo || onLearnMore) && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-primary"
                onClick={handleLearnMore}
              >
                {linkText} →
              </Button>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
