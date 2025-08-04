import * as vscode from "vscode";
import { LookML } from "../workspace-tools/parse-lookml";
import { LookmlLanguageService } from "./lookml-language-service";
import { LookmlSchemaService } from "./lookml-schema-service";
import { LANGUAGE, COMPLETION_TRIGGERS } from "../constants";

/**
 * Service responsible for managing all completion providers for LookML
 */
export class CompletionProviderService implements vscode.Disposable {
  private lookml: LookML;
  private languageService: LookmlLanguageService;
  private schemaService: LookmlSchemaService;
  private providers: vscode.Disposable[] = [];

  constructor(
    lookml: LookML,
    languageService: LookmlLanguageService,
    schemaService: LookmlSchemaService
  ) {
    this.lookml = lookml;
    this.languageService = languageService;
    this.schemaService = schemaService;
  }

  /**
   * Registers all completion providers
   * @returns Array of disposables for the registered providers
   */
  public registerCompletionProviders(): vscode.Disposable[] {
    this.providers = [
      this.createViewNameProvider(),
      this.createFieldNameProvider(),
      this.createParameterProvider(),
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

  private createParameterProvider(): vscode.Disposable {
    return vscode.languages.registerCompletionItemProvider(LANGUAGE.ID, {
      provideCompletionItems: (document, position) => {
        const context = this.languageService.getLookmlContext(
          document,
          position
        );

        if (!context.inBlock || !context.blockType) {
          return [];
        }

        const validParameters = this.schemaService.getValidParameters(
          context.blockType
        );

        return validParameters.map((param) => {
          const item = new vscode.CompletionItem(
            param.name,
            vscode.CompletionItemKind.Property
          );

          // Handle deprecated parameters
          if (param.deprecated) {
            item.detail = `⚠️ DEPRECATED: ${param.description}`;
            item.tags = [vscode.CompletionItemTag.Deprecated];
            // Lower priority for deprecated items
            item.sortText = `z_${param.name}`;
          } else {
            item.detail = param.description;
            item.sortText = param.name;
          }

          item.insertText = new vscode.SnippetString(`${param.name}: $0`);

          const docs = new vscode.MarkdownString(param.documentation);
          if (param.deprecated) {
            docs.appendMarkdown(
              `\n\n**⚠️ This parameter is deprecated and should be avoided.**`
            );
          }
          if (param.link) {
            docs.appendMarkdown(`\n\n[Official Documentation](${param.link})`);
          }
          item.documentation = docs;

          return item;
        });
      },
    });
  }

  /**
   * Disposes all registered providers
   */
  public dispose(): void {
    this.providers.forEach((provider) => provider.dispose());
    this.providers = [];
  }
}
