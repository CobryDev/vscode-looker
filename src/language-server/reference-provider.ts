/**
 * LookML Reference Provider
 *
 * Provides find references functionality to locate all usages of
 * a specific LookML symbol across the workspace.
 */

import {
  Location,
  Position,
  ReferenceContext,
} from "vscode-languageserver/node";
import { LookMLWorkspace } from "./workspace";

/**
 * Provides find references functionality
 */
export class LookMLReferenceProvider {
  private workspace: LookMLWorkspace;

  constructor(workspace: LookMLWorkspace) {
    this.workspace = workspace;
  }

  /**
   * Find all references to a symbol at the given position
   */
  async getReferences(
    uri: string,
    position: Position,
    context: ReferenceContext
  ): Promise<Location[]> {
    const document = this.workspace.getDocument(uri);
    if (!document || !document.content) {
      return [];
    }

    // Get the symbol at the current position
    const symbol = this.workspace.getSymbolAt(
      uri,
      position.line,
      position.character
    );
    if (!symbol) {
      return [];
    }

    // Find all references to this symbol
    const references: Location[] = [];

    if (context.includeDeclaration) {
      // Include the declaration itself
      references.push({
        uri: symbol.uri,
        range: {
          start: { line: symbol.startLine, character: symbol.startChar },
          end: { line: symbol.endLine, character: symbol.endChar },
        },
      });
    }

    // Find references based on symbol type
    switch (symbol.type) {
      case "view":
        references.push(...this.findViewReferences(symbol.name));
        break;
      case "explore":
        references.push(...this.findExploreReferences(symbol.name));
        break;
      case "dimension":
      case "measure":
      case "filter":
      case "parameter":
      case "dimension_group":
        references.push(...this.findFieldReferences(symbol.name, symbol.type));
        break;
      default:
        // Generic symbol search
        references.push(...this.findGenericReferences(symbol.name));
    }

    return references;
  }

  /**
   * Find all references to a view
   */
  private findViewReferences(viewName: string): Location[] {
    const references: Location[] = [];

    // Search in all documents
    for (const document of this.workspace.getAllDocuments()) {
      if (!document.content || !document.ast) continue;

      // Find view references in explores (base view and joins)
      for (const explore of Object.values(document.ast.explores)) {
        // Check base view
        if (explore.baseView === viewName) {
          references.push(
            this.createLocationFromText(
              document.uri,
              document.content,
              viewName
            )
          );
        }

        // Check joins
        for (const join of Object.values(explore.joins)) {
          if (join.view === viewName) {
            references.push({
              uri: document.uri,
              range: {
                start: {
                  line: join.position.startLine,
                  character: join.position.startChar,
                },
                end: {
                  line: join.position.endLine,
                  character: join.position.endChar,
                },
              },
            });
          }
        }
      }

      // Find references in SQL expressions (${view.field})
      references.push(...this.findSqlReferences(document, viewName));
    }

    return references;
  }

  /**
   * Find all references to an explore
   */
  private findExploreReferences(exploreName: string): Location[] {
    const references: Location[] = [];

    // Search in all documents for explore references
    for (const document of this.workspace.getAllDocuments()) {
      if (!document.content) continue;

      // Find text references to the explore
      const textRefs = this.findTextReferences(document, exploreName);
      references.push(...textRefs);
    }

    return references;
  }

  /**
   * Find all references to a field (dimension, measure, etc.)
   */
  private findFieldReferences(
    fieldName: string,
    fieldType: string
  ): Location[] {
    const references: Location[] = [];

    // Find the view that contains this field
    const fieldSymbol = this.workspace
      .findSymbols(fieldName)
      .find((s) => s.type === fieldType);
    if (!fieldSymbol) return references;

    // Get the view name that contains this field
    const viewName = this.getViewNameFromFieldSymbol(fieldSymbol);
    if (!viewName) return references;

    // Search for references to viewName.fieldName
    for (const document of this.workspace.getAllDocuments()) {
      if (!document.content) continue;

      // Find references in SQL expressions
      const sqlRefs = this.findSqlReferences(document, viewName, fieldName);
      references.push(...sqlRefs);

      // Find references in drill_fields and other field lists
      const fieldListRefs = this.findFieldListReferences(document, fieldName);
      references.push(...fieldListRefs);
    }

    return references;
  }

  /**
   * Find generic references to a symbol name
   */
  private findGenericReferences(symbolName: string): Location[] {
    const references: Location[] = [];

    for (const document of this.workspace.getAllDocuments()) {
      if (!document.content) continue;

      const textRefs = this.findTextReferences(document, symbolName);
      references.push(...textRefs);
    }

    return references;
  }

  /**
   * Find SQL references like ${view.field}
   */
  private findSqlReferences(
    document: any,
    viewName: string,
    fieldName?: string
  ): Location[] {
    const references: Location[] = [];
    const content = document.content;
    const lines = content.split("\n");

    const pattern = fieldName
      ? new RegExp(`\\$\\{\\s*${viewName}\\.${fieldName}\\s*\\}`, "g")
      : new RegExp(`\\$\\{\\s*${viewName}\\.[\\w.]+\\s*\\}`, "g");

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      let match;

      while ((match = pattern.exec(line)) !== null) {
        references.push({
          uri: document.uri,
          range: {
            start: { line: lineIndex, character: match.index },
            end: { line: lineIndex, character: match.index + match[0].length },
          },
        });
      }
    }

    return references;
  }

  /**
   * Find references in field lists like drill_fields
   */
  private findFieldListReferences(
    document: any,
    fieldName: string
  ): Location[] {
    const references: Location[] = [];
    const content = document.content;
    const lines = content.split("\n");

    // Look for field names in arrays like [field1, field2]
    const pattern = new RegExp(`\\b${fieldName}\\b`, "g");

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      // Only look in lines that appear to be field lists
      if (
        line.includes("[") ||
        line.includes("drill_fields") ||
        line.includes("timeframes")
      ) {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          references.push({
            uri: document.uri,
            range: {
              start: { line: lineIndex, character: match.index },
              end: {
                line: lineIndex,
                character: match.index + match[0].length,
              },
            },
          });
        }
      }
    }

    return references;
  }

  /**
   * Find text references to a symbol
   */
  private findTextReferences(document: any, symbolName: string): Location[] {
    const references: Location[] = [];
    const content = document.content;
    const lines = content.split("\n");

    const pattern = new RegExp(`\\b${symbolName}\\b`, "g");

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      let match;

      while ((match = pattern.exec(line)) !== null) {
        references.push({
          uri: document.uri,
          range: {
            start: { line: lineIndex, character: match.index },
            end: { line: lineIndex, character: match.index + match[0].length },
          },
        });
      }
    }

    return references;
  }

  /**
   * Create a location from text search
   */
  private createLocationFromText(
    uri: string,
    content: string,
    searchText: string
  ): Location {
    const lines = content.split("\n");

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const index = line.indexOf(searchText);

      if (index !== -1) {
        return {
          uri,
          range: {
            start: { line: lineIndex, character: index },
            end: { line: lineIndex, character: index + searchText.length },
          },
        };
      }
    }

    // Fallback location
    return {
      uri,
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      },
    };
  }

  /**
   * Get the view name that contains a field symbol
   */
  private getViewNameFromFieldSymbol(fieldSymbol: any): string | null {
    // Find the view that contains this field by looking at the document's AST
    const document = this.workspace.getDocument(fieldSymbol.uri);
    if (!document || !document.ast) return null;

    for (const [viewName, viewNode] of Object.entries(document.ast.views)) {
      const allFields = [
        ...Object.keys(viewNode.dimensions),
        ...Object.keys(viewNode.measures),
        ...Object.keys(viewNode.filters),
        ...Object.keys(viewNode.parameterNodes),
        ...Object.keys(viewNode.dimensionGroups),
      ];

      if (allFields.includes(fieldSymbol.name)) {
        return viewName;
      }
    }

    return null;
  }
}
