import * as vscode from "vscode";
import { LookML, LookmlView } from "../workspace-tools/parse-lookml";

export interface ViewReferenceContext {
  isInContext: boolean;
  viewName?: string;
}

export interface LookmlContext {
  inBlock: boolean;
  blockType?: string; // e.g., 'view', 'dimension'
  blockName?: string; // e.g., 'orders', 'customers'
  parentContext?: LookmlContext; // For nested blocks
}

/**
 * Service responsible for LookML language-specific operations like context detection
 */
export class LookmlLanguageService {
  private lookmlInstance?: LookML;

  /**
   * Sets the LookML parser instance to use for robust context detection
   */
  public setLookmlInstance(lookml: LookML): void {
    this.lookmlInstance = lookml;
  }
  /**
   * Determines if the cursor is in a context where a view reference is expected
   * @param document The text document
   * @param position The cursor position
   * @returns Context information including whether it's in view reference context and the view name
   */
  public isInViewReferenceContext(
    document: vscode.TextDocument,
    position: vscode.Position
  ): ViewReferenceContext {
    const lineText = document.lineAt(position).text;
    const textBeforeCursor = lineText.substring(0, position.character);

    // Look for ${view_name. pattern
    const dollarBraceMatch = textBeforeCursor.match(/\$\{([^}]*?)\.?$/);
    if (dollarBraceMatch) {
      const content = dollarBraceMatch[1];
      if (content && !content.includes(".")) {
        // This is a view name context like ${view_name.
        return { isInContext: true, viewName: content };
      }
    }

    return { isInContext: false };
  }

  /**
   * Determines if the cursor is in a context where a view name should be suggested
   * @param document The text document
   * @param position The cursor position
   * @returns True if in view name context
   */
  public isInViewNameContext(
    document: vscode.TextDocument,
    position: vscode.Position
  ): boolean {
    const lineText = document.lineAt(position).text;
    const textBeforeCursor = lineText.substring(0, position.character);

    // Check if we're in a ${... context but haven't typed the view name yet
    return textBeforeCursor.match(/\$\{[^}]*$/) !== null;
  }

  /**
   * Analyzes the position to determine the current LookML block context using parsed data.
   * This is a robust approach that leverages the lookml-parser's positional information.
   */
  public getLookmlContext(
    document: vscode.TextDocument,
    position: vscode.Position
  ): LookmlContext {
    // Use parser-based context detection
    if (this.lookmlInstance) {
      return this.getParserBasedContext(document, position);
    }

    // If no parser instance is available, we can't determine context
    return { inBlock: false };
  }

  /**
   * Parser-based context detection using positional data from lookml-parser.
   * This is robust against formatting variations and provides accurate nested context.
   */
  private getParserBasedContext(
    document: vscode.TextDocument,
    position: vscode.Position
  ): LookmlContext {
    const fileName = document.fileName.replace(/^.*[\\/]/, "");
    const line = position.line;
    const character = position.character;

    // Find views that contain this position
    // Note: Converting to 0-based indexing for VS Code compatibility
    const containingView = this.lookmlInstance?.views.find(
      (view) =>
        view.fileName === fileName &&
        Number(view.startLine) - 1 <= line &&
        line <= Number(view.endLine) - 1 &&
        Number(view.startChar) <= character &&
        character <= Number(view.endChar)
    );

    if (containingView) {
      // Check if we're inside a specific field within the view
      const containingField = containingView.fields.find(
        (field) =>
          Number(field.startLine) - 1 <= line &&
          line <= Number(field.endLine) - 1 &&
          Number(field.startChar) <= character &&
          character <= Number(field.endChar)
      );

      if (containingField) {
        return {
          inBlock: true,
          blockType: String(containingField.type),
          blockName: String(containingField.name),
          parentContext: {
            inBlock: true,
            blockType: "view",
            blockName: String(containingView.name),
          },
        };
      }

      // Check if we're in a derived_table block within the view
      // This requires checking the document content since derived_table isn't stored as a field
      const derivedTableContext = this.checkForDerivedTableContext(
        document,
        position,
        containingView
      );
      if (derivedTableContext) {
        return derivedTableContext;
      }

      // We're in the view but not in a specific field
      return {
        inBlock: true,
        blockType: "view",
        blockName: String(containingView.name),
      };
    }

    // Find explores that contain this position
    const containingExplore = this.lookmlInstance?.explores.find(
      (explore) =>
        explore.fileName === fileName &&
        Number(explore.startLine) - 1 <= line &&
        line <= Number(explore.endLine) - 1 &&
        Number(explore.startChar) <= character &&
        character <= Number(explore.endChar)
    );

    if (containingExplore) {
      // Check if we're inside a join within the explore
      const containingJoin = containingExplore.fields.find(
        (field) =>
          field.type === "join" &&
          Number(field.startLine) - 1 <= line &&
          line <= Number(field.endLine) - 1 &&
          Number(field.startChar) <= character &&
          character <= Number(field.endChar)
      );

      if (containingJoin) {
        return {
          inBlock: true,
          blockType: "join",
          blockName: String(containingJoin.name),
          parentContext: {
            inBlock: true,
            blockType: "explore",
            blockName: String(containingExplore.name),
          },
        };
      }

      // We're in the explore but not in a specific join
      return {
        inBlock: true,
        blockType: "explore",
        blockName: String(containingExplore.name),
      };
    }

    // Check for model-level context (no containing blocks)
    if (this.isModelFile(document)) {
      return {
        inBlock: true,
        blockType: "model",
      };
    }

    return { inBlock: false };
  }

  /**
   * Checks if the cursor is within a derived_table block within a view
   */
  private checkForDerivedTableContext(
    document: vscode.TextDocument,
    position: vscode.Position,
    containingView: LookmlView
  ): LookmlContext | null {
    const viewStartLine = Number(containingView.startLine) - 1; // Convert to 0-based
    const viewEndLine = Number(containingView.endLine) - 1;

    // Look for derived_table blocks within the view
    for (let line = viewStartLine; line <= viewEndLine; line++) {
      const lineText = document.lineAt(line).text;
      if (lineText.trim().startsWith("derived_table:")) {
        // Find the extent of this derived_table block using brace counting
        let braceCount = 0;
        let derivedTableEndLine = line;

        for (let checkLine = line; checkLine <= viewEndLine; checkLine++) {
          const checkLineText = document.lineAt(checkLine).text;
          braceCount += (checkLineText.match(/\{/g) || []).length;
          braceCount -= (checkLineText.match(/\}/g) || []).length;

          if (braceCount === 0 && checkLine > line) {
            derivedTableEndLine = checkLine;
            break;
          }
        }

        // Check if cursor is within this derived_table block
        if (position.line >= line && position.line <= derivedTableEndLine) {
          return {
            inBlock: true,
            blockType: "derived_table",
            parentContext: {
              inBlock: true,
              blockType: "view",
              blockName: String(containingView.name),
            },
          };
        }
      }
    }

    return null;
  }

  /**
   * Determines if the document is a model file by checking for model-level parameters
   */
  private isModelFile(document: vscode.TextDocument): boolean {
    const content = document.getText();
    return /^(connection|include|label|case_sensitive|fiscal_month_offset|week_start_day|datagroup|access_grant)\s*:/m.test(
      content
    );
  }
}
