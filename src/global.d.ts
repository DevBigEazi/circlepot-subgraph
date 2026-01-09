/**
 * AssemblyScript global type declarations for The Graph subgraph development
 * This file provides type definitions for AssemblyScript built-in functions
 * that are not recognized by TypeScript but are valid in The Graph context.
 */

/**
 * AssemblyScript built-in function for type conversion
 * Converts a value from one type to another without runtime checks
 * @param value The value to convert
 * @returns The value converted to type T
 */
declare function changetype<T>(value: any): T;
