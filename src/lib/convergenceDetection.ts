/**
 * Convergence detection utilities for loop exit conditions
 */

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity ratio between two strings (0-1 scale)
 */
export function calculateStringSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  if (text1 === text2) return 1;

  const distance = levenshteinDistance(text1, text2);
  const maxLength = Math.max(text1.length, text2.length);
  
  if (maxLength === 0) return 1;
  
  return 1 - (distance / maxLength);
}

/**
 * Check if outputs have converged based on string similarity
 */
export function hasConverged(
  history: string[],
  threshold: number = 0.95,
  windowSize: number = 3
): boolean {
  if (history.length < windowSize + 1) return false;

  // Compare last output with previous N outputs
  const lastOutput = history[history.length - 1];
  const previousOutputs = history.slice(-windowSize - 1, -1);

  // Calculate average similarity
  const similarities = previousOutputs.map(output => 
    calculateStringSimilarity(lastOutput, output)
  );
  
  const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;

  return avgSimilarity >= threshold;
}

/**
 * Detect if outputs are oscillating between states
 */
export function isOscillating(history: string[], windowSize: number = 4): boolean {
  if (history.length < windowSize) return false;

  const recentOutputs = history.slice(-windowSize);
  
  // Check if outputs alternate between similar states
  for (let i = 0; i < recentOutputs.length - 2; i++) {
    const similarity1 = calculateStringSimilarity(recentOutputs[i], recentOutputs[i + 2]);
    if (similarity1 > 0.9) {
      // Found alternating pattern
      return true;
    }
  }

  return false;
}

/**
 * Calculate rate of change in outputs
 */
export function calculateChangeRate(history: string[]): number {
  if (history.length < 2) return 1;

  const lastTwo = history.slice(-2);
  return 1 - calculateStringSimilarity(lastTwo[0], lastTwo[1]);
}

/**
 * Detect numeric convergence for data pipelines
 */
export function hasNumericConverged(
  values: number[],
  threshold: number = 0.001,
  windowSize: number = 3
): boolean {
  if (values.length < windowSize + 1) return false;

  const recentValues = values.slice(-windowSize - 1);
  const lastValue = recentValues[recentValues.length - 1];

  // Check if all recent values are within threshold of last value
  for (let i = 0; i < recentValues.length - 1; i++) {
    const diff = Math.abs(recentValues[i] - lastValue);
    if (diff > threshold) {
      return false;
    }
  }

  return true;
}

/**
 * Extract numeric value from text output
 */
export function extractNumericValue(text: string): number | null {
  // Try to find numbers in the text
  const matches = text.match(/-?\d+\.?\d*/g);
  if (!matches || matches.length === 0) return null;

  // Return the last number found (often the most relevant)
  return parseFloat(matches[matches.length - 1]);
}

/**
 * Comprehensive convergence check
 */
export function checkConvergence(
  history: string[],
  convergenceThreshold: number = 0.95,
  windowSize: number = 3
): {
  converged: boolean;
  oscillating: boolean;
  changeRate: number;
  similarity: number;
} {
  const converged = hasConverged(history, convergenceThreshold, windowSize);
  const oscillating = isOscillating(history, windowSize);
  const changeRate = calculateChangeRate(history);
  
  let similarity = 0;
  if (history.length >= 2) {
    const lastTwo = history.slice(-2);
    similarity = calculateStringSimilarity(lastTwo[0], lastTwo[1]);
  }

  return {
    converged,
    oscillating,
    changeRate,
    similarity,
  };
}
