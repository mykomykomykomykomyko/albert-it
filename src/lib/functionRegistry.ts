/**
 * Function Registry - Central registry for all workflow functions
 * This provides a complete library/inventory system for functions similar to agents
 */

import { functionDefinitions } from "./functionDefinitions";
import type { FunctionDefinition } from "@/types/functions";

export class FunctionRegistry {
  /**
   * Get all available functions
   */
  static getAll(): FunctionDefinition[] {
    return functionDefinitions;
  }

  /**
   * Get a function by ID
   */
  static getById(id: string): FunctionDefinition | undefined {
    return functionDefinitions.find(f => f.id === id);
  }

  /**
   * Get functions by category
   */
  static getByCategory(category: string): FunctionDefinition[] {
    return functionDefinitions.filter(f => f.category === category);
  }

  /**
   * Get all unique categories
   */
  static getCategories(): string[] {
    return [...new Set(functionDefinitions.map(f => f.category))];
  }

  /**
   * Search functions by query
   */
  static search(query: string): FunctionDefinition[] {
    const lowerQuery = query.toLowerCase();
    return functionDefinitions.filter(
      f => 
        f.name.toLowerCase().includes(lowerQuery) ||
        f.description.toLowerCase().includes(lowerQuery) ||
        f.category.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Filter functions by category and search query
   */
  static filter(category?: string, searchQuery?: string): FunctionDefinition[] {
    let functions = functionDefinitions;

    if (category && category !== "all") {
      functions = functions.filter(f => f.category === category);
    }

    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      functions = functions.filter(
        f =>
          f.name.toLowerCase().includes(query) ||
          f.description.toLowerCase().includes(query) ||
          f.category.toLowerCase().includes(query)
      );
    }

    return functions;
  }

  /**
   * Get function count
   */
  static count(): number {
    return functionDefinitions.length;
  }

  /**
   * Get function count by category
   */
  static countByCategory(category: string): number {
    return functionDefinitions.filter(f => f.category === category).length;
  }
}
