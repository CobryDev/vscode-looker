import * as vscode from "vscode";
import { LookerServices } from "./looker-api/looker-services";
import { CommandService } from "./services/command-service";
import { LanguageServerClientService } from "./services/language-server-client";
import { MESSAGES } from "./constants";

/**
 * Extension activation function - Pure LSP Client
 *
 * This extension now acts as a pure Language Server Protocol client,
 * delegating all language intelligence to the dedicated Language Server.
 */
export async function activate(context: vscode.ExtensionContext) {
  vscode.window.showInformationMessage(MESSAGES.WELCOME);

  // Initialize Language Server - this provides all language intelligence
  const languageServerClient = new LanguageServerClientService(context);

  try {
    await languageServerClient.start();
    console.log("LookML Language Server started successfully");

    // Show success message to user
    vscode.window.showInformationMessage(
      "LookML Language Server is running. Enjoy enhanced LookML development features!"
    );
  } catch (error) {
    console.error("Failed to start LookML Language Server:", error);
    vscode.window.showErrorMessage(
      "LookML Language Server failed to start. Please check the output panel for details and restart VS Code if needed."
    );

    // Still continue with basic services even if Language Server fails
  }

  // Initialize Looker API services (independent of Language Server)
  const lookerServices = new LookerServices(context);
  const commandService = new CommandService(lookerServices);

  // Initialize API credentials
  initializeApiCredentials(lookerServices);

  // Register API-related commands
  const commands = commandService.registerCommands();

  // Add all disposables to context subscriptions
  context.subscriptions.push(languageServerClient, commandService, ...commands);
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
