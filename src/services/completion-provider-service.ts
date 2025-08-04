import * as vscode from "vscode";
import { LookML } from "../workspace-tools/parse-lookml";
import { LookmlLanguageService } from "./lookml-language-service";
import { LANGUAGE, COMPLETION_TRIGGERS } from "../constants";

/**
 * Service responsible for managing all completion providers for LookML
 */
export class CompletionProviderService {
  private lookml: LookML;
  private languageService: LookmlLanguageService;
  private providers: vscode.Disposable[] = [];

  constructor(lookml: LookML, languageService: LookmlLanguageService) {
    this.lookml = lookml;
    this.languageService = languageService;
  }

  /**
   * Registers all completion providers
   * @returns Array of disposables for the registered providers
   */
  public registerCompletionProviders(): vscode.Disposable[] {
    this.providers = [
      this.createViewNameProvider(),
      this.createFieldNameProvider(),
    ];

    return this.providers;
  }

  /**
   * Creates the completion provider for view names
   */
  private createViewNameProvider(): vscode.Disposable {
    return vscode.languages.registerCompletionItemProvider(
      LANGUAGE.ID,
      {
        provideCompletionItems: (
          document: vscode.TextDocument,
          position: vscode.Position
        ) => {
          // Use intelligent context detection instead of simple string matching
          if (this.languageService.isInViewNameContext(document, position)) {
            let completionItems: vscode.CompletionItem[] = [];
            for (let viewName of this.lookml.views.map(({ name }) => name)) {
              const item = new vscode.CompletionItem(
                String(viewName),
                vscode.CompletionItemKind.Field
              );
              // Add helpful detail to distinguish views
              item.detail = `View: ${viewName}`;
              completionItems.push(item);
            }
            return completionItems;
          }
          return [];
        },
      },
      COMPLETION_TRIGGERS.VIEW_NAME
    );
  }

  /**
   * Creates the completion provider for field names
   */
  private createFieldNameProvider(): vscode.Disposable {
    return vscode.languages.registerCompletionItemProvider(
      LANGUAGE.ID,
      {
        provideCompletionItems: (
          document: vscode.TextDocument,
          position: vscode.Position
        ) => {
          // Use position-based logic instead of fragile brace counting
          const referenceContext =
            this.languageService.isInViewReferenceContext(document, position);

          if (referenceContext.isInContext && referenceContext.viewName) {
            // Find the referenced view
            const view = this.lookml.views.find(
              (v) => v.name === referenceContext.viewName
            );

            if (view) {
              let completionItems: vscode.CompletionItem[] = [];
              for (let field of view.fields) {
                const item = new vscode.CompletionItem(
                  String(field.name),
                  vscode.CompletionItemKind.Field
                );
                // Add helpful details about the field
                item.detail = `${field.type} field from ${view.name}`;
                item.documentation = `Field: ${field.name}\nType: ${field.type}\nView: ${view.name}`;
                completionItems.push(item);
              }
              return completionItems;
            }
          }

          return [];
        },
      },
      COMPLETION_TRIGGERS.FIELD_NAME
    );
  }

  /**
   * Disposes all registered providers
   */
  public dispose(): void {
    this.providers.forEach((provider) => provider.dispose());
    this.providers = [];
  }
}
