import type { LoopExitCondition, LoopMetadata } from "@/types/workflow";
import { hasConverged, extractNumericValue, checkConvergence } from "./convergenceDetection";

/**
 * Evaluate break conditions for loops
 */
export class BreakConditionEvaluator {
  /**
   * Check if any exit condition is met
   */
  static shouldExitLoop(
    loopMetadata: LoopMetadata,
    currentOutput: string
  ): { shouldExit: boolean; reason: string } {
    // Check timeout first
    if (loopMetadata.timeoutMs) {
      const elapsed = Date.now() - loopMetadata.startTime;
      if (elapsed > loopMetadata.timeoutMs) {
        return {
          shouldExit: true,
          reason: `Loop timeout reached (${Math.round(elapsed / 1000)}s)`,
        };
      }
    }

    // Check max iterations
    if (loopMetadata.currentIteration >= loopMetadata.maxIterations) {
      return {
        shouldExit: true,
        reason: `Max iterations reached (${loopMetadata.maxIterations})`,
      };
    }

    // Check each exit condition
    for (const condition of loopMetadata.exitConditions) {
      const result = this.evaluateCondition(condition, loopMetadata, currentOutput);
      if (result.shouldExit) {
        return result;
      }
    }

    return { shouldExit: false, reason: "" };
  }

  /**
   * Evaluate a single exit condition
   */
  private static evaluateCondition(
    condition: LoopExitCondition,
    loopMetadata: LoopMetadata,
    currentOutput: string
  ): { shouldExit: boolean; reason: string } {
    switch (condition.type) {
      case "max_iterations":
        // Already checked in shouldExitLoop
        return { shouldExit: false, reason: "" };

      case "convergence": {
        const threshold = condition.threshold || 0.95;
        const convergenceResult = checkConvergence(
          [...loopMetadata.history, currentOutput],
          threshold
        );

        if (convergenceResult.converged) {
          return {
            shouldExit: true,
            reason: `Output converged (similarity: ${(convergenceResult.similarity * 100).toFixed(1)}%)`,
          };
        }

        // Also exit if oscillating to prevent infinite loops
        if (convergenceResult.oscillating) {
          return {
            shouldExit: true,
            reason: "Output is oscillating between states",
          };
        }

        return { shouldExit: false, reason: "" };
      }

      case "value_equals": {
        if (condition.value === undefined) {
          return { shouldExit: false, reason: "" };
        }

        const targetValue = String(condition.value).toLowerCase().trim();
        const outputValue = currentOutput.toLowerCase().trim();

        // Check exact match
        if (outputValue === targetValue) {
          return {
            shouldExit: true,
            reason: `Output matches target value: "${condition.value}"`,
          };
        }

        // Check if output contains the target value
        if (outputValue.includes(targetValue)) {
          return {
            shouldExit: true,
            reason: `Output contains target value: "${condition.value}"`,
          };
        }

        return { shouldExit: false, reason: "" };
      }

      case "custom": {
        // Custom condition evaluation using simple expression matching
        if (!condition.value) {
          return { shouldExit: false, reason: "" };
        }

        try {
          const result = this.evaluateCustomCondition(
            condition.value,
            currentOutput,
            loopMetadata
          );
          if (result) {
            return {
              shouldExit: true,
              reason: `Custom condition met: ${condition.value}`,
            };
          }
        } catch (error) {
          console.error("Error evaluating custom condition:", error);
        }

        return { shouldExit: false, reason: "" };
      }

      default:
        return { shouldExit: false, reason: "" };
    }
  }

  /**
   * Evaluate custom condition expressions
   * Supports simple comparisons like:
   * - "length > 100"
   * - "contains 'success'"
   * - "iteration > 5"
   */
  private static evaluateCustomCondition(
    expression: string,
    output: string,
    loopMetadata: LoopMetadata
  ): boolean {
    const expr = expression.toLowerCase().trim();

    // Check for "contains" condition
    if (expr.includes("contains")) {
      const match = expr.match(/contains\s+['"](.+?)['"]/);
      if (match) {
        return output.toLowerCase().includes(match[1].toLowerCase());
      }
    }

    // Check for "length" condition
    if (expr.includes("length")) {
      const match = expr.match(/length\s*([><=]+)\s*(\d+)/);
      if (match) {
        const operator = match[1];
        const threshold = parseInt(match[2]);
        return this.compareNumbers(output.length, operator, threshold);
      }
    }

    // Check for "iteration" condition
    if (expr.includes("iteration")) {
      const match = expr.match(/iteration\s*([><=]+)\s*(\d+)/);
      if (match) {
        const operator = match[1];
        const threshold = parseInt(match[2]);
        return this.compareNumbers(loopMetadata.currentIteration, operator, threshold);
      }
    }

    // Check for numeric value condition
    const numericValue = extractNumericValue(output);
    if (numericValue !== null) {
      const match = expr.match(/value\s*([><=]+)\s*(\d+\.?\d*)/);
      if (match) {
        const operator = match[1];
        const threshold = parseFloat(match[2]);
        return this.compareNumbers(numericValue, operator, threshold);
      }
    }

    return false;
  }

  /**
   * Compare numbers with operator
   */
  private static compareNumbers(
    value: number,
    operator: string,
    threshold: number
  ): boolean {
    switch (operator) {
      case ">":
        return value > threshold;
      case ">=":
        return value >= threshold;
      case "<":
        return value < threshold;
      case "<=":
        return value <= threshold;
      case "==":
      case "=":
        return value === threshold;
      default:
        return false;
    }
  }

  /**
   * Get estimated remaining iterations
   */
  static getEstimatedRemainingIterations(
    loopMetadata: LoopMetadata
  ): number | null {
    const remaining = loopMetadata.maxIterations - loopMetadata.currentIteration;
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Get estimated remaining time based on average iteration time
   */
  static getEstimatedRemainingTime(loopMetadata: LoopMetadata): number | null {
    if (loopMetadata.currentIteration === 0) return null;

    const elapsed = Date.now() - loopMetadata.startTime;
    const avgIterationTime = elapsed / loopMetadata.currentIteration;
    const remainingIterations = this.getEstimatedRemainingIterations(loopMetadata);

    if (remainingIterations === null) return null;

    return avgIterationTime * remainingIterations;
  }
}
