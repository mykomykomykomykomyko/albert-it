import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { Settings, RotateCcw, ChevronUp, ChevronDown, Type, AlignJustify, Palette, Minus, Plus } from "lucide-react";

export const AccessibilityPreferences = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { preferences, updatePreferences, resetPreferences } = useUserPreferences();

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
    const currentIndex = textSizes.findIndex(s => s.value === preferences.text_size);
    if (direction === 'up' && currentIndex < textSizes.length - 1) {
      updatePreferences({ text_size: textSizes[currentIndex + 1].value as any });
    } else if (direction === 'down' && currentIndex > 0) {
      updatePreferences({ text_size: textSizes[currentIndex - 1].value as any });
    }
  };

  const adjustLineSpacing = (direction: 'up' | 'down') => {
    const currentIndex = lineSpacings.findIndex(s => s.value === preferences.line_spacing);
    if (direction === 'up' && currentIndex < lineSpacings.length - 1) {
      updatePreferences({ line_spacing: lineSpacings[currentIndex + 1].value as any });
    } else if (direction === 'down' && currentIndex > 0) {
      updatePreferences({ line_spacing: lineSpacings[currentIndex - 1].value as any });
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-24 z-40 h-12 w-12 rounded-full shadow-lg hover:scale-110 transition-transform"
        title="Accessibility Preferences"
      >
        <Settings className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-6 right-24 z-50 w-[600px] max-h-[80vh] overflow-y-auto">
      <Card className="p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Accessibility Preferences</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetPreferences}
              title="Reset to defaults"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              Hide
            </Button>
          </div>
        </div>

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
                disabled={preferences.text_size === 'small'}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="flex-1 text-center font-medium">
                {textSizes.find(s => s.value === preferences.text_size)?.label}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => adjustTextSize('up')}
                disabled={preferences.text_size === 'x-large'}
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
              value={preferences.font_family}
              onValueChange={(value) => updatePreferences({ font_family: value as any })}
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
                disabled={preferences.line_spacing === 'compact'}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="flex-1 text-center font-medium">
                {lineSpacings.find(s => s.value === preferences.line_spacing)?.label}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => adjustLineSpacing('up')}
                disabled={preferences.line_spacing === 'loose'}
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
                  onClick={() => updatePreferences({ contrast_theme: theme.value as any })}
                  className={`h-10 rounded border-2 ${theme.colors.bg} ${theme.colors.text} flex items-center justify-center text-xs font-medium transition-all ${
                    preferences.contrast_theme === theme.value ? 'ring-2 ring-primary ring-offset-2' : ''
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
              checked={preferences.enhance_inputs}
              onCheckedChange={(checked) => updatePreferences({ enhance_inputs: checked })}
            />
          </div>
        </Card>
      </Card>
    </div>
  );
};
