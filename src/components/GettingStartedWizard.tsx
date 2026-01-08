import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowRight, Sparkles, Bot, Workflow, MessageSquare, LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GettingStartedWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StepConfig {
  titleKey: string;
  descriptionKey: string;
  icon: LucideIcon;
  contentType: 'welcome' | 'features';
  introKey?: string;
  features?: string[];
  tipKey?: string;
  action?: { labelKey: string; path: string };
}

const stepConfigs: StepConfig[] = [
  {
    titleKey: 'gettingStarted.step1.title',
    descriptionKey: 'gettingStarted.step1.description',
    icon: Sparkles,
    contentType: 'welcome',
    introKey: 'gettingStarted.step1.intro',
  },
  {
    titleKey: 'gettingStarted.step2.title',
    descriptionKey: 'gettingStarted.step2.description',
    icon: MessageSquare,
    contentType: 'features',
    introKey: 'gettingStarted.step2.intro',
    features: [
      'gettingStarted.step2.feature1',
      'gettingStarted.step2.feature2',
      'gettingStarted.step2.feature3',
      'gettingStarted.step2.feature4',
    ],
    tipKey: 'gettingStarted.step2.tip',
    action: { labelKey: 'gettingStarted.step2.action', path: '/chat' },
  },
  {
    titleKey: 'gettingStarted.step3.title',
    descriptionKey: 'gettingStarted.step3.description',
    icon: Bot,
    contentType: 'features',
    introKey: 'gettingStarted.step3.intro',
    features: [
      'gettingStarted.step3.feature1',
      'gettingStarted.step3.feature2',
      'gettingStarted.step3.feature3',
      'gettingStarted.step3.feature4',
    ],
    tipKey: 'gettingStarted.step3.tip',
    action: { labelKey: 'gettingStarted.step3.action', path: '/agents' },
  },
  {
    titleKey: 'gettingStarted.step4.title',
    descriptionKey: 'gettingStarted.step4.description',
    icon: Workflow,
    contentType: 'features',
    introKey: 'gettingStarted.step4.intro',
    features: [
      'gettingStarted.step4.feature1',
      'gettingStarted.step4.feature2',
      'gettingStarted.step4.feature3',
      'gettingStarted.step4.feature4',
    ],
    tipKey: 'gettingStarted.step4.tip',
    action: { labelKey: 'gettingStarted.step4.action', path: '/stage' },
  },
];

export function GettingStartedWizard({ open, onOpenChange }: GettingStartedWizardProps) {
  const { t } = useTranslation('common');
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentStep < stepConfigs.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    // Always mark as completed when finishing the wizard
    localStorage.setItem('getting-started-completed', 'true');
    onOpenChange(false);
  };

  const handleAction = (path: string) => {
    // Always mark as completed when taking an action
    localStorage.setItem('getting-started-completed', 'true');
    onOpenChange(false);
    navigate(path);
  };

  const handleSkip = () => {
    // Always mark as completed when skipping
    localStorage.setItem('getting-started-completed', 'true');
    onOpenChange(false);
  };
  
  const handleClose = (open: boolean) => {
    if (!open) {
      // Mark as completed when closing via X button or clicking outside
      localStorage.setItem('getting-started-completed', 'true');
    }
    onOpenChange(open);
  };

  const step = stepConfigs[currentStep];
  const Icon = step.icon;

  const renderWelcomeContent = () => (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        {t('gettingStarted.step1.intro')}
      </p>
      <div className="grid gap-3">
        <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
          <MessageSquare className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="font-medium">{t('gettingStarted.step1.chatTitle')}</p>
            <p className="text-sm text-muted-foreground">
              {t('gettingStarted.step1.chatDescription')}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
          <Bot className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="font-medium">{t('gettingStarted.step1.agentsTitle')}</p>
            <p className="text-sm text-muted-foreground">
              {t('gettingStarted.step1.agentsDescription')}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
          <Workflow className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="font-medium">{t('gettingStarted.step1.workflowsTitle')}</p>
            <p className="text-sm text-muted-foreground">
              {t('gettingStarted.step1.workflowsDescription')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFeaturesContent = () => (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        {t(step.introKey!)}
      </p>
      <ul className="space-y-2 text-sm">
        {step.features?.map((featureKey, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary mt-0.5" />
            <span>{t(featureKey)}</span>
          </li>
        ))}
      </ul>
      {step.tipKey && (
        <Badge variant="secondary">{t(step.tipKey)}</Badge>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            {t(step.titleKey)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">{t(step.descriptionKey)}</p>

          <Card>
            <CardContent className="pt-6">
              {step.contentType === 'welcome' ? renderWelcomeContent() : renderFeaturesContent()}
            </CardContent>
          </Card>

          <div className="flex items-center gap-2">
            {stepConfigs.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  idx <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-end gap-4">
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleSkip}>
                {t('gettingStarted.ui.skipTour')}
              </Button>
              {step.action && (
                <Button
                  variant="outline"
                  onClick={() => handleAction(step.action!.path)}
                >
                  {t(step.action.labelKey)}
                </Button>
              )}
              <Button onClick={handleNext}>
                {currentStep < stepConfigs.length - 1 ? (
                  <>
                    {t('gettingStarted.ui.next')}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  t('gettingStarted.ui.getStarted')
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
