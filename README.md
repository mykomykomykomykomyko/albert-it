# Albert - AI Assistant Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with Lovable](https://img.shields.io/badge/Built%20with-Lovable-blue)](https://lovable.dev)

> **Albert** is a comprehensive AI assistant platform developed by the Government of Alberta, providing free, secure, and powerful AI capabilities to Albertans.

## 📖 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Application Architecture](#application-architecture)
- [Core Features Documentation](#core-features-documentation)
- [Backend Services](#backend-services)
- [Database Schema](#database-schema)
- [Authentication](#authentication)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

Albert is a next-generation AI platform that combines conversational AI, workflow automation, image analysis, voice processing, and agent management into a unified, user-friendly interface. Built with modern web technologies and powered by Google's Gemini AI, Albert provides:

- **Conversational AI**: Natural language chat with file upload support
- **Workflow Automation**: Visual workflow builders (Canvas & Stage)
- **Agent System**: Create and manage custom AI agents
- **Multimodal AI**: Image analysis, voice processing, and document analysis
- **Marketplace**: Share and discover agents and workflows
- **Enterprise Security**: Built-in authentication and secure data handling

---

## ✨ Features

### 1. **Chat Interface** (`/chat`)
- Real-time AI conversations powered by Google Gemini
- File upload support (images, PDFs, documents)
- Streaming responses for instant feedback
- Conversation history and management
- Agent switching within conversations
- Workflow suggestions based on context
- Transparency panel showing AI reasoning

**Key Components:**
- `src/components/Chat.tsx` - Main chat interface
- `src/components/chat/ChatInterface.tsx` - Message rendering
- `src/components/chat/ChatSidebar.tsx` - Conversation management
- `src/components/chat/WorkflowSuggestion.tsx` - Smart workflow recommendations

### 2. **Agent Management** (`/agents`)
- Create custom AI agents with specific personalities
- Define system prompts and behavior
- Assign tools and capabilities to agents
- Generate custom agent profile images
- Public/private agent visibility
- Agent marketplace integration

**Key Components:**
- `src/pages/Agents.tsx` - Agent management interface
- `src/hooks/useAgents.tsx` - Agent data management
- `src/components/agents/AgentSelectorDialog.tsx` - Agent selection UI

### 3. **Stage Workflow Builder** (`/stage`)
- Visual workflow builder with drag-and-drop
- Connect AI agents in sequential pipelines
- Add function nodes for data processing
- Real-time execution and debugging
- Output logging and monitoring
- Save and share workflows
- Import/export workflow definitions

**Key Components:**
- `src/pages/Stage.tsx` - Main stage interface
- `src/components/workflow/stage/Stage.tsx` - Canvas component
- `src/components/workflow/stage/AgentNode.tsx` - Agent workflow nodes
- `src/components/workflow/stage/FunctionNode.tsx` - Function workflow nodes
- `src/components/workflow/stage/WorkflowCanvas.tsx` - ReactFlow integration

### 4. **Canvas Workflow Builder** (`/canvas`)
- Alternative workflow visualization
- Flexible node positioning
- Complex workflow patterns
- Multi-agent orchestration
- Workflow templates

**Key Components:**
- `src/pages/Canvas.tsx` - Canvas interface
- `src/components/canvas/CustomNode.tsx` - Custom workflow nodes

### 5. **Agent Marketplace** (`/marketplace`)
- Browse community-created agents
- Preview agent capabilities
- Clone agents to your workspace
- Rate and review agents
- Search and filter functionality

**Key Components:**
- `src/pages/AgentMarketplace.tsx` - Marketplace interface

### 6. **Workflow Marketplace** (`/workflow-marketplace`)
- Share and discover workflows
- Preview workflow structures
- Import workflows to Canvas or Stage
- Community contributions

**Key Components:**
- `src/pages/WorkflowMarketplace.tsx` - Workflow marketplace interface

### 7. **Prompt Library** (`/prompts`)
- Curated collection of AI prompts
- Framework-based organization
- Search and categorization
- Quick-use templates
- Save custom prompts

**Key Components:**
- `src/pages/PromptLibrary.tsx` - Prompt management
- `src/hooks/usePrompts.tsx` - Prompt data hooks
- `src/hooks/useFrameworks.tsx` - Framework organization

### 8. **Image Analysis** (`/image`)
- Upload and analyze images
- PDF document analysis
- Batch processing support
- Custom prompt-based analysis
- Object detection and OCR
- Result export and saving

**Key Components:**
- `src/pages/ImageAnalysis.tsx` - Main analysis interface
- `src/components/imageAnalysis/FileUploader.tsx` - File upload handling
- `src/components/imageAnalysis/ImageGallery.tsx` - Image preview
- `src/components/imageAnalysis/ResultsViewer.tsx` - Analysis results
- `src/components/imageAnalysis/PromptManager.tsx` - Custom prompts

### 9. **Voice Processing** (`/voice`)
- **Speech-to-Text**: Convert audio to text with Google STT
- **Text-to-Speech**: Generate natural-sounding speech with ElevenLabs
- Multiple voice options
- Language support
- Real-time processing
- Streaming audio playback

**Key Components:**
- `src/pages/VoiceAnalysis.tsx` - Voice interface
- `src/components/voice/SpeechToTextTab.tsx` - STT interface
- `src/components/voice/TextToSpeechTab.tsx` - TTS interface
- `src/components/voice/VoiceProcessor.tsx` - Audio processing logic
- `src/hooks/useStreamingAudio.tsx` - Audio streaming hook

### 10. **Meeting Transcripts** (`/transcripts`)
- Analyze meeting transcripts
- Extract action items
- Generate executive summaries
- Identify key decisions
- Topic extraction
- VTT file support

**Key Components:**
- `src/pages/MeetingTranscripts.tsx` - Transcript analysis interface

### 11. **Authentication** (`/auth`)
- Email/password authentication
- Google OAuth integration
- Session management
- Secure token handling
- User profile management

**Key Components:**
- `src/pages/Auth.tsx` - Authentication UI
- `src/hooks/useAuth.tsx` - Authentication logic

### 12. **Global Helper Agent**
- Context-aware help system
- Always accessible via `?` button
- Provides guidance on any page
- Smart recommendations

**Key Components:**
- `src/components/GlobalHelperAgent.tsx` - Helper agent interface
- `src/components/HelperAgent.tsx` - Agent logic
- `src/components/ChatHeader.tsx` - Header with help button

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router DOM v6
- **UI Components**: Radix UI primitives
- **Workflow Visualization**: ReactFlow
- **Charts**: Recharts
- **Forms**: React Hook Form with Zod validation
- **File Handling**: react-dropzone
- **Markdown**: react-markdown with remark-gfm
- **PDF Processing**: pdfjs-dist
- **Document Parsing**: mammoth, docx
- **Excel Processing**: exceljs

### Backend (Supabase Edge Functions)
- **Runtime**: Deno
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **AI Integration**: Google Gemini API
- **Voice Services**: ElevenLabs, Google Speech-to-Text

### Key Dependencies
```json
{
  "@tanstack/react-query": "^5.83.0",
  "@supabase/supabase-js": "^2.76.1",
  "react": "^18.3.1",
  "react-router-dom": "^6.30.1",
  "reactflow": "^11.11.4",
  "tailwindcss": "^3.4.0",
  "zod": "^3.25.76"
}
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <YOUR_GIT_URL>
   cd <YOUR_PROJECT_NAME>
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   The project uses Lovable Cloud with Supabase. Environment variables are auto-configured:
   - `VITE_SUPABASE_URL` - Supabase project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase publishable key
   - `VITE_SUPABASE_PROJECT_ID` - Supabase project ID

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

### Building for Production
```bash
npm run build
```

The built files will be in the `dist/` directory.

---

## 🏗️ Application Architecture

### Project Structure
```
albert/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── agents/          # Agent-related components
│   │   ├── canvas/          # Canvas workflow components
│   │   ├── chat/            # Chat interface components
│   │   ├── imageAnalysis/   # Image analysis components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── voice/           # Voice processing components
│   │   └── workflow/        # Workflow builder components
│   ├── hooks/               # Custom React hooks
│   ├── integrations/        # External service integrations
│   │   └── supabase/        # Supabase client & types
│   ├── lib/                 # Utility libraries
│   ├── pages/               # Page components (routes)
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   ├── App.tsx              # Main application component
│   ├── index.css            # Global styles & design tokens
│   └── main.tsx             # Application entry point
├── supabase/
│   ├── functions/           # Edge functions (serverless)
│   │   ├── chat/            # Chat API
│   │   ├── gemini-chat/     # Gemini AI integration
│   │   ├── speech-to-text/  # STT processing
│   │   ├── text-to-speech/  # TTS generation
│   │   ├── web-scrape/      # Web scraping
│   │   ├── google-search/   # Google search API
│   │   └── ...              # Other functions
│   └── config.toml          # Supabase configuration
├── public/                  # Static assets
├── tailwind.config.ts       # Tailwind configuration
├── vite.config.ts           # Vite configuration
└── package.json             # Project dependencies
```

### Component Architecture

```
┌─────────────────────────────────────────┐
│           App.tsx (Router)              │
└─────────────────────────────────────────┘
                    │
     ┌──────────────┼──────────────┐
     │              │              │
┌────▼────┐   ┌────▼────┐   ┌────▼────┐
│  Pages  │   │  Chat   │   │ Agents  │
│ (Routes)│   │Interface│   │ Manager │
└─────────┘   └─────────┘   └─────────┘
     │              │              │
┌────▼────────┬────▼────────┬────▼─────┐
│  Workflow   │   Image     │   Voice  │
│  Builders   │  Analysis   │Processing│
└─────────────┴─────────────┴──────────┘
                    │
     ┌──────────────┼──────────────┐
     │              │              │
┌────▼────┐   ┌────▼────┐   ┌────▼────┐
│Supabase │   │  Gemini │   │ElevenLabs│
│ Backend │   │   AI    │   │  Voice  │
└─────────┘   └─────────┘   └─────────┘
```

### Data Flow

1. **User Interaction** → Component
2. **Component** → Custom Hook (useChat, useAgents, etc.)
3. **Hook** → Supabase Client / Edge Function
4. **Edge Function** → External API (Gemini, ElevenLabs, etc.)
5. **Response** → Hook → Component → UI Update

---

## 📚 Core Features Documentation

### Chat System

The chat system is the heart of Albert, providing conversational AI capabilities.

#### Architecture
- **Frontend**: `src/components/Chat.tsx` and `src/components/chat/`
- **Backend**: `supabase/functions/gemini-chat/index.ts`
- **Hook**: `src/hooks/useChat.tsx`

#### Key Features
1. **Streaming Responses**: Real-time token-by-token streaming
2. **File Upload**: Images, PDFs, and documents
3. **Agent Selection**: Switch between different AI agents
4. **Workflow Suggestions**: AI suggests workflows based on context
5. **Transparency**: View AI reasoning and tool usage

#### Workflow Suggestion System

The chat can intelligently suggest creating workflows when it detects relevant patterns:

```typescript
// Example workflow suggestion format
{
  "actionType": "canvas" | "stage" | "prompt-library",
  "workflowData": { /* workflow definition */ },
  "description": "Why this workflow would help"
}
```

The AI analyzes conversation context and suggests:
- **Canvas workflows**: For complex multi-agent orchestration
- **Stage workflows**: For sequential multi-step processes
- **Prompt library**: For reusable prompts

Users can accept, decline, or edit suggested workflows before creation.

### Agent System

Agents are customizable AI personalities with specific behaviors and capabilities.

#### Agent Properties
- **Name**: Display name
- **Personality**: Behavioral traits
- **System Prompt**: Instructions for the AI
- **Tools**: Available functions (search, calculator, weather, etc.)
- **Visibility**: Public (marketplace) or private
- **Profile Image**: AI-generated or custom

#### Creating an Agent
1. Navigate to `/agents`
2. Click "Create Agent"
3. Define personality and system prompt
4. Select available tools
5. Generate profile image
6. Save and test

#### Agent Marketplace
- Browse community agents
- Clone and customize
- Rate and review
- Search by category

### Workflow Builders

Albert provides two workflow builders for different use cases.

#### Stage Workflow Builder (`/stage`)

**Purpose**: Sequential, pipeline-based workflows

**Components**:
- Agent Nodes: AI processing steps
- Function Nodes: Data transformation
- Connectors: Define flow between nodes

**Features**:
- Visual drag-and-drop interface
- Real-time execution
- Output logging
- Save/load workflows
- Import/export JSON

**Use Cases**:
- Multi-step document processing
- Sequential data analysis
- Chained AI reasoning
- Automated reporting

#### Canvas Workflow Builder (`/canvas`)

**Purpose**: Complex, non-linear workflows

**Features**:
- Free-form node positioning
- Multiple execution paths
- Conditional logic
- Parallel processing

**Use Cases**:
- Multi-agent collaboration
- Complex decision trees
- Iterative processing
- Dynamic routing

### Image Analysis

Multimodal AI for visual understanding.

#### Capabilities
- Image classification
- Object detection
- Text extraction (OCR)
- Visual question answering
- PDF document analysis
- Batch processing

#### Workflow
1. Upload images or PDFs
2. Select or create analysis prompt
3. Process files
4. View results
5. Export data

### Voice Processing

#### Speech-to-Text (STT)
- **Provider**: Google Speech-to-Text
- **Features**:
  - Multiple language support
  - Audio file upload
  - Real-time transcription
  - Timestamp generation

#### Text-to-Speech (TTS)
- **Provider**: ElevenLabs
- **Features**:
  - Natural-sounding voices
  - Multiple voice options
  - Streaming audio
  - Download MP3

---

## 🔧 Backend Services

### Edge Functions

All backend logic runs in Supabase Edge Functions (Deno runtime).

#### Available Functions

| Function | Purpose | Endpoint |
|----------|---------|----------|
| `chat` | Proxy to Lovable AI Gateway | `/functions/v1/chat` |
| `gemini-chat` | Direct Gemini API chat | `/functions/v1/gemini-chat` |
| `gemini-chat-with-images` | Gemini with image support | `/functions/v1/gemini-chat-with-images` |
| `speech-to-text` | Google STT processing | `/functions/v1/speech-to-text` |
| `text-to-speech` | ElevenLabs TTS generation | `/functions/v1/text-to-speech` |
| `analyze-transcript` | Meeting analysis | `/functions/v1/analyze-transcript` |
| `web-scrape` | Web content extraction | `/functions/v1/web-scrape` |
| `google-search` | Google Custom Search | `/functions/v1/google-search` |
| `run-agent` | Execute agent workflows | `/functions/v1/run-agent` |
| `api-call` | Generic API proxy | `/functions/v1/api-call` |
| `weather` | Weather data | `/functions/v1/weather` |
| `time` | Time utilities | `/functions/v1/time` |
| `get-elevenlabs-voices` | List TTS voices | `/functions/v1/get-elevenlabs-voices` |
| `get-elevenlabs-models` | List TTS models | `/functions/v1/get-elevenlabs-models` |
| `generate-agent-image` | AI image generation | `/functions/v1/generate-agent-image` |

#### Function Authentication

Functions use JWT verification by default. To make a function public:

```toml
# supabase/config.toml
[functions.my-function]
verify_jwt = false
```

#### Calling Functions

```typescript
import { supabase } from '@/integrations/supabase/client';

// Invoke a function
const { data, error } = await supabase.functions.invoke('chat', {
  body: { messages: [...] }
});
```

---

## 🗄️ Database Schema

### Core Tables

#### `agents`
Stores custom AI agent definitions.

```sql
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  personality TEXT,
  system_prompt TEXT,
  tools JSONB,
  is_public BOOLEAN DEFAULT false,
  profile_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `conversations`
Chat conversation metadata.

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
Individual chat messages.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations NOT NULL,
  role TEXT NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  attachments JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `workflows`
Saved workflow definitions.

```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'canvas' or 'stage'
  definition JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `prompts`
Prompt library entries.

```sql
CREATE TABLE prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  framework_id UUID REFERENCES frameworks,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `frameworks`
Prompt categorization.

```sql
CREATE TABLE frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Row-Level Security (RLS)

All tables have RLS policies ensuring:
- Users can only read/write their own data
- Public items are readable by everyone
- Admins have elevated permissions

---

## 🔐 Authentication

### Authentication Flow

1. User visits landing page (`/landing`)
2. Clicks "Sign In" → Redirects to `/auth`
3. Chooses authentication method:
   - Email/password
   - Google OAuth
4. On success → Redirects to `/chat`
5. Session persisted in localStorage

### Implementation

```typescript
// src/hooks/useAuth.tsx
export const useAuth = () => {
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { signIn, signUp, signOut };
};
```

### Protected Routes

Routes are protected by checking authentication status:

```typescript
// src/pages/Index.tsx
useEffect(() => {
  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      navigate('/chat');
    } else {
      navigate('/landing');
    }
  };
  checkAuth();
}, []);
```

---

## 🎨 Design System

### Theme Configuration

Albert uses a comprehensive design system defined in `src/index.css` and `tailwind.config.ts`.

#### Color Tokens

```css
:root {
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
  --primary: 220 90% 56%;
  --accent: 280 65% 60%;
  --muted: 240 5% 26%;
  /* ... more tokens */
}
```

#### Semantic Usage

```tsx
// ✅ Correct: Use semantic tokens
<div className="bg-background text-foreground">
<Button variant="primary">Click me</Button>

// ❌ Wrong: Don't use direct colors
<div className="bg-black text-white">
<Button className="bg-blue-500">Click me</Button>
```

### Component Variants

All UI components support theming through variants:

```typescript
// Button variants
<Button variant="default">Default</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
```

---

## 🚀 Deployment

### Via Lovable Platform

1. Open your project in [Lovable](https://lovable.dev)
2. Click **Publish** button (top-right on desktop, bottom-right on mobile)
3. Your app is deployed instantly
4. Access via `yoursite.lovable.app`

### Custom Domain

1. Navigate to **Project > Settings > Domains**
2. Click **Connect Domain**
3. Add your custom domain (e.g., `albert.ca`)
4. Update DNS records as instructed
5. Wait for verification

**Note**: Custom domains require a paid Lovable plan.

### Self-Hosting

Since the code is in GitHub, you can deploy anywhere:

```bash
# Build the project
npm run build

# Deploy dist/ to your hosting provider
# (Vercel, Netlify, AWS, etc.)
```

**Environment Variables**: Set up Supabase credentials in your hosting environment.

---

## 🧪 Development

### Running Tests

```bash
npm run test
```

### Linting

```bash
npm run lint
```

### Type Checking

```bash
npm run type-check
```

### Adding Dependencies

```bash
npm install package-name
```

---

## 📖 API Documentation

### Chat API

#### POST `/functions/v1/gemini-chat`

**Request**:
```json
{
  "messages": [
    { "role": "user", "content": "Hello!" }
  ],
  "stream": true
}
```

**Response** (Server-Sent Events):
```
data: {"choices":[{"delta":{"content":"Hello"}}]}
data: {"choices":[{"delta":{"content":"!"}}]}
data: [DONE]
```

### Agent Execution

#### POST `/functions/v1/run-agent`

**Request**:
```json
{
  "systemPrompt": "You are a helpful assistant",
  "userPrompt": "What's the weather?",
  "tools": [
    { "name": "weather", "params": { "location": "Edmonton" } }
  ]
}
```

**Response**:
```json
{
  "output": "The weather in Edmonton is...",
  "toolOutputs": [...]
}
```

---

## 🤝 Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Commit: `git commit -m 'Add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Code Standards

- Use TypeScript for all new code
- Follow existing code style
- Add JSDoc comments for functions
- Write meaningful commit messages
- Test your changes thoroughly

### Reporting Issues

Open an issue on GitHub with:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

---

## 📄 License

This project is licensed under the **MIT License** - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- **Google Gemini**: AI capabilities
- **Supabase**: Backend infrastructure
- **ElevenLabs**: Voice synthesis
- **shadcn/ui**: UI components
- **Lovable**: Development platform

---

## 📞 Support

- **Documentation**: [Lovable Docs](https://docs.lovable.dev)
- **Community**: [Discord](https://discord.gg/lovable)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)

---

## 🗺️ Roadmap

### Planned Features
- [ ] Multi-language support
- [ ] Advanced workflow templates
- [ ] Real-time collaboration
- [ ] Enhanced analytics
- [ ] Mobile apps
- [ ] API marketplace
- [ ] Plugin system

---

**Built with ❤️ by the Government of Alberta**
