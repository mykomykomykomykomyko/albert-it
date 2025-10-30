import { ChatHeader } from "@/components/ChatHeader";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
  Panel,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Play, Save, Upload, Trash2, Store, Sparkles, X, Loader2, FileInput, FileOutput, GitMerge, Repeat, Download, Layout, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Zap, Settings } from "lucide-react";
import { toast } from "sonner";
import { useAgents } from "@/hooks/useAgents";
import { CustomNode, CustomNodeData } from "@/components/canvas/CustomNode";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FunctionSelector } from "@/components/workflow/FunctionSelector";
import { AgentSelectorDialog } from "@/components/agents/AgentSelectorDialog";
import type { FunctionDefinition } from "@/types/functions";
import { toolDefinitions, type ToolDefinition } from "@/lib/toolDefinitions";

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

// Template definitions
const TEMPLATES = {
  'simple-chat': {
    name: 'Simple AI Chat',
    description: 'Basic input → agent → output flow',
    category: 'basics',
    nodes: [
      { id: '1', type: 'custom', position: { x: 100, y: 200 }, data: { label: 'User Input', nodeType: 'input', inputType: 'text', userPrompt: 'Hello, how are you?', status: 'idle' } },
      { id: '2', type: 'custom', position: { x: 400, y: 200 }, data: { label: 'AI Assistant', nodeType: 'agent', systemPrompt: 'You are a helpful assistant.', status: 'idle' } },
      { id: '3', type: 'custom', position: { x: 700, y: 200 }, data: { label: 'Response', nodeType: 'output', status: 'idle' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: 'hsl(var(--primary))' } },
    ],
  },
  'research-report-generator': {
    name: 'Research & Report Generator',
    description: 'Comprehensive research workflow with fact-checking and structured output',
    category: 'ai-workflows',
    nodes: [
      { id: '1', type: 'custom', position: { x: 50, y: 250 }, data: { label: 'Research Topic', nodeType: 'input', inputType: 'text', userPrompt: 'AI in Healthcare', status: 'idle' } },
      { id: '2', type: 'custom', position: { x: 300, y: 150 }, data: { label: 'Primary Researcher', nodeType: 'agent', systemPrompt: 'Research the topic thoroughly. Find key facts, statistics, and current trends. Provide detailed findings with sources.', status: 'idle' } },
      { id: '3', type: 'custom', position: { x: 300, y: 350 }, data: { label: 'Expert Analyst', nodeType: 'agent', systemPrompt: 'Analyze the topic from an expert perspective. Identify challenges, opportunities, and future implications.', status: 'idle' } },
      { id: '4', type: 'custom', position: { x: 550, y: 250 }, data: { label: 'Fact Checker', nodeType: 'agent', systemPrompt: 'Review the research findings. Verify accuracy, identify any contradictions, and flag claims that need verification.', status: 'idle' } },
      { id: '5', type: 'custom', position: { x: 800, y: 250 }, data: { label: 'Report Compiler', nodeType: 'agent', systemPrompt: 'Compile all research into a comprehensive report with: Executive Summary, Key Findings, Analysis, Conclusions, and Recommendations. Use professional formatting.', status: 'idle' } },
      { id: '6', type: 'custom', position: { x: 1050, y: 250 }, data: { label: 'Final Report', nodeType: 'output', status: 'idle' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e2-4', source: '2', target: '4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e5-6', source: '5', target: '6', animated: true, style: { stroke: 'hsl(var(--primary))' } },
    ],
  },
  'customer-support-workflow': {
    name: 'Customer Support Automation',
    description: 'Intelligent ticket processing with classification and routing',
    category: 'business',
    nodes: [
      { id: '1', type: 'custom', position: { x: 50, y: 300 }, data: { label: 'Customer Inquiry', nodeType: 'input', inputType: 'text', userPrompt: 'My order #12345 hasn\'t arrived', status: 'idle' } },
      { id: '2', type: 'custom', position: { x: 300, y: 300 }, data: { label: 'Ticket Classifier', nodeType: 'agent', systemPrompt: 'Classify the customer inquiry into one of these categories: Order Issues, Technical Support, Billing, General Inquiry, Complaint. Also extract key details like order numbers, dates, etc.', status: 'idle' } },
      { id: '3', type: 'custom', position: { x: 550, y: 300 }, data: { label: 'Sentiment Analyzer', nodeType: 'agent', systemPrompt: 'Analyze the customer\'s sentiment and urgency level (Low/Medium/High/Critical). Consider tone, language, and context.', status: 'idle' } },
      { id: '4', type: 'custom', position: { x: 800, y: 150 }, data: { label: 'Urgent Path', nodeType: 'agent', systemPrompt: 'Generate an empathetic, immediate response for urgent issues. Acknowledge the problem, apologize if needed, and provide next steps.', status: 'idle' } },
      { id: '5', type: 'custom', position: { x: 800, y: 350 }, data: { label: 'Standard Response', nodeType: 'agent', systemPrompt: 'Generate a helpful, professional response. Address the inquiry directly with relevant information and solutions.', status: 'idle' } },
      { id: '6', type: 'custom', position: { x: 1050, y: 250 }, data: { label: 'Response Output', nodeType: 'output', status: 'idle' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e3-5', source: '3', target: '5', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e4-6', source: '4', target: '6', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e5-6', source: '5', target: '6', animated: true, style: { stroke: 'hsl(var(--primary))' } },
    ],
  },
  'content-creation-pipeline': {
    name: 'Content Creation Pipeline',
    description: 'End-to-end content creation from ideation to SEO optimization',
    category: 'marketing',
    nodes: [
      { id: '1', type: 'custom', position: { x: 50, y: 350 }, data: { label: 'Content Brief', nodeType: 'input', inputType: 'text', userPrompt: 'Write about sustainable fashion trends', status: 'idle' } },
      { id: '2', type: 'custom', position: { x: 250, y: 250 }, data: { label: 'Idea Generator', nodeType: 'agent', systemPrompt: 'Generate 5 unique angle ideas for the content. Each should have a catchy headline and brief description.', status: 'idle' } },
      { id: '3', type: 'custom', position: { x: 250, y: 450 }, data: { label: 'Keyword Researcher', nodeType: 'agent', systemPrompt: 'Suggest 10-15 relevant SEO keywords and phrases. Include primary keywords, secondary keywords, and long-tail variations.', status: 'idle' } },
      { id: '4', type: 'custom', position: { x: 500, y: 350 }, data: { label: 'Content Writer', nodeType: 'agent', systemPrompt: 'Write engaging, informative content based on the ideas and keywords. Use a conversational yet professional tone. Include: introduction, main points with subheadings, and conclusion. Aim for 800-1000 words.', status: 'idle' } },
      { id: '5', type: 'custom', position: { x: 750, y: 350 }, data: { label: 'Editor', nodeType: 'agent', systemPrompt: 'Edit the content for clarity, grammar, flow, and engagement. Improve sentence structure, fix errors, and enhance readability. Maintain the original voice.', status: 'idle' } },
      { id: '6', type: 'custom', position: { x: 1000, y: 250 }, data: { label: 'SEO Optimizer', nodeType: 'agent', systemPrompt: 'Optimize the content for SEO: 1) Suggest meta title and description, 2) Ensure keyword placement, 3) Recommend internal/external links, 4) Suggest alt text for potential images.', status: 'idle' } },
      { id: '7', type: 'custom', position: { x: 1000, y: 450 }, data: { label: 'Social Media Snippets', nodeType: 'agent', systemPrompt: 'Create 3 social media posts to promote this content: 1 for Twitter (concise), 1 for LinkedIn (professional), 1 for Instagram (engaging with emojis).', status: 'idle' } },
      { id: '8', type: 'custom', position: { x: 1250, y: 350 }, data: { label: 'Final Package', nodeType: 'output', status: 'idle' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e2-4', source: '2', target: '4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e5-6', source: '5', target: '6', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e5-7', source: '5', target: '7', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e6-8', source: '6', target: '8', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e7-8', source: '7', target: '8', animated: true, style: { stroke: 'hsl(var(--primary))' } },
    ],
  },
  'meeting-action-items': {
    name: 'Meeting Minutes & Action Items',
    description: 'Transform meeting transcripts into structured summaries and tasks',
    category: 'productivity',
    nodes: [
      { id: '1', type: 'custom', position: { x: 50, y: 300 }, data: { label: 'Meeting Transcript', nodeType: 'input', inputType: 'text', userPrompt: 'Paste meeting transcript here', status: 'idle' } },
      { id: '2', type: 'custom', position: { x: 300, y: 200 }, data: { label: 'Key Points Extractor', nodeType: 'agent', systemPrompt: 'Extract the key discussion points and decisions made in the meeting. Group by topic. Be concise.', status: 'idle' } },
      { id: '3', type: 'custom', position: { x: 300, y: 400 }, data: { label: 'Action Items Parser', nodeType: 'agent', systemPrompt: 'Identify all action items, tasks, and follow-ups mentioned. For each, extract: 1) Task description, 2) Assigned person (if mentioned), 3) Deadline (if mentioned), 4) Priority level.', status: 'idle' } },
      { id: '4', type: 'custom', position: { x: 550, y: 300 }, data: { label: 'Summary Writer', nodeType: 'agent', systemPrompt: 'Create a professional meeting summary with: 1) Meeting overview, 2) Key decisions, 3) Discussion highlights, 4) Next steps. Use bullet points and clear structure.', status: 'idle' } },
      { id: '5', type: 'custom', position: { x: 800, y: 200 }, data: { label: 'Email Draft', nodeType: 'agent', systemPrompt: 'Draft a follow-up email with the meeting summary and action items. Use professional tone. Include a table of action items if relevant.', status: 'idle' } },
      { id: '6', type: 'custom', position: { x: 800, y: 400 }, data: { label: 'Task List', nodeType: 'agent', systemPrompt: 'Format the action items as a task list in markdown format, ready to be imported into project management tools.', status: 'idle' } },
      { id: '7', type: 'custom', position: { x: 1050, y: 300 }, data: { label: 'Meeting Output', nodeType: 'output', status: 'idle' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e2-4', source: '2', target: '4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e4-6', source: '4', target: '6', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e5-7', source: '5', target: '7', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e6-7', source: '6', target: '7', animated: true, style: { stroke: 'hsl(var(--primary))' } },
    ],
  },
  'competitive-analysis': {
    name: 'Competitive Analysis Framework',
    description: 'Multi-dimensional competitor analysis and strategic insights',
    category: 'business',
    nodes: [
      { id: '1', type: 'custom', position: { x: 50, y: 350 }, data: { label: 'Competitors', nodeType: 'input', inputType: 'text', userPrompt: 'Company A, Company B, Company C', status: 'idle' } },
      { id: '2', type: 'custom', position: { x: 300, y: 150 }, data: { label: 'Product Analyzer', nodeType: 'agent', systemPrompt: 'Analyze each competitor\'s products and services. Identify: features, pricing, unique selling points, and gaps in their offerings.', status: 'idle' } },
      { id: '3', type: 'custom', position: { x: 300, y: 350 }, data: { label: 'Market Position', nodeType: 'agent', systemPrompt: 'Assess each competitor\'s market position: target audience, market share estimates, brand perception, and positioning strategy.', status: 'idle' } },
      { id: '4', type: 'custom', position: { x: 300, y: 550 }, data: { label: 'SWOT Analyzer', nodeType: 'agent', systemPrompt: 'Create a SWOT analysis (Strengths, Weaknesses, Opportunities, Threats) for each competitor.', status: 'idle' } },
      { id: '5', type: 'custom', position: { x: 600, y: 350 }, data: { label: 'Comparison Matrix', nodeType: 'agent', systemPrompt: 'Create a detailed comparison matrix showing how competitors stack up across key dimensions: pricing, features, customer support, technology, market presence.', status: 'idle' } },
      { id: '6', type: 'custom', position: { x: 850, y: 250 }, data: { label: 'Strategic Insights', nodeType: 'agent', systemPrompt: 'Based on the analysis, provide strategic insights: 1) Market opportunities, 2) Competitive advantages to leverage, 3) Areas for differentiation, 4) Potential threats to address.', status: 'idle' } },
      { id: '7', type: 'custom', position: { x: 850, y: 450 }, data: { label: 'Action Recommendations', nodeType: 'agent', systemPrompt: 'Provide 5-7 concrete action recommendations based on the competitive analysis. Prioritize by potential impact and feasibility.', status: 'idle' } },
      { id: '8', type: 'custom', position: { x: 1100, y: 350 }, data: { label: 'Analysis Report', nodeType: 'output', status: 'idle' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e1-4', source: '1', target: '4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e2-5', source: '2', target: '5', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e3-5', source: '3', target: '5', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e5-6', source: '5', target: '6', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e5-7', source: '5', target: '7', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e6-8', source: '6', target: '8', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e7-8', source: '7', target: '8', animated: true, style: { stroke: 'hsl(var(--primary))' } },
    ],
  },
  'product-description-generator': {
    name: 'Product Description Suite',
    description: 'Generate multiple product description variants for different channels',
    category: 'marketing',
    nodes: [
      { id: '1', type: 'custom', position: { x: 50, y: 350 }, data: { label: 'Product Details', nodeType: 'input', inputType: 'text', userPrompt: 'Product: Wireless Headphones\nFeatures: Noise canceling, 30hr battery, Bluetooth 5.0', status: 'idle' } },
      { id: '2', type: 'custom', position: { x: 300, y: 200 }, data: { label: 'Features to Benefits', nodeType: 'agent', systemPrompt: 'Transform product features into customer benefits. For each feature, explain "what it means for the customer" and why they should care.', status: 'idle' } },
      { id: '3', type: 'custom', position: { x: 300, y: 500 }, data: { label: 'Target Persona', nodeType: 'agent', systemPrompt: 'Identify the ideal customer persona for this product. Consider: demographics, pain points, goals, and buying motivations.', status: 'idle' } },
      { id: '4', type: 'custom', position: { x: 550, y: 100 }, data: { label: 'Short Description', nodeType: 'agent', systemPrompt: 'Write a compelling 2-3 sentence product description. Focus on the main value proposition. Ideal for product listings.', status: 'idle' } },
      { id: '5', type: 'custom', position: { x: 550, y: 250 }, data: { label: 'Long Description', nodeType: 'agent', systemPrompt: 'Write a detailed product description (200-300 words). Include: engaging intro, key features and benefits, use cases, and a call-to-action.', status: 'idle' } },
      { id: '6', type: 'custom', position: { x: 550, y: 400 }, data: { label: 'Ad Copy', nodeType: 'agent', systemPrompt: 'Create 3 ad copy variants for paid advertising: 1) Headline + short description, 2) Feature-focused, 3) Benefit-focused. Each under 125 characters.', status: 'idle' } },
      { id: '7', type: 'custom', position: { x: 550, y: 550 }, data: { label: 'Email Campaign', nodeType: 'agent', systemPrompt: 'Write an email campaign announcing this product. Include: catchy subject line, engaging body copy highlighting benefits, and strong CTA.', status: 'idle' } },
      { id: '8', type: 'custom', position: { x: 800, y: 350 }, data: { label: 'All Variants', nodeType: 'output', status: 'idle' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e2-4', source: '2', target: '4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e2-5', source: '2', target: '5', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e2-6', source: '2', target: '6', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e3-7', source: '3', target: '7', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e4-8', source: '4', target: '8', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e5-8', source: '5', target: '8', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e6-8', source: '6', target: '8', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e7-8', source: '7', target: '8', animated: true, style: { stroke: 'hsl(var(--primary))' } },
    ],
  },
  'code-documentation-generator': {
    name: 'Code Documentation Generator',
    description: 'Transform code into comprehensive documentation',
    category: 'developer-tools',
    nodes: [
      { id: '1', type: 'custom', position: { x: 50, y: 300 }, data: { label: 'Code Input', nodeType: 'input', inputType: 'text', userPrompt: 'Paste your code here', status: 'idle' } },
      { id: '2', type: 'custom', position: { x: 300, y: 200 }, data: { label: 'Code Analyzer', nodeType: 'agent', systemPrompt: 'Analyze the code structure. Identify: main purpose, key functions/classes, dependencies, and design patterns used.', status: 'idle' } },
      { id: '3', type: 'custom', position: { x: 300, y: 400 }, data: { label: 'API Extractor', nodeType: 'agent', systemPrompt: 'Extract all public APIs, functions, and methods. For each, identify: parameters, return types, and purpose.', status: 'idle' } },
      { id: '4', type: 'custom', position: { x: 550, y: 300 }, data: { label: 'Documentation Writer', nodeType: 'agent', systemPrompt: 'Write comprehensive documentation including: 1) Overview, 2) Installation/Setup, 3) API Reference, 4) Usage examples, 5) Best practices. Use markdown format.', status: 'idle' } },
      { id: '5', type: 'custom', position: { x: 800, y: 200 }, data: { label: 'README Generator', nodeType: 'agent', systemPrompt: 'Create a professional README.md with: project title, description, features, installation instructions, usage examples, and contributing guidelines.', status: 'idle' } },
      { id: '6', type: 'custom', position: { x: 800, y: 400 }, data: { label: 'Code Examples', nodeType: 'agent', systemPrompt: 'Generate 3-5 practical code examples showing common use cases. Include comments explaining each example.', status: 'idle' } },
      { id: '7', type: 'custom', position: { x: 1050, y: 300 }, data: { label: 'Documentation Package', nodeType: 'output', status: 'idle' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e2-4', source: '2', target: '4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e4-6', source: '4', target: '6', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e5-7', source: '5', target: '7', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e6-7', source: '6', target: '7', animated: true, style: { stroke: 'hsl(var(--primary))' } },
    ],
  },
  'resume-screener': {
    name: 'HR Resume Screening System',
    description: 'Automated resume analysis and candidate ranking',
    category: 'business',
    nodes: [
      { id: '1', type: 'custom', position: { x: 50, y: 200 }, data: { label: 'Job Requirements', nodeType: 'input', inputType: 'text', userPrompt: 'Required: 5+ years Python, ML experience, strong communication', status: 'idle' } },
      { id: '2', type: 'custom', position: { x: 50, y: 400 }, data: { label: 'Resume Text', nodeType: 'input', inputType: 'text', userPrompt: 'Paste candidate resume here', status: 'idle' } },
      { id: '3', type: 'custom', position: { x: 350, y: 300 }, data: { label: 'Resume Parser', nodeType: 'agent', systemPrompt: 'Extract structured information from the resume: contact info, education, work experience, skills, certifications, and achievements.', status: 'idle' } },
      { id: '4', type: 'custom', position: { x: 600, y: 200 }, data: { label: 'Skills Matcher', nodeType: 'agent', systemPrompt: 'Compare candidate skills against job requirements. Calculate match percentage for required and preferred skills.', status: 'idle' } },
      { id: '5', type: 'custom', position: { x: 600, y: 350 }, data: { label: 'Experience Evaluator', nodeType: 'agent', systemPrompt: 'Evaluate candidate\'s experience: years in field, relevant projects, career progression, and achievements. Assess fit for the role.', status: 'idle' } },
      { id: '6', type: 'custom', position: { x: 850, y: 275 }, data: { label: 'Scoring System', nodeType: 'agent', systemPrompt: 'Score the candidate on: 1) Technical skills match (40%), 2) Experience relevance (30%), 3) Education fit (15%), 4) Career trajectory (15%). Provide overall score out of 100.', status: 'idle' } },
      { id: '7', type: 'custom', position: { x: 1100, y: 200 }, data: { label: 'Recommendation', nodeType: 'agent', systemPrompt: 'Provide hiring recommendation: Strong Candidate / Moderate Fit / Not Recommended. Include: strengths, concerns, interview question suggestions.', status: 'idle' } },
      { id: '8', type: 'custom', position: { x: 1100, y: 400 }, data: { label: 'Red Flags Checker', nodeType: 'agent', systemPrompt: 'Check for potential red flags: employment gaps, job hopping, skill mismatches, or inconsistencies. Flag any concerns.', status: 'idle' } },
      { id: '9', type: 'custom', position: { x: 1350, y: 300 }, data: { label: 'Screening Report', nodeType: 'output', status: 'idle' } },
    ],
    edges: [
      { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e3-5', source: '3', target: '5', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e4-6', source: '4', target: '6', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e5-6', source: '5', target: '6', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e6-7', source: '6', target: '7', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e6-8', source: '6', target: '8', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e7-9', source: '7', target: '9', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e8-9', source: '8', target: '9', animated: true, style: { stroke: 'hsl(var(--primary))' } },
    ],
  },
  'legal-document-analyzer': {
    name: 'Legal Document Analyzer',
    description: 'Analyze contracts and legal documents for key terms and risks',
    category: 'business',
    nodes: [
      { id: '1', type: 'custom', position: { x: 50, y: 300 }, data: { label: 'Legal Document', nodeType: 'input', inputType: 'text', userPrompt: 'Paste contract or legal document', status: 'idle' } },
      { id: '2', type: 'custom', position: { x: 300, y: 150 }, data: { label: 'Clause Extractor', nodeType: 'agent', systemPrompt: 'Identify and extract key clauses: payment terms, termination conditions, liability limits, intellectual property rights, confidentiality, and dispute resolution.', status: 'idle' } },
      { id: '3', type: 'custom', position: { x: 300, y: 350 }, data: { label: 'Risk Assessor', nodeType: 'agent', systemPrompt: 'Identify potential risks and unfavorable terms. Categorize risks by severity: Critical, High, Medium, Low. Explain each risk clearly.', status: 'idle' } },
      { id: '4', type: 'custom', position: { x: 300, y: 550 }, data: { label: 'Obligation Tracker', nodeType: 'agent', systemPrompt: 'Extract all obligations and responsibilities for each party. Create a clear list of what each party must do, by when, and under what conditions.', status: 'idle' } },
      { id: '5', type: 'custom', position: { x: 600, y: 350 }, data: { label: 'Plain Language Summary', nodeType: 'agent', systemPrompt: 'Translate the legal document into plain language. Explain what the document means in simple terms, covering main points, obligations, and implications.', status: 'idle' } },
      { id: '6', type: 'custom', position: { x: 850, y: 250 }, data: { label: 'Red Flag Report', nodeType: 'agent', systemPrompt: 'Highlight critical red flags and concerning clauses that require immediate attention or legal review. Prioritize by urgency.', status: 'idle' } },
      { id: '7', type: 'custom', position: { x: 850, y: 450 }, data: { label: 'Negotiation Points', nodeType: 'agent', systemPrompt: 'Suggest key negotiation points and alternative clauses that could be proposed to improve terms. Focus on realistic, beneficial changes.', status: 'idle' } },
      { id: '8', type: 'custom', position: { x: 1100, y: 350 }, data: { label: 'Analysis Report', nodeType: 'output', status: 'idle' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e1-4', source: '1', target: '4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e2-5', source: '2', target: '5', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e3-5', source: '3', target: '5', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e5-6', source: '5', target: '6', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e5-7', source: '5', target: '7', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e6-8', source: '6', target: '8', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e7-8', source: '7', target: '8', animated: true, style: { stroke: 'hsl(var(--primary))' } },
    ],
  },
  'financial-report-analyzer': {
    name: 'Financial Report Analyzer',
    description: 'Analyze financial data and generate insights',
    category: 'analytics',
    nodes: [
      { id: '1', type: 'custom', position: { x: 50, y: 300 }, data: { label: 'Financial Data', nodeType: 'input', inputType: 'text', userPrompt: 'Q1: Revenue $500k, Expenses $350k\nQ2: Revenue $600k, Expenses $380k', status: 'idle' } },
      { id: '2', type: 'custom', position: { x: 300, y: 200 }, data: { label: 'Data Parser', nodeType: 'agent', systemPrompt: 'Parse and structure the financial data. Extract: revenue, expenses, profit, time periods, and any other financial metrics.', status: 'idle' } },
      { id: '3', type: 'custom', position: { x: 300, y: 400 }, data: { label: 'KPI Calculator', nodeType: 'agent', systemPrompt: 'Calculate key financial KPIs: profit margin, growth rate, burn rate, runway, and ROI. Show formulas and calculations.', status: 'idle' } },
      { id: '4', type: 'custom', position: { x: 550, y: 300 }, data: { label: 'Trend Analyzer', nodeType: 'agent', systemPrompt: 'Analyze trends over time. Identify: growth patterns, seasonal variations, concerning trends, and positive developments.', status: 'idle' } },
      { id: '5', type: 'custom', position: { x: 800, y: 200 }, data: { label: 'Insights Generator', nodeType: 'agent', systemPrompt: 'Generate strategic financial insights: strengths, weaknesses, opportunities for improvement, and financial health assessment.', status: 'idle' } },
      { id: '6', type: 'custom', position: { x: 800, y: 400 }, data: { label: 'Visualization Suggestions', nodeType: 'agent', systemPrompt: 'Suggest the best chart types and visualizations for this data: line graphs for trends, bar charts for comparisons, pie charts for breakdowns. Explain why each would be effective.', status: 'idle' } },
      { id: '7', type: 'custom', position: { x: 1050, y: 300 }, data: { label: 'Financial Report', nodeType: 'output', status: 'idle' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e2-4', source: '2', target: '4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e4-6', source: '4', target: '6', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e5-7', source: '5', target: '7', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e6-7', source: '6', target: '7', animated: true, style: { stroke: 'hsl(var(--primary))' } },
    ],
  },
  'transcript-summary-email': {
    name: 'Meeting Summary Email Generator',
    description: 'Upload Teams transcript → Generate summary & follow-up email',
    category: 'transcripts',
    nodes: [
      { id: '1', type: 'custom', position: { x: 50, y: 300 }, data: { label: 'Teams Transcript (VTT/DOCX)', nodeType: 'input', inputType: 'file', description: 'Upload Microsoft Teams transcript file', status: 'idle' } },
      { id: '2', type: 'custom', position: { x: 300, y: 200 }, data: { label: 'Key Points Extractor', nodeType: 'agent', systemPrompt: 'Extract the most important discussion points from this meeting transcript. Group by topic and be concise. Focus on decisions made and key takeaways.', status: 'idle' } },
      { id: '3', type: 'custom', position: { x: 300, y: 400 }, data: { label: 'Action Items Parser', nodeType: 'agent', systemPrompt: 'Identify all action items and tasks from the transcript. For each, extract: 1) Task description (clear and specific), 2) Person assigned (if mentioned), 3) Deadline (if mentioned), 4) Dependencies. Format as a numbered list.', status: 'idle' } },
      { id: '4', type: 'custom', position: { x: 550, y: 300 }, data: { label: 'Professional Email Writer', nodeType: 'agent', systemPrompt: 'Draft a professional follow-up email. Include: 1) Brief meeting recap, 2) Key decisions made, 3) Action items table with owners and deadlines, 4) Next meeting info if applicable. Use professional government communication style.', status: 'idle' } },
      { id: '5', type: 'custom', position: { x: 800, y: 300 }, data: { label: 'Email Output', nodeType: 'output', status: 'idle' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e2-4', source: '2', target: '4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: 'hsl(var(--primary))' } },
    ],
  },
  'weekly-meeting-digest': {
    name: 'Weekly Meeting Digest',
    description: 'Synthesize multiple meeting transcripts into one executive report',
    category: 'transcripts',
    nodes: [
      { id: '1', type: 'custom', position: { x: 50, y: 150 }, data: { label: 'Meeting 1', nodeType: 'input', inputType: 'file', description: 'Monday meeting', status: 'idle' } },
      { id: '2', type: 'custom', position: { x: 50, y: 300 }, data: { label: 'Meeting 2', nodeType: 'input', inputType: 'file', description: 'Wednesday meeting', status: 'idle' } },
      { id: '3', type: 'custom', position: { x: 50, y: 450 }, data: { label: 'Meeting 3', nodeType: 'input', inputType: 'file', description: 'Friday meeting', status: 'idle' } },
      { id: '4', type: 'custom', position: { x: 300, y: 300 }, data: { label: 'Theme Identifier', nodeType: 'agent', systemPrompt: 'Analyze all meetings and identify common themes, recurring topics, and cross-meeting connections. What issues came up multiple times? What progress was made over the week?', status: 'idle' } },
      { id: '5', type: 'custom', position: { x: 550, y: 200 }, data: { label: 'Progress Tracker', nodeType: 'agent', systemPrompt: 'Track what was accomplished this week. Identify: 1) Completed items, 2) In-progress items, 3) Blocked items, 4) New priorities that emerged.', status: 'idle' } },
      { id: '6', type: 'custom', position: { x: 550, y: 400 }, data: { label: 'Action Consolidator', nodeType: 'agent', systemPrompt: 'Consolidate all action items from all meetings. Remove duplicates, group by owner, and prioritize by urgency and importance.', status: 'idle' } },
      { id: '7', type: 'custom', position: { x: 800, y: 300 }, data: { label: 'Executive Summary Writer', nodeType: 'agent', systemPrompt: 'Create a comprehensive weekly report with: 1) Executive summary (3-4 sentences), 2) Key themes and discussions, 3) Progress made, 4) Consolidated action items, 5) Upcoming priorities. Use professional formatting suitable for leadership.', status: 'idle' } },
      { id: '8', type: 'custom', position: { x: 1050, y: 300 }, data: { label: 'Weekly Report', nodeType: 'output', status: 'idle' } },
    ],
    edges: [
      { id: 'e1-4', source: '1', target: '4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e2-4', source: '2', target: '4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e4-6', source: '4', target: '6', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e5-7', source: '5', target: '7', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e6-7', source: '6', target: '7', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e7-8', source: '7', target: '8', animated: true, style: { stroke: 'hsl(var(--primary))' } },
    ],
  },
  'compliance-meeting-review': {
    name: 'Compliance Meeting Analyzer',
    description: 'Review meetings for policy compliance and risk assessment',
    category: 'transcripts',
    nodes: [
      { id: '1', type: 'custom', position: { x: 50, y: 300 }, data: { label: 'Meeting Transcript', nodeType: 'input', inputType: 'file', description: 'Upload meeting transcript', status: 'idle' } },
      { id: '2', type: 'custom', position: { x: 300, y: 300 }, data: { label: 'Compliance Scanner', nodeType: 'agent', systemPrompt: 'Scan the meeting for compliance-related topics including: privacy discussions, data handling, policy changes, regulatory mentions, risk factors, and legal considerations. Flag any sensitive topics.', status: 'idle' } },
      { id: '3', type: 'custom', position: { x: 550, y: 200 }, data: { label: 'Policy Checker', nodeType: 'agent', systemPrompt: 'Check discussions against common government policies: FOIP (Freedom of Information and Privacy), procurement rules, conflict of interest, proper authorization levels. Identify any potential policy violations or gray areas.', status: 'idle' } },
      { id: '4', type: 'custom', position: { x: 550, y: 400 }, data: { label: 'Risk Assessor', nodeType: 'agent', systemPrompt: 'Assess potential risks discussed in the meeting: security risks, legal risks, reputational risks, operational risks. Rate each risk by severity and likelihood.', status: 'idle' } },
      { id: '5', type: 'custom', position: { x: 800, y: 300 }, data: { label: 'Compliance Report Generator', nodeType: 'agent', systemPrompt: 'Generate a compliance review report with: 1) Compliance summary, 2) Flagged items requiring attention, 3) Policy alignment assessment, 4) Risk summary, 5) Recommended follow-up actions. Use formal government audit style.', status: 'idle' } },
      { id: '6', type: 'custom', position: { x: 1050, y: 300 }, data: { label: 'Compliance Report', nodeType: 'output', status: 'idle' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e2-4', source: '2', target: '4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e3-5', source: '3', target: '5', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e5-6', source: '5', target: '6', animated: true, style: { stroke: 'hsl(var(--primary))' } },
    ],
  },
  'audio-transcription-analysis': {
    name: 'Audio Transcription & Analysis',
    description: 'Upload audio files, transcribe automatically, and generate insights',
    category: 'transcripts',
    nodes: [
      { id: '1', type: 'custom', position: { x: 50, y: 300 }, data: { label: 'Audio Input', nodeType: 'input', inputType: 'file', description: 'Upload audio files (e.g., meeting recordings, podcasts)', status: 'idle' } },
      { id: '2', type: 'custom', position: { x: 300, y: 200 }, data: { label: 'Technical Requirements Generator', nodeType: 'agent', systemPrompt: 'Develops a comprehensive set of technical requirements based on meeting discussions and decisions. Analyzes the transcript for feature requests, technical constraints, dependencies, and system requirements.', status: 'idle' } },
      { id: '3', type: 'custom', position: { x: 300, y: 400 }, data: { label: 'Business Requirements Generator', nodeType: 'agent', systemPrompt: 'Analyzes the transcript and generates formal business requirements. Extracts business objectives, stakeholder needs, success criteria, and functional requirements in a structured format.', status: 'idle' } },
      { id: '4', type: 'custom', position: { x: 550, y: 300 }, data: { label: 'Engagement Script Creator', nodeType: 'agent', systemPrompt: 'Crafts an engaging script for stakeholder presentations based on requirements. Creates compelling narratives that communicate technical concepts to non-technical audiences with clear benefits and implementation plans.', status: 'idle' } },
      { id: '5', type: 'custom', position: { x: 800, y: 300 }, data: { label: 'Document Consolidator', nodeType: 'agent', systemPrompt: 'Combines all generated requirements, technical specs, and engagement materials into a comprehensive project document. Ensures consistency, removes redundancies, and creates a professional final deliverable.', status: 'idle' } },
      { id: '6', type: 'custom', position: { x: 1050, y: 300 }, data: { label: 'Consolidated Document', nodeType: 'output', status: 'idle' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e2-4', source: '2', target: '4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e5-6', source: '5', target: '6', animated: true, style: { stroke: 'hsl(var(--primary))' } },
    ],
  },
};

const Canvas = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { agents: savedAgents } = useAgents();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [globalInput, setGlobalInput] = useState("");
  const [workflowName, setWorkflowName] = useState("Untitled Workflow");
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [isFunctionSelectorOpen, setIsFunctionSelectorOpen] = useState(false);
  const [isAgentSelectorOpen, setIsAgentSelectorOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<{
    systemPrompt: string;
    userPrompt: string;
    config: Record<string, any>;
  } | null>(null);

  // Handle imported workflow from chat
  useEffect(() => {
    if (location.state?.importedWorkflow) {
      const imported = location.state.importedWorkflow;
      if (imported.nodes && imported.edges) {
        // Transform AI-generated nodes to React Flow format
        const transformedNodes = imported.nodes.map((node: any) => {
          const nodeId = node.id;
          // Create the node object that callbacks will reference
          const newNode: Node = {
            id: nodeId,
            type: 'custom',
            position: node.position || { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
            data: {
              label: node.name || node.label || 'Node',
              nodeType: node.type || node.nodeType || 'agent',
              status: 'idle',
              description: node.description || '',
              systemPrompt: node.systemPrompt || '',
              userPrompt: node.userPrompt || '',
              files: [],
              config: node.config || {},
              onEdit: () => {
                setSelectedNode(newNode);
                setIsRightSidebarOpen(true);
              },
              onRun: () => handleRunNode(nodeId),
            },
          };
          return newNode;
        });

        // Transform edges to React Flow format
        const transformedEdges = imported.edges.map((edge: any) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          animated: true,
          style: { stroke: 'hsl(var(--primary))' }
        }));

        setNodes(transformedNodes);
        setEdges(transformedEdges);
        setWorkflowName(imported.name || "AI Generated Workflow");
        toast.success("Workflow loaded from chat suggestion");
        // Clear the state
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || (isDark ? 'dark' : 'light');
    
    if (initialTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate("/auth");
      }
    });
    
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (selectedNode) {
      const node = nodes.find(n => n.id === selectedNode.id);
      if (node && node.data) {
        const data = node.data;
        setEditingNode({
          systemPrompt: (data as any).systemPrompt || '',
          userPrompt: (data as any).userPrompt || '',
          config: (data as any).config || {},
        });
      }
    } else {
      setEditingNode(null);
    }
  }, [selectedNode, nodes]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: 'hsl(var(--primary))' } }, eds)),
    [setEdges]
  );

  const addNode = (type: 'input' | 'agent' | 'output' | 'join' | 'transform' | 'function' | 'tool', template: any) => {
    const id = `${type}-${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'custom',
      position: { 
        x: Math.random() * 300 + 100, 
        y: Math.random() * 300 + 100 
      },
      data: {
        label: template.name,
        nodeType: type,
        status: 'idle',
        description: template.description,
        systemPrompt: template.systemPrompt || '',
        userPrompt: '',
        files: [],
        config: template.config || {},
        functionType: template.functionType,
        toolType: template.toolType,
        onEdit: () => {
          setSelectedNode(newNode);
          setIsRightSidebarOpen(true);
        },
        onRun: () => handleRunNode(id),
      },
    };
    
    setNodes((nds) => [...nds, newNode]);
    toast.success(`${template.name} added`);
  };

  const handleSelectFunction = (functionDef: FunctionDefinition) => {
    addNode('function', {
      name: functionDef.name,
      description: functionDef.description,
      functionType: functionDef.id,
      config: {},
    });
    setIsFunctionSelectorOpen(false);
  };

  const handleSelectAgent = (agent: any) => {
    if (agent.type === 'tool') {
      // It's a tool definition
      addNode('tool', {
        name: agent.name,
        description: agent.description,
        toolType: agent.id,
        config: {},
      });
    } else {
      // It's an agent
      addNode('agent', {
        name: agent.name,
        description: agent.description || 'AI Agent',
        systemPrompt: agent.system_prompt || agent.systemPrompt || '',
      });
    }
    setIsAgentSelectorOpen(false);
  };

  const handleRunNode = async (nodeId: string, outputsMap?: Record<string, string>) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    setNodes(nds => nds.map(n => 
      n.id === nodeId 
        ? { ...n, data: { ...n.data, status: 'running' } }
        : n
    ));

    try {
      const nodeData = node.data as any;
      const incomingEdges = edges.filter(e => e.target === nodeId);
      let input = globalInput;
      
      // Prefer freshest outputs during a workflow run
      const getOutput = (sourceId: string) => {
        if (outputsMap && outputsMap[sourceId] !== undefined) return outputsMap[sourceId];
        const src = nodes.find(n => n.id === sourceId);
        return (src?.data as any)?.output ?? '';
      };
      
      if (incomingEdges.length > 0) {
        const firstSource = incomingEdges[0].source;
        const fromSource = getOutput(firstSource);
        if (fromSource) input = fromSource;
      }
      
      let output = '';
      
      switch (nodeData.nodeType) {
        case 'input':
          output = nodeData.userPrompt || globalInput || 'No input provided';
          break;
          
        case 'agent':
          const { data, error } = await supabase.functions.invoke('run-agent', {
            body: {
              systemPrompt: nodeData.systemPrompt || '',
              userPrompt: input || nodeData.userPrompt || '',
              tools: []
            }
          });
          if (error) throw error;
          output = data.output;
          break;
          
        case 'transform':
          const operation = nodeData.config?.operation || 'lowercase';
          if (operation === 'lowercase') {
            output = input.toLowerCase();
          } else if (operation === 'uppercase') {
            output = input.toUpperCase();
          } else {
            output = input;
          }
          break;
          
        case 'join':
          const joinInputs = incomingEdges
            .map(edge => getOutput(edge.source) || '')
            .filter(Boolean);
          output = joinInputs.join('\n\n---\n\n');
          break;
          
        case 'output':
          output = input;
          break;
          
        default:
          output = input;
      }
      
      // Update in-memory outputs map for this run before updating UI state
      if (outputsMap) {
        outputsMap[nodeId] = output;
      }

      setNodes(nds => nds.map(n => 
        n.id === nodeId 
          ? { ...n, data: { ...n.data, status: 'success', output } }
          : n
      ));
      
      toast.success(`${nodeData.label} completed`);
    } catch (error) {
      console.error('Node execution error:', error);
      setNodes(nds => nds.map(n => 
        n.id === nodeId 
          ? { ...n, data: { ...n.data, status: 'error' } }
          : n
      ));
      toast.error(`Node execution failed`);
    }
  };

  const handleRunWorkflow = async () => {
    toast.success("Executing workflow...");
    
    try {
      // Build execution order based on dependencies
      const executed = new Set<string>();
      const executing = new Set<string>();
      const outputs: Record<string, string> = {};
      
      const canExecute = (nodeId: string): boolean => {
        // Find all incoming edges to this node
        const incomingEdges = edges.filter(e => e.target === nodeId);
        // Node can execute if all source nodes have been executed
        return incomingEdges.every(edge => executed.has(edge.source));
      };
      
      const executeNode = async (nodeId: string) => {
        if (executed.has(nodeId) || executing.has(nodeId)) return;
        executing.add(nodeId);
        await handleRunNode(nodeId, outputs);
        executing.delete(nodeId);
        executed.add(nodeId);
      };
      
      // Keep executing until all nodes are done
      while (executed.size < nodes.length) {
        const readyNodes = nodes
          .filter(n => !executed.has(n.id) && !executing.has(n.id) && canExecute(n.id));
        
        if (readyNodes.length === 0) {
          // No more nodes can execute - check if we're done or stuck
          if (executed.size < nodes.length) {
            throw new Error("Workflow has circular dependencies or disconnected nodes");
          }
          break;
        }
        
        // Execute all ready nodes in parallel
        await Promise.all(readyNodes.map(node => executeNode(node.id)));
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      toast.success("Workflow complete");
    } catch (error) {
      console.error('Workflow error:', error);
      toast.error(error instanceof Error ? error.message : "Workflow failed");
    }
  };

  const updateNodeData = (updates: Partial<CustomNodeData>) => {
    if (!selectedNode) return;
    
    setNodes(nds => nds.map(n => {
      if (n.id === selectedNode.id) {
        const currentData = n.data;
        return {
          ...n,
          data: {
            ...currentData,
            ...updates,
            onEdit: currentData?.onEdit,
            onRun: currentData?.onRun,
          }
        };
      }
      return n;
    }));
  };

  const handleSave = () => {
    const workflow = { 
      name: workflowName,
      nodes, 
      edges,
      globalInput 
    };
    localStorage.setItem('canvas-workflow', JSON.stringify(workflow));
    toast.success("Workflow saved");
  };

  const handleLoad = () => {
    const saved = localStorage.getItem('canvas-workflow');
    if (saved) {
      const workflow = JSON.parse(saved);
      setWorkflowName(workflow.name || "Untitled Workflow");
      
      // Restore nodes with callbacks
      const restoredNodes = (workflow.nodes || []).map((node: any) => ({
        ...node,
        data: {
          ...node.data,
          onEdit: () => {
            setSelectedNode(node);
            setIsRightSidebarOpen(true);
          },
          onRun: () => handleRunNode(node.id),
        }
      }));
      
      setNodes(restoredNodes);
      setEdges(workflow.edges || []);
      setGlobalInput(workflow.globalInput || "");
      toast.success("Workflow loaded");
    } else {
      toast.error("No saved workflow");
    }
  };

  // Auto-load workflow from URL parameter (when coming from marketplace)
  useEffect(() => {
    const workflowId = searchParams.get('workflowId');
    if (workflowId) {
      const loadFromMarketplace = async () => {
        try {
          const { data, error } = await supabase
            .from('workflows')
            .select('*')
            .eq('id', workflowId)
            .single();

          if (error) throw error;

          if (data && data.workflow_data) {
            const workflowData = data.workflow_data as any;
            
            // Check if this is a Stage workflow (has stages/connections) or Canvas workflow (has nodes/edges)
            const isStageFormat = workflowData.stages || (workflowData.workflow && workflowData.workflow.stages);
            const isCanvasFormat = workflowData.nodes && workflowData.edges;
            
            if (isStageFormat && !isCanvasFormat) {
              // This workflow is in Stage format, redirect to Stage page
              toast.info('This workflow is designed for Stage view');
              navigate(`/stage?workflowId=${workflowId}`, { replace: true });
              return;
            }
            
            // Load Canvas format workflow
            setWorkflowName(data.name);
            
            // Restore nodes with callbacks
            const restoredNodes = (workflowData.nodes || []).map((node: any) => ({
              ...node,
              data: {
                ...node.data,
                onEdit: () => {
                  const nodeRef = node;
                  setSelectedNode(nodeRef);
                  setIsRightSidebarOpen(true);
                },
                onRun: () => handleRunNode(node.id),
              }
            }));
            
            setNodes(restoredNodes);
            setEdges(workflowData.edges || []);
            setGlobalInput(workflowData.globalInput || "");
            toast.success(`Loaded workflow: ${data.name}`);
            
            // Clear the URL parameter after loading
            setSearchParams({});
          }
        } catch (error) {
          console.error('Error loading workflow from marketplace:', error);
          toast.error('Failed to load workflow');
          setSearchParams({});
        }
      };

      loadFromMarketplace();
    }
  }, [searchParams, setSearchParams]);

  const handleClear = () => {
    if (confirm("Clear canvas?")) {
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
      setGlobalInput("");
      setWorkflowName("Untitled Workflow");
      toast.success("Canvas cleared");
    }
  };

  const loadTemplate = (templateKey: string) => {
    const template = TEMPLATES[templateKey as keyof typeof TEMPLATES];
    if (template) {
      const restoredNodes = template.nodes.map((node: any) => ({
        ...node,
        data: {
          ...node.data,
          onEdit: () => {
            setSelectedNode(node as Node);
            setIsRightSidebarOpen(true);
          },
          onRun: () => handleRunNode(node.id),
        }
      }));
      setNodes(restoredNodes);
      setEdges(template.edges);
      setIsTemplatesOpen(false);
      setWorkflowName(template.name);
      toast.success(`Template "${template.name}" loaded`);
    }
  };

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setIsRightSidebarOpen(true);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader />
      
      {/* Toolbar */}
      <header className="min-h-16 border-b bg-card px-3 sm:px-6 py-2 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="w-full sm:w-52 h-9 font-medium"
              placeholder="Untitled Workflow"
            />
            <div className="hidden sm:block w-px h-7 bg-border" />
            <div className="flex flex-wrap gap-1.5 sm:gap-2 flex-1">
              <Button variant="outline" size="sm" onClick={() => setIsTemplatesOpen(true)} className="h-8 text-xs">
                <Layout className="h-3.5 w-3.5 sm:mr-2" />
                <span className="hidden sm:inline">Templates</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleLoad} className="h-8 text-xs">
                <Upload className="h-3.5 w-3.5 sm:mr-2" />
                <span className="hidden sm:inline">Load</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleSave} className="h-8 text-xs">
                <Save className="h-3.5 w-3.5 sm:mr-2" />
                <span className="hidden sm:inline">Save</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/workflow-marketplace', { state: { from: '/canvas' } })} className="h-8 text-xs">
                <Store className="h-3.5 w-3.5 sm:mr-2" />
                <span className="hidden sm:inline">Marketplace</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleClear} className="h-8 text-xs">
                <Trash2 className="h-3.5 w-3.5 sm:mr-2" />
                <span className="hidden sm:inline">Clear</span>
              </Button>
            </div>
          </div>
          <Button
            size="sm"
            className="gap-2 sm:ml-auto h-8 w-full sm:w-auto"
            onClick={handleRunWorkflow}
            disabled={nodes.length === 0}
          >
            <Play className="h-3.5 w-3.5" />
            Run Workflow
          </Button>
        </div>
      </header>
      
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar - Node Library */}
        <div 
          className={`transition-all duration-300 ${isLeftSidebarOpen ? 'w-72' : 'w-0'} overflow-hidden`}
        >
          <Card className="h-full m-4 mr-0 flex flex-col shadow-md">
            <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base">Add Nodes</h3>
                <p className="text-xs text-muted-foreground mt-1">Click to add to canvas</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setIsLeftSidebarOpen(false)}
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>

          <ScrollArea className="flex-1">
            <div className="p-4">
              <Accordion type="single" collapsible defaultValue="input" className="w-full">
                <AccordionItem value="input" className="border-none">
                  <AccordionTrigger className="text-sm py-3 hover:no-underline">
                    <div className="flex items-center gap-2.5">
                      <FileInput className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Input Nodes</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-1.5 pt-2 pb-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-9 hover:bg-muted"
                      onClick={() => addNode('input', { name: 'Text Input', description: 'Enter text data', config: { inputType: 'text' } })}
                    >
                      <Plus className="h-4 w-4 mr-2.5" />
                      <span className="text-sm">Text Input</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-9 hover:bg-muted"
                      onClick={() => addNode('input', { name: 'File Input', description: 'Upload files', config: { inputType: 'file' } })}
                    >
                      <Plus className="h-4 w-4 mr-2.5" />
                      <span className="text-sm">File Input</span>
                    </Button>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="agents" className="border-none">
                  <AccordionTrigger className="text-sm py-3 hover:no-underline">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="font-medium">AI Agents</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-1.5 pt-2 pb-3">
                    {savedAgents.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-2 py-3">No agents available. Create one first.</p>
                    ) : (
                      savedAgents.slice(0, 8).map((agent) => (
                        <Button
                          key={agent.id}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start h-9 hover:bg-muted"
                          onClick={() => addNode('agent', { 
                            name: agent.name, 
                            description: agent.description || 'AI Agent',
                            systemPrompt: agent.system_prompt 
                          })}
                        >
                          <Plus className="h-4 w-4 mr-2.5" />
                          <span className="text-sm truncate">{agent.name}</span>
                        </Button>
                      ))
                    )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="processing" className="border-none">
                  <AccordionTrigger className="text-sm py-3 hover:no-underline">
                    <div className="flex items-center gap-2.5">
                      <Repeat className="h-4 w-4 text-orange-500" />
                      <span className="font-medium">Processing</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-1.5 pt-2 pb-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-9 hover:bg-muted"
                      onClick={() => addNode('transform', { name: 'Transform', description: 'Transform text data', config: { operation: 'lowercase' } })}
                    >
                      <Plus className="h-4 w-4 mr-2.5" />
                      <span className="text-sm">Transform</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-9 hover:bg-muted"
                      onClick={() => addNode('join', { name: 'Join', description: 'Combine multiple inputs' })}
                    >
                      <Plus className="h-4 w-4 mr-2.5" />
                      <span className="text-sm">Join</span>
                    </Button>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="output" className="border-none">
                  <AccordionTrigger className="text-sm py-3 hover:no-underline">
                    <div className="flex items-center gap-2.5">
                      <FileOutput className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Output Nodes</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-1.5 pt-2 pb-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-9 hover:bg-muted"
                      onClick={() => addNode('output', { name: 'Text Output', description: 'Display results', config: { format: 'text' } })}
                    >
                      <Plus className="h-4 w-4 mr-2.5" />
                      <span className="text-sm">Text Output</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-9 hover:bg-muted"
                      onClick={() => addNode('output', { name: 'JSON Output', description: 'Display as JSON', config: { format: 'json' } })}
                    >
                      <Plus className="h-4 w-4 mr-2.5" />
                      <span className="text-sm">JSON Output</span>
                    </Button>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="functions" className="border-none">
                  <AccordionTrigger className="text-sm py-3 hover:no-underline">
                    <div className="flex items-center gap-2.5">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">Functions</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-1.5 pt-2 pb-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-9 hover:bg-muted"
                      onClick={() => setIsFunctionSelectorOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2.5" />
                      <span className="text-sm">Browse All Functions</span>
                    </Button>
                    <p className="text-xs text-muted-foreground px-2 mt-1">
                      Search, Web Scrape, Export, String Operations, and more
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="tools" className="border-none">
                  <AccordionTrigger className="text-sm py-3 hover:no-underline">
                    <div className="flex items-center gap-2.5">
                      <Settings className="h-4 w-4 text-indigo-500" />
                      <span className="font-medium">Tools</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-1.5 pt-2 pb-3">
                    {toolDefinitions.slice(0, 5).map((tool) => (
                      <Button
                        key={tool.id}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-9 hover:bg-muted"
                        onClick={() => addNode('tool', {
                          name: tool.name,
                          description: tool.description,
                          toolType: tool.id,
                          config: {},
                        })}
                      >
                        <Plus className="h-4 w-4 mr-2.5" />
                        <span className="text-sm">{tool.name}</span>
                      </Button>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-9 hover:bg-muted font-medium"
                      onClick={() => setIsAgentSelectorOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2.5" />
                      <span className="text-sm">Browse All Tools...</span>
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="mt-5 pt-5 border-t">
                <Label className="text-sm font-medium mb-2.5 block">Global Input</Label>
                <Textarea
                  value={globalInput}
                  onChange={(e) => setGlobalInput(e.target.value)}
                  placeholder="Enter initial workflow input (optional)..."
                  className="min-h-[100px] text-sm"
                />
                <p className="text-xs text-muted-foreground mt-2">This input will be available to all trigger nodes</p>
              </div>
            </div>
          </ScrollArea>
          </Card>
        </div>

        {/* Left Sidebar Toggle Button */}
        {!isLeftSidebarOpen && (
          <Button
            variant="outline"
            size="sm"
            className="absolute left-4 top-4 z-10 shadow-md"
            onClick={() => setIsLeftSidebarOpen(true)}
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        )}

        {/* Canvas */}
        <div className="flex-1 relative bg-muted/5">
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="text-center space-y-3 p-8 bg-card/80 backdrop-blur-sm rounded-lg border shadow-sm max-w-md">
                <Sparkles className="h-12 w-12 mx-auto text-primary/50" />
                <h3 className="text-lg font-semibold">Start Building Your Workflow</h3>
                <p className="text-sm text-muted-foreground">
                  Add nodes from the sidebar to create your automated workflow. Connect them to define the execution flow.
                </p>
              </div>
            </div>
          )}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-background"
          >
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={16} 
              size={1}
              className="bg-muted/10"
            />
            <Controls className="bg-card border shadow-md rounded-lg" />
            <MiniMap 
              className="bg-card border shadow-md rounded-lg"
              nodeColor={(node) => {
              const data = node.data as CustomNodeData;
                switch (data.nodeType) {
                  case 'input': return '#3b82f6';
                  case 'agent': return 'hsl(var(--primary))';
                  case 'output': return '#22c55e';
                  case 'join': return '#a855f7';
                  case 'transform': return '#f97316';
                  default: return 'hsl(var(--muted))';
                }
              }}
            />
          </ReactFlow>
        </div>

        {/* Right Sidebar Toggle Button */}
        {!isRightSidebarOpen && selectedNode && (
          <Button
            variant="outline"
            size="sm"
            className="absolute right-4 top-4 z-10 shadow-md"
            onClick={() => setIsRightSidebarOpen(true)}
          >
            <PanelRightOpen className="h-4 w-4" />
          </Button>
        )}

        {/* Right Sidebar - Properties Panel */}
        <div 
          className={`transition-all duration-300 ${selectedNode && isRightSidebarOpen ? 'w-96' : 'w-0'} overflow-hidden`}
        >
          {selectedNode && (
            <Card className="h-full m-4 ml-0 flex flex-col shadow-md">
              <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-base">Node Configuration</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Configure selected node</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setIsRightSidebarOpen(false)}
                  >
                    <PanelRightClose className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setSelectedNode(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Node Name</Label>
                  <Input
                    value={selectedNode.data.label}
                    onChange={(e) => updateNodeData({ label: e.target.value })}
                    className="h-9"
                    placeholder="Enter node name"
                  />
                </div>

                {selectedNode.data.nodeType === 'input' && editingNode && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Input Data</Label>
                      <Textarea
                        value={editingNode.userPrompt}
                        onChange={(e) => {
                          setEditingNode({ ...editingNode, userPrompt: e.target.value });
                          updateNodeData({ userPrompt: e.target.value } as any);
                        }}
                        placeholder="Enter your input data here..."
                        className="min-h-[150px] text-sm font-mono"
                      />
                      <p className="text-xs text-muted-foreground">This data will be passed to connected nodes</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Or Upload File</Label>
                      <Input
                        type="file"
                        accept=".vtt,.docx,.txt,.json,.mp3,.wav,.webm,.m4a,.ogg,.flac"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          try {
                            let content = "";
                            const extension = file.name.toLowerCase().split('.').pop();
                            const audioFormats = ['mp3', 'wav', 'webm', 'm4a', 'ogg', 'flac'];
                            
                            if (audioFormats.includes(extension || '')) {
                              // Handle audio files with transcription
                              toast.success(`Transcribing ${file.name}...`);

                              // Convert audio file to base64
                              const reader = new FileReader();
                              const base64Audio = await new Promise<string>((resolve, reject) => {
                                reader.onload = () => {
                                  const result = reader.result as string;
                                  const base64 = result.split(',')[1];
                                  resolve(base64);
                                };
                                reader.onerror = reject;
                                reader.readAsDataURL(file);
                              });

                              // Get session for auth
                              const { data: { session } } = await supabase.auth.getSession();
                              if (!session) throw new Error('Not authenticated');

                              // Call speech-to-text edge function
                              const response = await fetch(
                                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/speech-to-text`,
                                {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${session.access_token}`,
                                  },
                                  body: JSON.stringify({
                                    audio: base64Audio,
                                    model: 'scribe_v1',
                                  }),
                                }
                              );

                              if (!response.ok) {
                                const errorText = await response.text();
                                throw new Error(`Transcription failed: ${errorText}`);
                              }

                              const result = await response.json();
                              content = result.text || '';
                              toast.success(`Audio transcribed successfully`);
                            } else if (file.name.endsWith(".vtt")) {
                              const text = await file.text();
                              const { parseVTT } = await import("@/utils/parseVTT");
                              const parsed = parseVTT(text);
                              content = parsed.fullText;
                            } else if (file.name.endsWith(".docx")) {
                              const mammoth = await import("mammoth");
                              const arrayBuffer = await file.arrayBuffer();
                              const result = await mammoth.extractRawText({ arrayBuffer });
                              content = result.value;
                            } else if (file.name.endsWith(".txt") || file.name.endsWith(".json")) {
                              content = await file.text();
                            }

                            setEditingNode({ ...editingNode, userPrompt: content });
                            updateNodeData({ userPrompt: content } as any);
                            if (!audioFormats.includes(extension || '')) {
                              toast.success(`File "${file.name}" loaded successfully`);
                            }
                          } catch (error) {
                            console.error('File processing error:', error);
                            toast.error(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
                          }
                        }}
                        className="text-sm"
                      />
                      <p className="text-xs text-muted-foreground">Supports VTT, DOCX, TXT, JSON, and audio files (MP3, WAV, WebM, M4A, OGG, FLAC)</p>
                    </div>
                  </div>
                )}

                {selectedNode.data.nodeType === 'agent' && editingNode && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">System Prompt</Label>
                      <Textarea
                        value={editingNode.systemPrompt}
                        onChange={(e) => {
                          setEditingNode({ ...editingNode, systemPrompt: e.target.value });
                          updateNodeData({ systemPrompt: e.target.value } as any);
                        }}
                        placeholder="Define the AI agent's role and behavior..."
                        className="min-h-[120px] text-sm"
                      />
                      <p className="text-xs text-muted-foreground">Instructions for how the AI should behave</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">User Prompt (Optional)</Label>
                      <Textarea
                        value={editingNode.userPrompt}
                        onChange={(e) => {
                          setEditingNode({ ...editingNode, userPrompt: e.target.value });
                          updateNodeData({ userPrompt: e.target.value } as any);
                        }}
                        placeholder="Leave empty to use input from connected nodes..."
                        className="min-h-[100px] text-sm"
                      />
                      <p className="text-xs text-muted-foreground">Custom input or leave blank to use connected node output</p>
                    </div>
                  </>
                )}

                {selectedNode.data.nodeType === 'transform' && editingNode && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Transform Operation</Label>
                    <select
                      value={editingNode.config?.operation || 'lowercase'}
                      onChange={(e) => {
                        const newConfig = { ...editingNode.config, operation: e.target.value };
                        setEditingNode({ ...editingNode, config: newConfig });
                        updateNodeData({ config: newConfig } as any);
                      }}
                      className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="lowercase">Convert to Lowercase</option>
                      <option value="uppercase">Convert to Uppercase</option>
                    </select>
                    <p className="text-xs text-muted-foreground">Select how to transform the input text</p>
                  </div>
                )}

                {selectedNode.data.nodeType === 'output' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Export Options</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => {
                        if (selectedNode.data.output) {
                          const blob = new Blob([selectedNode.data.output], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${selectedNode.data.label}.txt`;
                          a.click();
                          URL.revokeObjectURL(url);
                          toast.success('Output exported');
                        }
                      }}
                      disabled={!selectedNode.data.output}
                    >
                      <Download className="h-4 w-4" />
                      Export as Text
                    </Button>
                  </div>
                )}

                {selectedNode.data.output && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Latest Output</Label>
                    <div className="p-3 bg-muted rounded-md text-sm max-h-[200px] overflow-y-auto font-mono border">
                      {selectedNode.data.output}
                    </div>
                  </div>
                )}

                <div className="pt-3 space-y-2.5 border-t">
                  <Button 
                    size="default" 
                    className="w-full gap-2"
                    onClick={() => handleRunNode(selectedNode.id)}
                    disabled={selectedNode.data.status === 'running'}
                  >
                    {selectedNode.data.status === 'running' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Test This Node
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    variant="destructive" 
                    size="default" 
                    className="w-full gap-2"
                    onClick={() => {
                      setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
                      setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
                      setSelectedNode(null);
                      toast.success("Node deleted");
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Node
                  </Button>
                </div>
              </div>
            </ScrollArea>
            </Card>
          )}
        </div>
      </div>

      {/* Templates Dialog */}
      <Dialog open={isTemplatesOpen} onOpenChange={setIsTemplatesOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Workflow Templates</DialogTitle>
            <p className="text-sm text-muted-foreground">Choose a template to get started quickly</p>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {Object.entries(TEMPLATES).map(([key, template]) => (
              <Card 
                key={key} 
                className="cursor-pointer hover:border-primary transition-all hover:shadow-md" 
                onClick={() => loadTemplate(key)}
              >
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layout className="h-4 w-4 text-primary" />
                    {template.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      {template.nodes.length} nodes
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      {template.edges.length} connections
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Function Selector Dialog */}
      <FunctionSelector
        open={isFunctionSelectorOpen}
        onOpenChange={setIsFunctionSelectorOpen}
        onSelectFunction={handleSelectFunction}
      />

      {/* Agent Selector Dialog */}
      <AgentSelectorDialog
        open={isAgentSelectorOpen}
        onOpenChange={setIsAgentSelectorOpen}
        onSelectAgent={handleSelectAgent}
      />
    </div>
  );
};

export default Canvas;
