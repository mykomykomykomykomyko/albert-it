

# Fix Image Analysis "Processing Forever" Hang

## Problem Summary
The Image Analysis feature hangs indefinitely when:
1. A second agent operates on top of initial analysis results
2. An agent transitions from document parsing to deep analytical reasoning

The hang occurs because agent-based prompts use the `run-agent` edge function which:
- Uses an experimental "thinking" model that can take extremely long for complex reasoning
- Has no client-side timeout mechanism
- Provides no progress feedback during long operations
- Can silently fail without surfacing errors to users

## Root Cause Analysis

```text
+------------------+     +-----------------------+     +---------------------------+
| Standard Prompt  | --> | gemini-process-images | --> | gemini-2.5-flash         |
| (works fine)     |     | (streaming, ~10s)     |     | (stable, fast)           |
+------------------+     +-----------------------+     +---------------------------+

+------------------+     +-----------------------+     +---------------------------+
| Agent Prompt     | --> | run-agent             | --> | gemini-2.0-flash-        |
| (hangs)          |     | (non-streaming)       |     | thinking-exp-01-21       |
+------------------+     +-----------------------+     | (experimental, very slow)|
                                                       +---------------------------+
```

**Key Issues:**
1. **Experimental Model**: `run-agent` uses `gemini-2.0-flash-thinking-exp-01-21` - an experimental thinking model designed for deep reasoning that can take 2-5+ minutes for complex analyses
2. **No Client Timeout**: Frontend fetch calls have no timeout - they wait indefinitely
3. **No Abort Capability**: Users cannot cancel a stuck analysis
4. **Silent Failures**: If the model times out server-side, no meaningful error reaches the user
5. **No Progress Indicator**: During long waits, users see only a spinning loader with no feedback

## Solution Overview

### 1. Add Client-Side Timeout with AbortController
Add a configurable timeout (120 seconds) to agent analysis requests with proper cleanup and user feedback.

### 2. Switch run-agent to Lovable AI Gateway
Replace the direct Gemini API call using experimental model with the stable Lovable AI Gateway using `google/gemini-3-flash-preview`.

### 3. Add Cancel Capability
Allow users to abort a stuck analysis with a "Cancel" button that appears during processing.

### 4. Improve Error Messaging
Surface meaningful timeout and error messages to users instead of silent hangs.

### 5. Add Progress Feedback
Show elapsed time during analysis so users know the request is still active.

## Implementation Plan

### Step 1: Update run-agent Edge Function
**File: `supabase/functions/run-agent/index.ts`**

Changes:
- Replace direct Gemini API call with Lovable AI Gateway
- Use `google/gemini-3-flash-preview` instead of experimental thinking model
- Add better logging for debugging
- Reduce timeout from 60s to 45s for AI generation (gateway handles retries)

### Step 2: Add Client-Side Request Timeout  
**File: `src/pages/ImageAnalysis.tsx`**

Changes:
- Create an AbortController for each analysis request
- Set 120-second timeout for agent-based requests
- Store abort controller in state to enable cancel functionality
- Clear timeout on completion or unmount

### Step 3: Add Cancel Analysis Button
**File: `src/pages/ImageAnalysis.tsx`**

Changes:
- Add "Cancel" button that appears during analysis
- Wire button to abort controller
- Update results status to "cancelled" when aborted
- Show toast notification on cancellation

### Step 4: Add Elapsed Time Display
**File: `src/pages/ImageAnalysis.tsx`**

Changes:
- Track start time when analysis begins
- Update elapsed time display every second during processing
- Show "Analyzing... (45s)" feedback to users

### Step 5: Improve Error Handling
**File: `src/pages/ImageAnalysis.tsx`**

Changes:
- Catch AbortError and show "Analysis cancelled" or "Analysis timed out" message
- Update result status to 'error' with meaningful message
- Remove orphaned "processing" results on timeout

## Technical Details

### Updated run-agent Implementation (Key Changes)

```typescript
// BEFORE: Direct Gemini API with experimental model
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-thinking-exp-01-21:generateContent?key=${GEMINI_API_KEY}`,
  { ... }
);

// AFTER: Lovable AI Gateway with stable model
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const response = await fetch(
  "https://ai.gateway.lovable.dev/v1/chat/completions",
  {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: enhancedSystemPrompt },
        { role: "user", content: userParts }
      ],
      // No streaming for simpler response handling
    }),
  }
);
```

### Client-Side Timeout Pattern

```typescript
// Create abort controller with timeout
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes

try {
  const response = await fetch(url, {
    ...options,
    signal: controller.signal
  });
  clearTimeout(timeoutId);
  // handle response
} catch (error) {
  clearTimeout(timeoutId);
  if (error.name === 'AbortError') {
    // Handle timeout or user cancellation
    toast.error('Analysis timed out. Please try with fewer images or simpler prompts.');
  }
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/run-agent/index.ts` | Switch to Lovable AI Gateway, use stable model |
| `src/pages/ImageAnalysis.tsx` | Add timeout, cancel button, elapsed time, better errors |

## Expected Outcomes

1. **No more indefinite hangs** - requests timeout after 2 minutes with clear feedback
2. **Users can cancel** - stuck analyses can be aborted manually  
3. **Faster responses** - stable model is faster than experimental thinking model
4. **Clear feedback** - elapsed time display shows request is active
5. **Meaningful errors** - timeout/failure messages help users understand what happened

## Risk Considerations

- **Model capability**: `gemini-3-flash-preview` is highly capable but may produce slightly different output style than the "thinking" model for complex reasoning tasks
- **Timeout duration**: 2-minute client timeout should cover most cases; very large documents may still timeout
- **Backward compatibility**: No breaking changes to existing functionality

