/**
 * Parse Microsoft Teams VTT (WebVTT) transcript files
 */

export interface TranscriptSegment {
  speaker: string;
  timestamp: string;
  text: string;
}

export interface ParsedTranscript {
  segments: TranscriptSegment[];
  speakers: string[];
  duration: string;
  fullText: string;
}

/**
 * Parse VTT file content into structured data
 */
export const parseVTT = (vttContent: string): ParsedTranscript => {
  const lines = vttContent.split('\n');
  const segments: TranscriptSegment[] = [];
  const speakersSet = new Set<string>();
  
  let currentSpeaker = '';
  let currentTimestamp = '';
  let currentText = '';
  let lastTimestamp = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip WEBVTT header and empty lines
    if (line.startsWith('WEBVTT') || line === '') {
      continue;
    }

    // Parse timestamp line (e.g., "00:00:05.000 --> 00:00:08.000")
    if (line.includes('-->')) {
      const [start] = line.split('-->').map(s => s.trim());
      currentTimestamp = start;
      lastTimestamp = start;
      continue;
    }

    // Parse speaker and text line (e.g., "<v John Smith>Welcome everyone")
    const speakerMatch = line.match(/<v ([^>]+)>(.+)/);
    if (speakerMatch) {
      currentSpeaker = speakerMatch[1].trim();
      currentText = speakerMatch[2].trim();
      speakersSet.add(currentSpeaker);
      
      segments.push({
        speaker: currentSpeaker,
        timestamp: currentTimestamp,
        text: currentText
      });
    } else if (line && !line.includes('-->')) {
      // Continuation of previous text
      if (segments.length > 0) {
        segments[segments.length - 1].text += ' ' + line;
      }
    }
  }

  const fullText = segments.map(s => `${s.speaker}: ${s.text}`).join('\n');

  return {
    segments,
    speakers: Array.from(speakersSet),
    duration: lastTimestamp,
    fullText
  };
};

/**
 * Clean and format plain text transcripts
 */
export const parseTextTranscript = (textContent: string): ParsedTranscript => {
  const lines = textContent.split('\n').filter(l => l.trim());
  const segments: TranscriptSegment[] = [];
  const speakersSet = new Set<string>();

  lines.forEach(line => {
    // Try to match "Speaker Name: Text" format
    const match = line.match(/^([^:]+):\s*(.+)/);
    if (match) {
      const speaker = match[1].trim();
      const text = match[2].trim();
      speakersSet.add(speaker);
      segments.push({
        speaker,
        timestamp: '',
        text
      });
    } else if (segments.length > 0) {
      // Append to last segment
      segments[segments.length - 1].text += ' ' + line.trim();
    }
  });

  return {
    segments,
    speakers: Array.from(speakersSet),
    duration: '',
    fullText: textContent
  };
};

/**
 * Extract action items from transcript text using pattern matching
 */
export const extractActionItemsFromText = (text: string): string[] => {
  const actionPatterns = [
    /(?:action item|todo|to do|task):\s*(.+?)(?:\.|$)/gi,
    /(?:will|need to|should|must)\s+(.+?)(?:\.|$)/gi,
    /(?:assigned to|responsible for)\s+(.+?)(?:\.|$)/gi,
  ];

  const items = new Set<string>();
  
  actionPatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const item = match[1]?.trim();
      if (item && item.length > 10 && item.length < 200) {
        items.add(item);
      }
    }
  });

  return Array.from(items);
};
