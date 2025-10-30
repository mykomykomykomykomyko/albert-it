import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { Settings, RotateCcw, ChevronUp, ChevronDown, Type, AlignJustify, Palette, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export const AccessibilityPreferences = () => {
  const { preferences, updatePreferences, resetPreferences } = useUserPreferences();
  const [tempPreferences, setTempPreferences] = useState(preferences);
  const [hasChanges, setHasChanges] = useState(false);

  // Update temp preferences when loaded preferences change
  useEffect(() => {
    setTempPreferences(preferences);
    setHasChanges(false);
  }, [preferences]);

  // When sheet closes without saving, revert to saved preferences
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTempPreferences(preferences);
      setHasChanges(false);
    }
  };

  // Apply temp preferences to DOM for live preview
  useEffect(() => {

    const root = document.documentElement;

    // Text size
    const sizeMap: Record<typeof tempPreferences.text_size, string> = {
      'small': '90%',
      'medium': '100%',
      'large': '115%',
      'x-large': '135%'
    };
    root.style.fontSize = sizeMap[tempPreferences.text_size];

    // Font family
    const familyMap: Record<typeof tempPreferences.font_family, string> = {
      'default': '',
      'sans': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'serif': 'Georgia, Cambria, "Times New Roman", Times, serif',
      'mono': '"Courier New", Courier, monospace',
      'dyslexic': '"Comic Sans MS", Arial, sans-serif'
    };
    document.body.style.fontFamily = familyMap[tempPreferences.font_family] || '';

    // Line spacing
    const lineMap: Record<typeof tempPreferences.line_spacing, string> = {
      'compact': '1.3',
      'normal': '1.6',
      'relaxed': '1.9',
      'loose': '2.2'
    };
    document.body.style.lineHeight = lineMap[tempPreferences.line_spacing];
    root.style.lineHeight = lineMap[tempPreferences.line_spacing];

    // Enhance inputs (use different ID for preview)
    const styleId = 'a11y-enhance-inputs-preview';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    if (tempPreferences.enhance_inputs) {
      styleEl.textContent = `
      a, button, input, select, textarea, [role="button"], [tabindex="0"] {
        outline: 2px solid hsl(var(--primary) / 0.3) !important;
        outline-offset: 2px;
      }
      a:focus, button:focus, input:focus, select:focus, textarea:focus, [role="button"]:focus, [tabindex="0"]:focus {
        outline: 3px solid hsl(var(--primary)) !important;
        outline-offset: 2px;
      }`;
    } else {
      styleEl.textContent = '';
    }

    // Contrast themes (inline for preview)
    const themeVarsMap: Record<string, Record<string, string>> = {
      'high-contrast': {
        '--background': '0 0% 0%',
        '--foreground': '0 0% 100%',
        '--card': '0 0% 5%',
        '--card-foreground': '0 0% 100%',
        '--primary': '0 0% 100%',
        '--primary-foreground': '0 0% 0%',
        '--muted': '0 0% 10%',
        '--muted-foreground': '0 0% 90%',
        '--border': '0 0% 30%'
      },
      'yellow-black': {
        '--background': '60 100% 50%',
        '--foreground': '0 0% 0%',
        '--card': '60 100% 45%',
        '--card-foreground': '0 0% 0%',
        '--primary': '0 0% 0%',
        '--primary-foreground': '60 100% 50%',
        '--muted': '60 100% 40%',
        '--muted-foreground': '0 0% 20%',
        '--border': '0 0% 20%'
      },
      'black-yellow': {
        '--background': '0 0% 0%',
        '--foreground': '60 100% 50%',
        '--card': '0 0% 5%',
        '--card-foreground': '60 100% 50%',
        '--primary': '60 100% 50%',
        '--primary-foreground': '0 0% 0%',
        '--muted': '0 0% 10%',
        '--muted-foreground': '60 100% 40%',
        '--border': '60 100% 30%'
      },
      'white-black': {
        '--background': '0 0% 100%',
        '--foreground': '0 0% 0%',
        '--card': '0 0% 98%',
        '--card-foreground': '0 0% 0%',
        '--primary': '0 0% 0%',
        '--primary-foreground': '0 0% 100%',
        '--muted': '0 0% 95%',
        '--muted-foreground': '0 0% 30%',
        '--border': '0 0% 80%'
      },
      'black-white': {
        '--background': '0 0% 0%',
        '--foreground': '0 0% 100%',
        '--card': '0 0% 5%',
        '--card-foreground': '0 0% 100%',
        '--primary': '0 0% 100%',
        '--primary-foreground': '0 0% 0%',
        '--muted': '0 0% 10%',
        '--muted-foreground': '0 0% 80%',
        '--border': '0 0% 30%'
      }
    };
    
    const applyThemeVars = (vars?: Record<string, string>) => {
      const keys = ['--background','--foreground','--card','--card-foreground','--primary','--primary-foreground','--muted','--muted-foreground','--border'];
      if (vars) keys.forEach((k) => vars[k] && root.style.setProperty(k, vars[k]!));
      else keys.forEach((k) => root.style.removeProperty(k));
    };

    if (tempPreferences.contrast_theme !== 'default') {
      applyThemeVars(themeVarsMap[tempPreferences.contrast_theme]);
      root.classList.add('custom-contrast');
    } else {
      applyThemeVars(undefined);
      root.classList.remove('custom-contrast');
    }

  }, [tempPreferences]);

  const handlePreferenceChange = (updates: Partial<typeof preferences>) => {
    setTempPreferences(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    await updatePreferences(tempPreferences);
    setHasChanges(false);
    toast.success("Accessibility preferences saved!");
  };

  const handleReset = async () => {
    await resetPreferences();
    setHasChanges(false);
    toast.success("Preferences reset to defaults!");
  };

  const textSizes = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
    { value: 'x-large', label: 'Extra Large' }
  ];

  const fontFamilies = [
    { value: 'default', label: 'Default' },
    { value: 'sans', label: 'Sans-serif' },
    { value: 'serif', label: 'Serif' },
    { value: 'mono', label: 'Monospace' },
    { value: 'dyslexic', label: 'Dyslexic-friendly' }
  ];

  const lineSpacings = [
    { value: 'compact', label: 'Compact' },
    { value: 'normal', label: 'Normal' },
    { value: 'relaxed', label: 'Relaxed' },
    { value: 'loose', label: 'Loose' }
  ];

  const contrastThemes = [
    { value: 'default', label: 'Default', colors: { bg: 'bg-background', text: 'text-foreground' } },
    { value: 'high-contrast', label: 'High Contrast', colors: { bg: 'bg-black', text: 'text-white' } },
    { value: 'yellow-black', label: 'Yellow on Black', colors: { bg: 'bg-yellow-400', text: 'text-black' } },
    { value: 'black-yellow', label: 'Black on Yellow', colors: { bg: 'bg-black', text: 'text-yellow-400' } },
    { value: 'white-black', label: 'White on Black', colors: { bg: 'bg-white', text: 'text-black' } },
    { value: 'black-white', label: 'Black on White', colors: { bg: 'bg-black', text: 'text-white' } }
  ];

  const adjustTextSize = (direction: 'up' | 'down') => {
    const currentIndex = textSizes.findIndex(s => s.value === tempPreferences.text_size);
    if (direction === 'up' && currentIndex < textSizes.length - 1) {
      handlePreferenceChange({ text_size: textSizes[currentIndex + 1].value as any });
    } else if (direction === 'down' && currentIndex > 0) {
      handlePreferenceChange({ text_size: textSizes[currentIndex - 1].value as any });
    }
  };

  const adjustLineSpacing = (direction: 'up' | 'down') => {
    const currentIndex = lineSpacings.findIndex(s => s.value === tempPreferences.line_spacing);
    if (direction === 'up' && currentIndex < lineSpacings.length - 1) {
      handlePreferenceChange({ line_spacing: lineSpacings[currentIndex + 1].value as any });
    } else if (direction === 'down' && currentIndex > 0) {
      handlePreferenceChange({ line_spacing: lineSpacings[currentIndex - 1].value as any });
    }
  };

  return (
    <Sheet onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="Accessibility Preferences"
          className="hover:bg-accent"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Accessibility Preferences</SheetTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            title="Reset to defaults"
            className="absolute right-12 top-4"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* Text Size */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Type className="h-5 w-5" />
              <Label className="text-base font-medium">Text Size</Label>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Adjust text size</p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => adjustTextSize('down')}
                disabled={tempPreferences.text_size === 'small'}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="flex-1 text-center font-medium">
                {textSizes.find(s => s.value === tempPreferences.text_size)?.label}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => adjustTextSize('up')}
                disabled={tempPreferences.text_size === 'x-large'}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          {/* Text Style */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Type className="h-5 w-5" />
              <Label className="text-base font-medium">Text Style</Label>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Change the font used</p>
            <Select
              value={tempPreferences.font_family}
              onValueChange={(value) => handlePreferenceChange({ font_family: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontFamilies.map(font => (
                  <SelectItem key={font.value} value={font.value}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>

          {/* Line Spacing */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlignJustify className="h-5 w-5" />
              <Label className="text-base font-medium">Line Spacing</Label>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Adjust spacing between lines</p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => adjustLineSpacing('down')}
                disabled={tempPreferences.line_spacing === 'compact'}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="flex-1 text-center font-medium">
                {lineSpacings.find(s => s.value === tempPreferences.line_spacing)?.label}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => adjustLineSpacing('up')}
                disabled={tempPreferences.line_spacing === 'loose'}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          {/* Contrast */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Palette className="h-5 w-5" />
              <Label className="text-base font-medium">Contrast</Label>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Change text and background colors</p>
            <div className="grid grid-cols-3 gap-2">
              {contrastThemes.map(theme => (
                <button
                  key={theme.value}
                  onClick={() => handlePreferenceChange({ contrast_theme: theme.value as any })}
                  className={`h-10 rounded border-2 ${theme.colors.bg} ${theme.colors.text} flex items-center justify-center text-xs font-medium transition-all ${
                    tempPreferences.contrast_theme === theme.value ? 'ring-2 ring-primary ring-offset-2' : ''
                  }`}
                  title={theme.label}
                >
                  Aa
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Enhance Inputs */}
        <Card className="p-4 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Enhance Inputs</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Emphasize links, buttons, menus, and text fields
              </p>
            </div>
            <Switch
              checked={tempPreferences.enhance_inputs}
              onCheckedChange={(checked) => handlePreferenceChange({ enhance_inputs: checked })}
            />
          </div>
        </Card>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
            size="lg"
            className="w-full"
          >
            {hasChanges ? 'Save Changes' : 'No Changes to Save'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
