# Albert AI Assistant - Technical Documentation

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Frontend Components](#frontend-components)
3. [Backend Services](#backend-services)
4. [Database Schema](#database-schema)
5. [API Reference](#api-reference)
6. [Hooks Reference](#hooks-reference)
7. [Utility Functions](#utility-functions)
8. [Design System](#design-system)
9. [Development Workflow](#development-workflow)
10. [Deployment Guide](#deployment-guide)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (React SPA)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Chat   │  │ Workflow │  │  Agents  │  │  Image   │   │
│  │Interface │  │ Builders │  │ Manager  │  │ Analysis │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   Supabase Backend                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Auth   │  │PostgreSQL│  │  Storage │  │   Edge   │   │
│  │          │  │ Database │  │  Bucket  │  │Functions │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │ API Calls
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  External AI Services                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │  Google  │  │ElevenLabs│  │  Lovable │                 │
│  │  Gemini  │  │   TTS    │  │    AI    │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack Details

#### Frontend Stack
- **React 18.3.1**: UI framework with hooks
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **TanStack Query**: Server state management
- **React Router DOM**: Client-side routing
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Component library (Radix UI + Tailwind)
- **ReactFlow**: Workflow visualization
- **Recharts**: Data visualization

#### Backend Stack
- **Supabase**: Backend-as-a-Service
  - PostgreSQL database
  - Row-Level Security (RLS)
  - Authentication
  - File storage
  - Edge Functions (Deno runtime)

#### External Services
- **Google Gemini API**: Conversational AI
- **ElevenLabs API**: Text-to-Speech
- **Google Speech-to-Text**: Speech recognition
- **Lovable AI Gateway**: Multi-model AI access

---

## Frontend Components

### Page Components (`src/pages/`)

#### `Index.tsx` - Root Handler
- Entry point for the application
- Handles authentication-based routing
- Redirects to `/chat` if authenticated, `/landing` if not

#### `Landing.tsx` - Public Landing Page
- Marketing page for unauthenticated users
- Feature showcase
- Call-to-action buttons
- Theme toggle

#### `Auth.tsx` - Authentication Page
- Email/password login
- Email/password signup
- Google OAuth integration
- Session management

#### `Chat.tsx` - Main Chat Interface (via `components/Chat.tsx`)
- Real-time AI conversations
- File upload support
- Agent switching
- Workflow suggestions
- Conversation history

#### `Agents.tsx` - Agent Management
- CRUD operations for agents
- Agent configuration
- Profile image generation
- Tool selection
- Marketplace submission

#### `Canvas.tsx` - Canvas Workflow Builder
- Free-form workflow design
- Custom node positioning
- Complex workflow patterns
- Import/export capabilities

#### `Stage.tsx` - Stage Workflow Builder
- Sequential workflow pipelines
- Agent and function nodes
- Real-time execution
- Output logging
- Save/load workflows

#### `AgentMarketplace.tsx` - Community Agents
- Browse published agents
- Search and filter
- Clone agents
- Rate and review

#### `WorkflowMarketplace.tsx` - Community Workflows
- Browse published workflows
- Preview workflow structure
- Import to Canvas or Stage
- Share workflows

#### `PromptLibrary.tsx` - Prompt Management
- Curated prompt collection
- Framework-based organization
- Search and categorization
- Custom prompt creation

#### `ImageAnalysis.tsx` - Image Processing
- Multi-image upload
- PDF document analysis
- Custom prompt analysis
- Batch processing
- Result export

#### `VoiceAnalysis.tsx` - Voice Processing
- Speech-to-text conversion
- Text-to-speech generation
- Multiple voice options
- Audio file upload

#### `MeetingTranscripts.tsx` - Transcript Analysis
- VTT file support
- Action item extraction
- Executive summary generation
- Key decision identification

### Shared Components (`src/components/`)

#### Chat Components (`src/components/chat/`)

**`ChatInterface.tsx`**
- Message rendering
- Markdown support with syntax highlighting
- Image/file attachment display
- Streaming message updates

**`ChatSidebar.tsx`**
- Conversation list
- New conversation creation
- Conversation deletion
- Active conversation highlighting

**`ChatHeader.tsx`**
- Page title and navigation
- Theme toggle
- Help button (opens GlobalHelperAgent)
- Agent display

**`AgentSwitcher.tsx`**
- Agent selection dropdown
- Live agent switching
- Agent profile display

**`AudioUploader.tsx`**
- Audio file upload
- Speech-to-text integration
- Transcription display

**`ToolsToolbar.tsx`**
- Quick access to analysis tools
- Image analysis button
- Voice processing button
- File upload button

**`TransparencyPanel.tsx`**
- Shows AI reasoning process
- Tool usage display
- Debug information

**`WorkflowSuggestion.tsx`**
- Displays AI-suggested workflows
- Accept/decline/edit options
- Navigation to workflow builders
- JSON editor for workflows

#### Workflow Components (`src/components/workflow/`)

**`stage/` Directory**
- `Stage.tsx`: Main stage canvas
- `AgentNode.tsx`: Agent workflow nodes
- `FunctionNode.tsx`: Function workflow nodes
- `WorkflowCanvas.tsx`: ReactFlow integration
- `Toolbar.tsx`: Workflow controls (desktop)
- `MobileNav.tsx`: Workflow controls (mobile)
- `Sidebar.tsx`: Node palette
- `PropertiesPanel.tsx`: Node configuration
- `OutputLog.tsx`: Execution logs
- `HelpModal.tsx`: User guidance

**`AgentSelector.tsx`**
- Agent selection for workflows
- Agent preview
- Search and filter

**`FunctionSelector.tsx`**
- Function node selection
- Function descriptions
- Category organization

**`SaveWorkflowDialog.tsx`**
- Workflow name and description
- Save to database
- Validation

**`LoadWorkflowDialog.tsx`**
- Browse saved workflows
- Load workflow into builder
- Preview workflow structure

**`ShareWorkflowDialog.tsx`**
- Share with specific users
- Publish to marketplace
- Access control

#### Agent Components (`src/components/agents/`)

**`AgentSelectorDialog.tsx`**
- Modal for agent selection
- Agent list with search
- Agent preview
- Clone/use buttons

#### Image Analysis Components (`src/components/imageAnalysis/`)

**`FileUploader.tsx`**
- Drag-and-drop upload
- Multi-file selection
- File type validation
- Preview thumbnails

**`ImageGallery.tsx`**
- Image grid display
- Image selection
- Zoom/preview
- Delete images

**`ResultsViewer.tsx`**
- Analysis results display
- JSON formatting
- Export options

**`PromptManager.tsx`**
- Custom prompt input
- Prompt templates
- Prompt history

**`PDFSelector.tsx`**
- PDF page selection
- Page range input
- Preview selected pages

#### Voice Components (`src/components/voice/`)

**`SpeechToTextTab.tsx`**
- Audio file upload
- Transcription display
- Language selection
- Export transcript

**`TextToSpeechTab.tsx`**
- Text input for synthesis
- Voice selection
- Model selection
- Audio playback
- Download MP3

**`VoiceProcessor.tsx`**
- Core voice processing logic
- API integration
- Error handling

#### UI Components (`src/components/ui/`)

These are shadcn/ui components built on Radix UI:

- `button.tsx`: Button variants
- `input.tsx`: Text input
- `textarea.tsx`: Multi-line text input
- `select.tsx`: Dropdown selection
- `dialog.tsx`: Modal dialogs
- `card.tsx`: Container component
- `badge.tsx`: Status badges
- `toast.tsx`: Notification system
- `tabs.tsx`: Tabbed interface
- `accordion.tsx`: Collapsible sections
- `dropdown-menu.tsx`: Context menus
- `scroll-area.tsx`: Scrollable containers
- ... and many more

---

## Backend Services

### Edge Functions (`supabase/functions/`)

All backend logic runs in Supabase Edge Functions using Deno runtime.

#### `chat/index.ts`
**Purpose**: Proxy to Lovable AI Gateway

**Request**:
```json
{
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "model": "google/gemini-2.5-flash" // optional
}
```

**Response**: Server-Sent Events stream

**Features**:
- Streaming responses
- Rate limit handling
- Error handling
- CORS support

#### `gemini-chat/index.ts`
**Purpose**: Direct Gemini API integration

**Request**:
```json
{
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "stream": true
}
```

**Features**:
- Text-only chat
- Streaming support
- System prompt injection
- Workflow suggestion detection

**Workflow Suggestion Format**:
The edge function adds a system prompt that instructs Gemini to suggest workflows:

```
When you detect that a user's request could benefit from:
- Multi-agent collaboration → Suggest Canvas workflow
- Sequential processing → Suggest Stage workflow
- Reusable prompts → Suggest Prompt Library

Format: [WORKFLOW_SUGGESTION:type:json]
```

#### `gemini-chat-with-images/index.ts`
**Purpose**: Multimodal Gemini chat with images

**Request**:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "What's in this image?",
      "images": ["data:image/jpeg;base64,..."]
    }
  ]
}
```

**Features**:
- Image analysis
- PDF page analysis
- Multiple image support
- Streaming responses

#### `speech-to-text/index.ts`
**Purpose**: Convert audio to text using Google STT

**Request**:
```json
{
  "audioData": "data:audio/wav;base64,...",
  "languageCode": "en-US"
}
```

**Response**:
```json
{
  "transcript": "This is the transcribed text"
}
```

#### `text-to-speech/index.ts`
**Purpose**: Generate speech using ElevenLabs

**Request**:
```json
{
  "text": "Hello, world!",
  "voiceId": "21m00Tcm4TlvDq8ikWAM",
  "modelId": "eleven_monolingual_v1"
}
```

**Response**: Audio stream (MP3)

**Features**:
- Streaming audio
- Multiple voices
- Multiple models
- Natural-sounding speech

#### `get-elevenlabs-voices/index.ts`
**Purpose**: List available TTS voices

**Response**:
```json
{
  "voices": [
    {
      "voice_id": "21m00Tcm4TlvDq8ikWAM",
      "name": "Rachel",
      "preview_url": "https://...",
      "category": "premade"
    }
  ]
}
```

#### `get-elevenlabs-models/index.ts`
**Purpose**: List available TTS models

**Response**:
```json
{
  "models": [
    {
      "model_id": "eleven_monolingual_v1",
      "name": "Eleven Monolingual v1",
      "languages": ["en"]
    }
  ]
}
```

#### `analyze-transcript/index.ts`
**Purpose**: Analyze meeting transcripts

**Request**:
```json
{
  "transcript": "Meeting transcript text..."
}
```

**Response**:
```json
{
  "executiveSummary": "...",
  "actionItems": ["..."],
  "keyDecisions": ["..."],
  "importantTopics": ["..."]
}
```

#### `web-scrape/index.ts`
**Purpose**: Extract content from web pages

**Request**:
```json
{
  "url": "https://example.com",
  "returnHtml": false
}
```

**Response**:
```json
{
  "success": true,
  "url": "https://example.com",
  "title": "Page Title",
  "content": "Extracted text content...",
  "contentLength": 1234
}
```

**Features**:
- Rotating user agents
- Retry logic
- HTML to text conversion
- Title extraction

#### `google-search/index.ts`
**Purpose**: Google Custom Search integration

**Request**:
```json
{
  "query": "search term",
  "numResults": 10,
  "apiKey": "optional",
  "searchEngineId": "optional"
}
```

**Response**:
```json
{
  "results": [
    {
      "title": "Result Title",
      "link": "https://...",
      "snippet": "Description..."
    }
  ]
}
```

#### `run-agent/index.ts`
**Purpose**: Execute agent workflows with tools

**Request**:
```json
{
  "systemPrompt": "You are...",
  "userPrompt": "User message",
  "tools": [
    {
      "name": "google-search",
      "params": { "query": "test" }
    }
  ]
}
```

**Flow**:
1. Execute all requested tools
2. Collect tool outputs
3. Send to AI with combined context
4. Return AI response + tool outputs

**Supported Tools**:
- `google-search`: Web search
- `weather`: Weather data
- `time`: Current time
- `web-scrape`: Web scraping
- `api-call`: Generic API calls

#### `api-call/index.ts`
**Purpose**: Generic API proxy

**Request**:
```json
{
  "url": "https://api.example.com/data",
  "method": "POST",
  "headers": { "Authorization": "Bearer ..." },
  "body": { "key": "value" }
}
```

#### `generate-agent-image/index.ts`
**Purpose**: Generate AI profile images for agents

**Request**:
```json
{
  "prompt": "A friendly robot assistant"
}
```

**Response**:
```json
{
  "imageUrl": "https://storage.supabase.co/...",
  "fileName": "agent-image-123.png",
  "prompt": "A friendly robot assistant"
}
```

**Flow**:
1. Call Lovable AI image generation
2. Convert base64 to blob
3. Upload to Supabase Storage
4. Return public URL

---

## Database Schema

### Authentication Tables

#### `auth.users` (Supabase managed)
- User accounts
- Email, password hashes
- OAuth provider info
- Session tokens

### Application Tables

#### `agents`
```sql
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  user_prompt TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  metadata_tags TEXT[],
  profile_picture_url TEXT,
  visibility TEXT DEFAULT 'private', -- 'private', 'shared', 'pending_review', 'published'
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewer_id UUID REFERENCES auth.users,
  is_template BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  rating NUMERIC(3,2),
  category TEXT
);
```

**RLS Policies**:
- Users can read their own agents
- Users can read published agents
- Users can create/update/delete their own agents
- Only admins can approve marketplace submissions

#### `agent_shares`
```sql
CREATE TABLE agent_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents NOT NULL,
  shared_with_user_id UUID REFERENCES auth.users NOT NULL,
  shared_by_user_id UUID REFERENCES auth.users NOT NULL,
  permission TEXT NOT NULL, -- 'view' or 'edit'
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `conversations`
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT,
  agent_id UUID REFERENCES agents,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `messages`
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations NOT NULL,
  role TEXT NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  attachments JSONB, -- Images and files
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Realtime**:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

#### `workflows`
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'canvas' or 'stage'
  definition JSONB NOT NULL, -- Workflow structure
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `prompts`
```sql
CREATE TABLE prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  framework_id UUID REFERENCES frameworks,
  is_public BOOLEAN DEFAULT false,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `frameworks`
```sql
CREATE TABLE frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Storage Buckets

#### `profile-images`
- Agent profile pictures
- AI-generated images
- Public read access
- Authenticated write access

#### `user-uploads`
- User-uploaded files
- Images for analysis
- Audio files
- Documents
- Private access (user-specific)

---

## API Reference

### Calling Edge Functions

From the client:

```typescript
import { supabase } from '@/integrations/supabase/client';

// Example: Call chat function
const { data, error } = await supabase.functions.invoke('chat', {
  body: {
    messages: [
      { role: 'user', content: 'Hello!' }
    ]
  }
});

// Example: Call with streaming
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
    },
    body: JSON.stringify({
      messages: [...]
    })
  }
);

// Handle streaming response
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  console.log(chunk); // Process chunk
}
```

### Database Queries

#### Fetching Agents

```typescript
const { data: agents, error } = await supabase
  .from('agents')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

#### Creating a Conversation

```typescript
const { data: conversation, error } = await supabase
  .from('conversations')
  .insert({
    user_id: userId,
    title: 'New Chat',
    agent_id: selectedAgentId
  })
  .select()
  .single();
```

#### Adding a Message

```typescript
const { data: message, error } = await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    role: 'user',
    content: messageText,
    attachments: {
      images: [...],
      files: [...]
    }
  })
  .select()
  .single();
```

---

## Hooks Reference

### `useAuth()`
```typescript
const { user, session, loading } = useAuth();
```

### `useChat()`
```typescript
const {
  messages,
  loading,
  isLoadingHistory,
  sendMessage,
  clearChat,
  deleteMessage
} = useChat();
```

### `useAgents()`
```typescript
const {
  agents,
  loading,
  createAgent,
  updateAgent,
  deleteAgent,
  shareAgent,
  cloneAgent,
  submitToMarketplace,
  fetchMarketplaceAgents
} = useAgents();
```

### `useWorkflows()`
```typescript
const {
  workflows,
  loading,
  saveWorkflow,
  loadWorkflow,
  deleteWorkflow,
  shareWorkflow
} = useWorkflows();
```

### `usePrompts()`
```typescript
const {
  prompts,
  loading,
  createPrompt,
  updatePrompt,
  deletePrompt
} = usePrompts();
```

### `useFrameworks()`
```typescript
const {
  frameworks,
  loading,
  createFramework,
  updateFramework,
  deleteFramework
} = useFrameworks();
```

---

## Utility Functions

### File Processing (`src/utils/`)

#### `parsePdf.ts`
- Extract text from PDFs
- Extract images from PDFs
- Page-by-page extraction

#### `parseExcel.ts`
- Read Excel files
- Extract data from sheets
- Convert to JSON

#### `parseText.ts`
- Detect text files
- Read file contents
- Encoding detection

#### `parseVTT.ts`
- Parse VTT subtitle files
- Extract timestamps
- Convert to plain text

#### `fileTextExtraction.ts`
- Unified file extraction API
- Supports: PDF, Excel, DOCX, TXT, VTT
- Returns structured data

#### `markdownProcessor.ts`
- Markdown to HTML conversion
- Syntax highlighting
- Custom renderers

### Workflow Processing (`src/utils/`)

#### `parseWorkflowSuggestion.ts`
```typescript
export function parseWorkflowSuggestion(content: string): {
  actionType: 'canvas' | 'stage' | 'prompt-library';
  workflowData: any;
  description: string;
} | null
```

Parses AI responses for workflow suggestions in format:
```
[WORKFLOW_SUGGESTION:canvas:{...}]
Description text here
```

---

## Design System

### Color Tokens (`src/index.css`)

```css
:root {
  /* Base colors */
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
  
  /* Primary colors */
  --primary: 220 90% 56%;
  --primary-foreground: 0 0% 100%;
  
  /* Accent colors */
  --accent: 280 65% 60%;
  --accent-foreground: 0 0% 100%;
  
  /* UI colors */
  --card: 0 0% 7%;
  --border: 0 0% 14.9%;
  --muted: 240 5% 26%;
  --destructive: 0 84.2% 60.2%;
}
```

### Using Semantic Tokens

```tsx
// ✅ Correct
<div className="bg-background text-foreground">
<Button className="bg-primary text-primary-foreground">

// ❌ Wrong
<div className="bg-black text-white">
<Button className="bg-blue-500 text-white">
```

### Component Variants

```tsx
// Button variants
<Button variant="default">Default</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>

// Button sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
```

---

## Development Workflow

### Local Setup

```bash
# Clone repository
git clone <YOUR_GIT_URL>
cd <PROJECT_NAME>

# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-key
VITE_SUPABASE_PROJECT_ID=your-project-id
```

### Adding New Features

1. **New Page**:
   - Create page in `src/pages/NewPage.tsx`
   - Add route in `src/App.tsx`
   - Add navigation link where needed

2. **New Component**:
   - Create component in appropriate directory
   - Add JSDoc comments
   - Export from index if needed

3. **New Hook**:
   - Create hook in `src/hooks/useNewHook.tsx`
   - Add TypeScript types
   - Document with JSDoc comments

4. **New Edge Function**:
   - Create directory in `supabase/functions/new-function/`
   - Add `index.ts` with handler
   - Update `supabase/config.toml`:
     ```toml
     [functions.new-function]
     verify_jwt = true  # or false for public
     ```
   - Deploy automatically on next push

### Testing

```bash
# Run type checking
npm run type-check

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix
```

---

## Deployment Guide

### Lovable Platform

1. Push changes to GitHub
2. Changes auto-deploy to Lovable
3. Click "Publish" in Lovable UI
4. App is live at `yoursite.lovable.app`

### Custom Deployment

**Vercel**:
```bash
npm install -g vercel
vercel --prod
```

**Netlify**:
```bash
npm install -g netlify-cli
netlify deploy --prod
```

**Docker**:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm", "run", "preview"]
```

### Environment Configuration

For production, set these in your hosting platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Edge function secrets (set in Supabase dashboard):
- `GEMINI_API_KEY`
- `ELEVENLABS_API_KEY`
- `GOOGLE_SEARCH_API_KEY`
- `LOVABLE_API_KEY` (auto-provided)

---

## Best Practices

### Code Organization

1. **Components**: One component per file
2. **Hooks**: Custom hooks in `src/hooks/`
3. **Types**: Shared types in `src/types/`
4. **Utils**: Helper functions in `src/utils/`
5. **Edge Functions**: One function per directory

### TypeScript

```typescript
// ✅ Use interfaces for objects
interface User {
  id: string;
  email: string;
}

// ✅ Use type for unions
type Status = 'pending' | 'complete' | 'error';

// ✅ Use generics when appropriate
function fetchData<T>(url: string): Promise<T>
```

### React Patterns

```tsx
// ✅ Custom hooks for logic
const { data, loading } = useData();

// ✅ Memoization for expensive operations
const filtered = useMemo(() => filter(data), [data]);

// ✅ useCallback for function props
const handleClick = useCallback(() => {}, []);
```

### Error Handling

```typescript
try {
  const { data, error } = await supabase
    .from('table')
    .select();
    
  if (error) throw error;
  
  return data;
} catch (error) {
  console.error('Error:', error);
  toast.error('Failed to load data');
}
```

---

## Troubleshooting

### Common Issues

**Build errors**:
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear cache: `npm run build --force`

**Auth issues**:
- Check Supabase project settings
- Verify RLS policies
- Check CORS configuration

**Edge function errors**:
- Check function logs in Supabase dashboard
- Verify environment variables
- Test with curl/Postman

**Styling issues**:
- Check Tailwind config
- Verify design tokens in index.css
- Inspect with browser DevTools

---

## Additional Resources

- [Lovable Documentation](https://docs.lovable.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)

---

**Last Updated**: 2025-01-27
