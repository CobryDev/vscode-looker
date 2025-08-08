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

    // Use pre-analyzed symbol index from semantic model
    const symbolsInFile = this.workspace.semanticModel.symbolsByUri.get(uri);
    if (!symbolsInFile) return [];

    // Find the symbol whose declaration range contains the position
    const match = symbolsInFile.find((s) =>
      this.isPositionInRange(position, s.declaration.position)
    );
    if (!match) return [];

    const decl = match.declaration;
    return [
      {
        uri: decl.uri,
        range: {
          start: {
            line: decl.position.startLine,
            character: decl.position.startChar,
          },
          end: {
            line: decl.position.endLine,
            character: decl.position.endChar,
          },
        },
      },
    ];
  }

  /**
   * Get the word at a specific position
   */
  private isPositionInRange(
    position: Position,
    range: {
      startLine: number;
      startChar: number;
      endLine: number;
      endChar: number;
    }
  ): boolean {
    if (position.line < range.startLine || position.line > range.endLine) {
      return false;
    }
    if (
      position.line === range.startLine &&
      position.character < range.startChar
    ) {
      return false;
    }
    if (position.line === range.endLine && position.character > range.endChar) {
      return false;
    }
    return true;
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
  // Field-specific resolution now handled by semantic model selection above

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
