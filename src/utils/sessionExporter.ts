import JSZip from 'jszip';
import type { FreeAgentSession, BlackboardEntry, Artifact, NamedAttribute, Scratchpad } from '@/types/freeAgent';

export interface ExportOptions {
  includeBlackboard?: boolean;
  includeScratchpad?: boolean;
  includeArtifacts?: boolean;
  includeAttributes?: boolean;
  includeMetadata?: boolean;
  includeReflection?: boolean;
}

const DEFAULT_OPTIONS: ExportOptions = {
  includeBlackboard: true,
  includeScratchpad: true,
  includeArtifacts: true,
  includeAttributes: true,
  includeMetadata: true,
  includeReflection: true,
};

/**
 * Format blackboard entries as markdown
 */
function formatBlackboard(entries: BlackboardEntry[]): string {
  if (entries.length === 0) return '# Blackboard\n\nNo entries recorded.';

  let content = '# Blackboard\n\n';
  content += `Total entries: ${entries.length}\n\n`;

  const grouped = entries.reduce((acc, entry) => {
    if (!acc[entry.type]) acc[entry.type] = [];
    acc[entry.type].push(entry);
    return acc;
  }, {} as Record<string, BlackboardEntry[]>);

  for (const [type, typeEntries] of Object.entries(grouped)) {
    content += `## ${type.charAt(0).toUpperCase() + type.slice(1)}s (${typeEntries.length})\n\n`;
    
    for (const entry of typeEntries) {
      content += `### Iteration ${entry.iteration} - ${new Date(entry.timestamp).toLocaleString()}\n\n`;
      content += `${entry.content}\n\n`;
      if (entry.metadata && Object.keys(entry.metadata).length > 0) {
        content += `**Metadata:** \`${JSON.stringify(entry.metadata)}\`\n\n`;
      }
      content += '---\n\n';
    }
  }

  return content;
}

/**
 * Format scratchpad as markdown
 */
function formatScratchpad(scratchpad: Scratchpad | null): string {
  if (!scratchpad) return '# Scratchpad\n\nNo scratchpad content.';

  return `# Scratchpad

**Last Updated:** ${new Date(scratchpad.lastUpdated).toLocaleString()}
**Version:** ${scratchpad.version}

---

${scratchpad.content}
`;
}

/**
 * Format named attributes as markdown
 */
function formatAttributes(attributes: NamedAttribute[]): string {
  if (attributes.length === 0) return '# Named Attributes\n\nNo attributes stored.';

  let content = '# Named Attributes\n\n';
  content += `Total attributes: ${attributes.length}\n\n`;

  for (const attr of attributes) {
    content += `## ${attr.name}\n\n`;
    content += `- **Tool:** ${attr.toolName} (${attr.toolId})\n`;
    content += `- **Iteration:** ${attr.iteration}\n`;
    content += `- **Timestamp:** ${new Date(attr.timestamp).toLocaleString()}\n\n`;
    content += '**Value:**\n\n';
    content += '```json\n';
    content += JSON.stringify(attr.value, null, 2);
    content += '\n```\n\n';
    content += '---\n\n';
  }

  return content;
}

/**
 * Format session metadata as markdown
 */
function formatMetadata(session: FreeAgentSession): string {
  return `# Session Metadata

**Session ID:** ${session.id}
**Status:** ${session.status}
**Current Iteration:** ${session.currentIteration}
**Max Iterations:** ${session.config.maxIterations}

## Configuration

- **Model:** ${session.config.model.name} (${session.config.model.provider})
- **Timeout:** ${session.config.timeoutSeconds} seconds
- **Loop Detection Threshold:** ${session.config.loopDetectionThreshold}
- **Memory Persistence:** ${session.config.memoryPersistence}
- **Auto Start:** ${session.config.autoStart}

## Enabled Tools

${session.config.enabledTools.length > 0 ? session.config.enabledTools.map(t => `- ${t}`).join('\n') : 'No tools enabled'}

## System Prompt

\`\`\`
${session.config.systemPrompt}
\`\`\`

## Timing

- **Started:** ${session.startedAt ? new Date(session.startedAt).toLocaleString() : 'Not started'}
- **Completed:** ${session.completedAt ? new Date(session.completedAt).toLocaleString() : 'Not completed'}
- **Paused:** ${session.pausedAt ? new Date(session.pausedAt).toLocaleString() : 'Not paused'}

## Usage

- **Total Tokens Used:** ${session.totalTokensUsed.toLocaleString()}
- **Estimated Cost:** $${session.estimatedCost.toFixed(4)}

## Loop Detection

- **Is Looping:** ${session.loopDetection.isLooping}
- **Pattern Count:** ${session.loopDetection.patternCount}
- **Threshold:** ${session.loopDetection.loopThreshold}

${session.lastError ? `## Last Error\n\n\`\`\`\n${session.lastError}\n\`\`\`` : ''}
`;
}

/**
 * Generate a reflection/analysis of the session
 */
function generateReflection(session: FreeAgentSession): string {
  const observations = session.blackboard.filter(e => e.type === 'observation').length;
  const insights = session.blackboard.filter(e => e.type === 'insight').length;
  const decisions = session.blackboard.filter(e => e.type === 'decision').length;
  const errors = session.blackboard.filter(e => e.type === 'error').length;
  const plans = session.blackboard.filter(e => e.type === 'plan').length;

  return `# Session Reflection

## Summary

This Free Agent session ran for **${session.currentIteration}** iteration(s) and ended with status **${session.status}**.

## Activity Breakdown

| Category | Count |
|----------|-------|
| Observations | ${observations} |
| Insights | ${insights} |
| Decisions | ${decisions} |
| Plans | ${plans} |
| Errors | ${errors} |
| Artifacts Created | ${session.artifacts.length} |
| Attributes Stored | ${session.namedAttributes.length} |

## Key Metrics

- **Efficiency:** ${session.currentIteration > 0 ? ((session.artifacts.length / session.currentIteration) * 100).toFixed(1) : 0}% artifact creation rate
- **Token Usage:** ${session.totalTokensUsed.toLocaleString()} tokens over ${session.currentIteration} iterations
- **Avg Tokens/Iteration:** ${session.currentIteration > 0 ? Math.round(session.totalTokensUsed / session.currentIteration).toLocaleString() : 0}

## Timeline

${session.blackboard.slice(-10).map(entry => 
  `- **[${entry.type}]** Iteration ${entry.iteration}: ${entry.content.slice(0, 100)}${entry.content.length > 100 ? '...' : ''}`
).join('\n')}

${session.loopDetection.isLooping ? '\n## ⚠️ Loop Detected\n\nThe session detected repetitive behavior and may have stopped early.' : ''}

${session.lastError ? `\n## ❌ Error Occurred\n\n\`\`\`\n${session.lastError}\n\`\`\`` : ''}
`;
}

/**
 * Get file extension for artifact type
 */
function getArtifactExtension(artifact: Artifact): string {
  switch (artifact.type) {
    case 'code':
      return '.txt';
    case 'json':
      return '.json';
    case 'markdown':
      return '.md';
    case 'text':
      return '.txt';
    case 'image':
      return '.png';
    case 'file':
      return artifact.mimeType?.split('/')[1] || '.bin';
    default:
      return '.txt';
  }
}

/**
 * Sanitize filename for safe file system usage
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 100);
}

/**
 * Export a Free Agent session as a ZIP file
 */
export async function exportSession(
  session: FreeAgentSession,
  options: ExportOptions = DEFAULT_OPTIONS
): Promise<Blob> {
  const zip = new JSZip();
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sessionName = sanitizeFilename(session.config.systemPrompt.slice(0, 30)) || 'session';

  // Add README
  zip.file('README.md', `# Free Agent Session Export

**Exported:** ${new Date().toLocaleString()}
**Session ID:** ${session.id}
**Status:** ${session.status}

## Contents

${mergedOptions.includeMetadata ? '- `metadata.md` - Session configuration and statistics' : ''}
${mergedOptions.includeBlackboard ? '- `blackboard.md` - All observations, insights, decisions, and plans' : ''}
${mergedOptions.includeScratchpad ? '- `scratchpad.md` - Working memory content' : ''}
${mergedOptions.includeAttributes ? '- `attributes.md` - Named values stored by tools' : ''}
${mergedOptions.includeArtifacts ? '- `artifacts/` - Generated files and outputs' : ''}
${mergedOptions.includeReflection ? '- `reflection.md` - Session analysis and summary' : ''}
- \`session.json\` - Raw session data for reimport

## Reimporting

To reimport this session, use the \`session.json\` file with the Free Agent import feature.
`);

  // Add metadata
  if (mergedOptions.includeMetadata) {
    zip.file('metadata.md', formatMetadata(session));
  }

  // Add blackboard
  if (mergedOptions.includeBlackboard) {
    zip.file('blackboard.md', formatBlackboard(session.blackboard));
    // Also add as JSON for programmatic access
    zip.file('data/blackboard.json', JSON.stringify(session.blackboard, null, 2));
  }

  // Add scratchpad
  if (mergedOptions.includeScratchpad) {
    zip.file('scratchpad.md', formatScratchpad(session.scratchpad));
  }

  // Add attributes
  if (mergedOptions.includeAttributes) {
    zip.file('attributes.md', formatAttributes(session.namedAttributes));
    // Also add as JSON
    zip.file('data/attributes.json', JSON.stringify(session.namedAttributes, null, 2));
  }

  // Add artifacts
  if (mergedOptions.includeArtifacts && session.artifacts.length > 0) {
    const artifactsFolder = zip.folder('artifacts');
    
    for (const artifact of session.artifacts) {
      const filename = sanitizeFilename(artifact.name) + getArtifactExtension(artifact);
      
      if (artifact.type === 'image' && artifact.content.startsWith('data:')) {
        // Handle base64 images
        const base64Data = artifact.content.split(',')[1];
        artifactsFolder?.file(filename, base64Data, { base64: true });
      } else {
        artifactsFolder?.file(filename, artifact.content);
      }
    }

    // Add artifacts index
    const artifactsIndex = session.artifacts.map((a, i) => ({
      index: i + 1,
      name: a.name,
      type: a.type,
      iteration: a.iteration,
      createdAt: a.createdAt,
    }));
    zip.file('data/artifacts-index.json', JSON.stringify(artifactsIndex, null, 2));
  }

  // Add reflection
  if (mergedOptions.includeReflection) {
    zip.file('reflection.md', generateReflection(session));
  }

  // Add raw session data
  zip.file('session.json', JSON.stringify(session, null, 2));

  // Generate the ZIP blob
  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Download a session as a ZIP file
 */
export async function downloadSession(
  session: FreeAgentSession,
  options?: ExportOptions
): Promise<void> {
  const blob = await exportSession(session, options);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `free-agent-session-${timestamp}.zip`;

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download a single artifact
 */
export function downloadArtifact(artifact: Artifact): void {
  const filename = sanitizeFilename(artifact.name) + getArtifactExtension(artifact);
  
  let blob: Blob;
  
  if (artifact.type === 'image' && artifact.content.startsWith('data:')) {
    // Handle base64 images
    const base64Data = artifact.content.split(',')[1];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    blob = new Blob([bytes], { type: artifact.mimeType || 'image/png' });
  } else {
    const mimeType = artifact.type === 'json' 
      ? 'application/json' 
      : artifact.type === 'markdown' 
        ? 'text/markdown' 
        : 'text/plain';
    blob = new Blob([artifact.content], { type: mimeType });
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import a session from JSON
 */
export function importSession(jsonContent: string): FreeAgentSession | null {
  try {
    const session = JSON.parse(jsonContent) as FreeAgentSession;
    
    // Validate required fields
    if (!session.id || !session.config || !session.blackboard) {
      throw new Error('Invalid session format');
    }
    
    return session;
  } catch (error) {
    console.error('Failed to import session:', error);
    return null;
  }
}
