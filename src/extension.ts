import * as vscode from "vscode";
import { LookML } from "./workspace-tools/parse-lookml";
import { LookerServices } from "./looker-api/looker-services";
import { LookmlLanguageService } from "./services/lookml-language-service";
import { CompletionProviderService } from "./services/completion-provider-service";
import { CommandService } from "./services/command-service";

/**
 * Extension activation function - acts as a lightweight composition root
 * Instantiates and wires together different services
 */
export function activate(context: vscode.ExtensionContext) {
  vscode.window.showInformationMessage("Welcome good Looker!");

  // Initialize core services
  const lookerServices = new LookerServices(context);
  const lookml = new LookML();
  const lookmlLanguageService = new LookmlLanguageService();

  // Initialize workspace and parse LookML files
  initializeWorkspace(lookml);

  // Initialize API credentials
  initializeApiCredentials(lookerServices);

  // Create and register service providers
  const completionProviderService = new CompletionProviderService(
    lookml,
    lookmlLanguageService
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

  lookml.parseWorkspaceLookmlFiles(workspaceRoot).then(() => {
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
      vscode.window.showInformationMessage(
        "Looker API credentials loaded successfully."
      );
    })
    .catch((reason) => {
      const errorMessage =
        reason instanceof Error ? reason.message : String(reason);
      vscode.window.showErrorMessage(
        `Failed to load API credentials: ${errorMessage}`
      );
    });
}

// this method is called when your extension is deactivated
export function deactivate() {}
