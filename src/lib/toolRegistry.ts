/**
 * Tool Registry - Central registry for all workflow tools
 * This provides a complete library/inventory system for tools
 */

import { toolDefinitions, getToolById, getToolsByIds } from "./toolDefinitions";
import type { ToolDefinition } from "./toolDefinitions";

export class ToolRegistry {
  /**
   * Get all available tools
   */
  static getAll(): ToolDefinition[] {
    return toolDefinitions;
  }

  /**
   * Get a tool by ID
   */
  static getById(id: string): ToolDefinition | undefined {
    return getToolById(id);
  }

  /**
   * Get tools by IDs
   */
  static getByIds(ids: string[]): ToolDefinition[] {
    return getToolsByIds(ids);
  }

  /**
   * Get tools that require configuration
   */
  static getConfigurable(): ToolDefinition[] {
    return toolDefinitions.filter(t => t.configurable);
  }

  /**
   * Get tools that require API keys
   */
  static getRequiringApiKey(): ToolDefinition[] {
    return toolDefinitions.filter(t => t.requiresApiKey);
  }

  /**
   * Search tools by query
   */
  static search(query: string): ToolDefinition[] {
    const lowerQuery = query.toLowerCase();
    return toolDefinitions.filter(
      t => 
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get tool count
   */
  static count(): number {
    return toolDefinitions.length;
  }
}
