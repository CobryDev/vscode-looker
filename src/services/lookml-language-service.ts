import * as vscode from "vscode";

export interface ViewReferenceContext {
  isInContext: boolean;
  viewName?: string;
}

/**
 * Service responsible for LookML language-specific operations like context detection
 */
export class LookmlLanguageService {
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
}
