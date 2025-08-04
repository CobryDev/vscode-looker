import * as vscode from "vscode";
import { LookML } from "./workspace-tools/parse-lookml";
import { LookerServices } from "./looker-api/looker-services";
import { LookmlLanguageService } from "./services/lookml-language-service";
import { LookmlSchemaService } from "./services/lookml-schema-service";
import { CompletionProviderService } from "./services/completion-provider-service";
import { CommandService } from "./services/command-service";
import { MESSAGES } from "./constants";

/**
 * Extension activation function - acts as a lightweight composition root
 * Instantiates and wires together different services
 */
export function activate(context: vscode.ExtensionContext) {
  vscode.window.showInformationMessage(MESSAGES.WELCOME);

  // Initialize core services
  const lookerServices = new LookerServices(context);
  const lookml = new LookML();
  const lookmlLanguageService = new LookmlLanguageService();
  const lookmlSchemaService = new LookmlSchemaService();

  // Initialize workspace and parse LookML files
  initializeWorkspace(lookml);

  // Initialize API credentials
  initializeApiCredentials(lookerServices);

  // Inject the LookML instance into the language service for robust context detection
  lookmlLanguageService.setLookmlInstance(lookml);

  // Create and register service providers, injecting the new schema service
  const completionProviderService = new CompletionProviderService(
    lookml,
    lookmlLanguageService,
    lookmlSchemaService
  );
  const commandService = new CommandService(lookerServices);

  // Register all providers and commands
  const completionProviders =
    completionProviderService.registerCompletionProviders();
  const commands = commandService.registerCommands();

  // Add all disposables to context subscriptions
  context.subscriptions.push(
    ...completionProviders,
    ...commands,
    completionProviderService,
    commandService
  );
}

/**
 * Initializes the workspace and parses LookML files
 */
function initializeWorkspace(lookml: LookML): void {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const workspaceRoot =
    workspaceFolders && workspaceFolders.length > 0
      ? workspaceFolders[0].uri.fsPath
      : "";

  lookml.parseWorkspaceLookmlFiles(workspaceRoot).then((result) => {
    console.log(
      `LookML parsing completed: ${result.filesProcessed} files processed, ${result.viewsFound} views found, ${result.exploresFound} explores found`
    );
    // TODO: Add view name
    // TODO: Line number.
    // TODO: Add fields to intellisense.
    // TODO: Peek / Goto
  });
}

/**
 * Initializes API credentials and displays appropriate messages
 */
function initializeApiCredentials(lookerServices: LookerServices): void {
  lookerServices
    .getLookerAPICredentials()
    .then((_result: any) => {
      vscode.window.showInformationMessage(MESSAGES.CREDENTIALS_LOADED);
    })
    .catch((reason) => {
      const errorMessage =
        reason instanceof Error ? reason.message : String(reason);
      vscode.window.showErrorMessage(
        `${MESSAGES.ERRORS.CREDENTIALS_FAILED}: ${errorMessage}`
      );
    });
}

// this method is called when your extension is deactivated
export function deactivate() {}
