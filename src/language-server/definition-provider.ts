/**
 * LookML Definition Provider
 *
 * Provides go-to-definition functionality for LookML references.
 * Allows users to navigate to view definitions, field definitions,
 * and other LookML constructs.
 */

import { Location, Position } from "vscode-languageserver/node";
import { URI } from "vscode-uri";
import { LookMLWorkspace } from "./workspace";

/**
 * Provides go-to-definition functionality
 */
export class LookMLDefinitionProvider {
  private workspace: LookMLWorkspace;

  constructor(workspace: LookMLWorkspace) {
    this.workspace = workspace;
  }

  /**
   * Get definition location for a symbol at the given position
   */
  async getDefinition(uri: string, position: Position): Promise<Location[]> {
    const document = this.workspace.getDocument(uri);
    if (!document || !document.content) {
      return [];
    }

    // Get the word at the current position
    const reference = this.getWordAtPosition(document.content, position);
    if (!reference) {
      return [];
    }

    // Try to find the definition
    const definitions: Location[] = [];

    // Check for view references
    const viewDef = this.workspace.findView(reference);
    if (viewDef) {
      definitions.push({
        uri: viewDef.uri,
        range: {
          start: { line: viewDef.startLine, character: viewDef.startChar },
          end: { line: viewDef.endLine, character: viewDef.endChar },
        },
      });
    }

    // Check for explore references
    const exploreDef = this.workspace.findExplore(reference);
    if (exploreDef) {
      definitions.push({
        uri: exploreDef.uri,
        range: {
          start: {
            line: exploreDef.startLine,
            character: exploreDef.startChar,
          },
          end: { line: exploreDef.endLine, character: exploreDef.endChar },
        },
      });
    }

    // Check for field references within the current context
    const fieldDefs = this.findFieldDefinitions(
      document.content,
      position,
      reference
    );
    definitions.push(...fieldDefs);

    return definitions;
  }

  /**
   * Get the word at a specific position
   */
  private getWordAtPosition(
    content: string,
    position: Position
  ): string | null {
    const lines = content.split("\n");
    const line = lines[position.line];
    if (!line) return null;

    // Find word boundaries
    let start = position.character;
    let end = position.character;

    // Expand backwards
    while (start > 0 && this.isWordCharacter(line[start - 1])) {
      start--;
    }

    // Expand forwards
    while (end < line.length && this.isWordCharacter(line[end])) {
      end++;
    }

    if (start === end) return null;
    return line.substring(start, end);
  }

  /**
   * Check if a character is part of a word (includes dots for field references)
   */
  private isWordCharacter(char: string): boolean {
    return /[a-zA-Z0-9_.]/.test(char);
  }

  /**
   * Find field definitions based on context
   */
  private findFieldDefinitions(
    content: string,
    position: Position,
    reference: string
  ): Location[] {
    const definitions: Location[] = [];

    // Parse field references like ${view.field} or view.field
    const fieldRefMatch = reference.match(/^(\w+)\.(\w+)$/);
    if (fieldRefMatch) {
      const [, viewName, fieldName] = fieldRefMatch;
      const viewDef = this.workspace.findView(viewName);

      if (viewDef && "node" in viewDef) {
        const viewNode = viewDef.node;
        if ("dimensions" in viewNode) {
          // Check dimensions
          const dimension = viewNode.dimensions[fieldName];
          if (dimension) {
            definitions.push({
              uri: viewDef.uri,
              range: {
                start: {
                  line: dimension.position.startLine,
                  character: dimension.position.startChar,
                },
                end: {
                  line: dimension.position.endLine,
                  character: dimension.position.endChar,
                },
              },
            });
          }

          // Check measures
          const measure = viewNode.measures[fieldName];
          if (measure) {
            definitions.push({
              uri: viewDef.uri,
              range: {
                start: {
                  line: measure.position.startLine,
                  character: measure.position.startChar,
                },
                end: {
                  line: measure.position.endLine,
                  character: measure.position.endChar,
                },
              },
            });
          }

          // Check filters
          const filter = viewNode.filters[fieldName];
          if (filter) {
            definitions.push({
              uri: viewDef.uri,
              range: {
                start: {
                  line: filter.position.startLine,
                  character: filter.position.startChar,
                },
                end: {
                  line: filter.position.endLine,
                  character: filter.position.endChar,
                },
              },
            });
          }

          // Check parameters
          const parameter = viewNode.parameterNodes[fieldName];
          if (parameter) {
            definitions.push({
              uri: viewDef.uri,
              range: {
                start: {
                  line: parameter.position.startLine,
                  character: parameter.position.startChar,
                },
                end: {
                  line: parameter.position.endLine,
                  character: parameter.position.endChar,
                },
              },
            });
          }

          // Check dimension groups
          const dimensionGroup = viewNode.dimensionGroups[fieldName];
          if (dimensionGroup) {
            definitions.push({
              uri: viewDef.uri,
              range: {
                start: {
                  line: dimensionGroup.position.startLine,
                  character: dimensionGroup.position.startChar,
                },
                end: {
                  line: dimensionGroup.position.endLine,
                  character: dimensionGroup.position.endChar,
                },
              },
            });
          }
        }
      }
    } else {
      // Simple field reference within current view context
      const currentViewContext = this.getCurrentViewContext(content, position);
      if (currentViewContext) {
        const viewDef = this.workspace.findView(currentViewContext);
        if (viewDef && "node" in viewDef) {
          const viewNode = viewDef.node;
          if ("dimensions" in viewNode) {
            // Search all field types
            const allFields = [
              ...Object.entries(viewNode.dimensions),
              ...Object.entries(viewNode.measures),
              ...Object.entries(viewNode.filters),
              ...Object.entries(viewNode.parameterNodes),
              ...Object.entries(viewNode.dimensionGroups),
            ];

            for (const [fieldName, fieldNode] of allFields) {
              if (fieldName === reference) {
                definitions.push({
                  uri: viewDef.uri,
                  range: {
                    start: {
                      line: fieldNode.position.startLine,
                      character: fieldNode.position.startChar,
                    },
                    end: {
                      line: fieldNode.position.endLine,
                      character: fieldNode.position.endChar,
                    },
                  },
                });
              }
            }
          }
        }
      }
    }

    return definitions;
  }

  /**
   * Get the current view context from the document
   */
  private getCurrentViewContext(
    content: string,
    position: Position
  ): string | null {
    const lines = content.split("\n");

    // Look backwards from current position to find the containing view
    for (let i = position.line; i >= 0; i--) {
      const line = lines[i];
      const viewMatch = line.match(/^\s*view:\s*(\w+)\s*{/);
      if (viewMatch) {
        return viewMatch[1];
      }

      // If we hit another top-level construct, stop looking
      if (line.match(/^\s*(explore|model|dashboard):/)) {
        break;
      }
    }

    return null;
  }
}
