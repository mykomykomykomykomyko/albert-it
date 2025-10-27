import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, Calculator, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ToolsToolbarProps {
  onToolResult: (result: string, toolName: string) => void;
}

export function ToolsToolbar({ onToolResult }: ToolsToolbarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleWebSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-search', {
        body: { query: searchQuery }
      });

      if (error) throw error;

      const results = data.results?.slice(0, 5).map((r: any, i: number) => 
        `${i + 1}. ${r.title}\n   ${r.link}\n   ${r.snippet}`
      ).join('\n\n');

      onToolResult(
        `Web Search Results for "${searchQuery}":\n\n${results}`,
        'Web Search'
      );
      setSearchQuery('');
      setIsExpanded(false);
      toast.success('Search completed');
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to perform web search');
    } finally {
      setIsSearching(false);
    }
  };

  const handleGetDateTime = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('time');
      
      if (error) throw error;

      onToolResult(
        `Current Date & Time: ${new Date(data.datetime).toLocaleString()}`,
        'Date & Time'
      );
      toast.success('Current time retrieved');
    } catch (error) {
      console.error('Time error:', error);
      // Fallback to local time
      onToolResult(
        `Current Date & Time: ${new Date().toLocaleString()}`,
        'Date & Time'
      );
    }
  };

  const handleCalculator = () => {
    const expression = prompt('Enter a mathematical expression (e.g., 2 + 2):');
    if (!expression) return;

    try {
      // Simple eval - in production, use a proper math parser
      const result = eval(expression);
      onToolResult(
        `${expression} = ${result}`,
        'Calculator'
      );
      toast.success('Calculation completed');
    } catch (error) {
      toast.error('Invalid expression');
    }
  };

  return (
    <div className="border-t bg-card">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Quick Tools</Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </div>

      {isExpanded && (
        <Card className="mx-4 mb-4">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Web Search</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search the web..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleWebSearch()}
                  />
                  <Button
                    onClick={handleWebSearch}
                    disabled={isSearching}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {isSearching ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleGetDateTime}
                  variant="outline"
                  className="flex-1"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Get Date & Time
                </Button>
                <Button
                  onClick={handleCalculator}
                  variant="outline"
                  className="flex-1"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculator
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
