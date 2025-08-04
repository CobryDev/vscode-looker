import * as vscode from "vscode";
import { LookML } from "./workspace-tools/parse-lookml";
import {
  LookerServices,
  LookerApiCredentials,
  LookerCredentialKeys,
} from "./looker-api/looker-services";

export function activate(context: vscode.ExtensionContext) {
  vscode.window.showInformationMessage("Welcome good Looker!");

  let looker = new LookerServices(context);
  let lookml = new LookML();

  // Prepare auto-completion.
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const workspaceRoot =
    workspaceFolders && workspaceFolders.length > 0
      ? workspaceFolders[0].uri.fsPath
      : "";
  lookml.parseWorkspaceLookmlFiles(workspaceRoot).then(() => {
    // TODO: Add view name
    // TODO: Line number.
    // TODO: Add fields to intellisense.
    // TODO: Peek / Goto
  });

  // Retrieve API credentials, if stored.
  looker
    .getLookerAPICredentials()
    .then((result: any) => {
      vscode.window.showInformationMessage(result["success"]);
    })
    .catch((reason) => {
      vscode.window.showErrorMessage(reason["error"]);
    });

  // Helper functions for position-based completion logic
  function isInViewReferenceContext(
    document: vscode.TextDocument,
    position: vscode.Position
  ): { isInContext: boolean; viewName?: string } {
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

  function isInViewNameContext(
    document: vscode.TextDocument,
    position: vscode.Position
  ): boolean {
    const lineText = document.lineAt(position).text;
    const textBeforeCursor = lineText.substring(0, position.character);

    // Check if we're in a ${... context but haven't typed the view name yet
    return textBeforeCursor.match(/\$\{[^}]*$/) !== null;
  }

  // Auto-completion providers.
  const viewNameProvider = vscode.languages.registerCompletionItemProvider(
    "lookml",
    {
      provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
      ) {
        // Use intelligent context detection instead of simple string matching
        if (isInViewNameContext(document, position)) {
          let completionItems: vscode.CompletionItem[] = [];
          for (let viewName of lookml.views.map(({ name }) => name)) {
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
    "{"
  );

  const fieldNameProvider = vscode.languages.registerCompletionItemProvider(
    "lookml",
    {
      provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
      ) {
        // Use position-based logic instead of fragile brace counting
        const referenceContext = isInViewReferenceContext(document, position);

        if (referenceContext.isInContext && referenceContext.viewName) {
          // Find the referenced view
          const view = lookml.views.find(
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
    "."
  );

  // Commands
  let savePassword = vscode.commands.registerCommand(
    "looker.savePassword",
    async () => {
      const apiCredentials: LookerApiCredentials = {
        lookerId: "",
        lookerSecret: "",
        lookerServerUrl: "",
        lookerServerPort: "",
      };
      await getApiCredentialFromUser(LookerCredentialKeys.accountKey).then(
        (result) => {
          apiCredentials.lookerId = result;
        }
      );
      await getApiCredentialFromUser(LookerCredentialKeys.secretKey).then(
        (result) => {
          apiCredentials.lookerSecret = result;
        }
      );
      await getApiCredentialFromUser(LookerCredentialKeys.lookerUrlKey).then(
        (result) => {
          apiCredentials.lookerServerUrl = result;
        }
      );
      await getApiCredentialFromUser(
        LookerCredentialKeys.lookerServerPortKey
      ).then((result) => {
        apiCredentials.lookerServerPort = result;
      });
      looker
        .saveApiCredentials(apiCredentials)
        .then((result) => {
          vscode.window.showInformationMessage(Object(result)["success"]);
        })
        .catch((reason) => {
          vscode.window.showErrorMessage(Object(reason)["error"]);
        });
    }
  );

  // TODO: Move to separate class.
  let apiLogin = vscode.commands.registerCommand(
    "looker.apiLogin",
    async () => {
      // TODO: Implement Looker API login functionality
      // This will need to be implemented when the API integration is ready
      vscode.window.showInformationMessage(
        "API login functionality not yet implemented."
      );
    }
  );

  context.subscriptions.push(
    savePassword,
    apiLogin,
    viewNameProvider,
    fieldNameProvider
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}

async function getApiCredentialFromUser(
  credentialType: string
): Promise<string> {
  let options: vscode.InputBoxOptions = {
    prompt: `Please enter your Looker API ${credentialType}`,
    password: true,
    placeHolder: `Looker API ${credentialType}...`,
    ignoreFocusOut: true,
  };

  const value = await vscode.window.showInputBox(options);
  if (value) {
    return value;
  } else {
    throw new Error("No value provided");
  }
}
