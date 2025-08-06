/**
 * Language Server Client Service
 *
 * Manages the connection between VS Code and the LookML Language Server.
 * Handles server startup, shutdown, and communication.
 */

import * as path from "path";
import * as vscode from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
  RevealOutputChannelOn,
} from "vscode-languageclient/node";

/**
 * Service to manage the Language Server client
 */
export class LanguageServerClientService implements vscode.Disposable {
  private client: LanguageClient | undefined;
  private outputChannel: vscode.OutputChannel;

  constructor(private context: vscode.ExtensionContext) {
    this.outputChannel = vscode.window.createOutputChannel(
      "LookML Language Server"
    );
  }

  /**
   * Start the language server
   */
  async start(): Promise<void> {
    if (this.client) {
      return; // Already started
    }

    try {
      // The server is implemented in TypeScript and needs to be compiled to JavaScript
      const serverModule = this.context.asAbsolutePath(
        path.join("out", "language-server", "server.js")
      );

      // Check if the server module exists
      if (!require("fs").existsSync(serverModule)) {
        const errorMsg = `Language server module not found at ${serverModule}. Make sure to compile the TypeScript files first.`;
        this.outputChannel.appendLine(errorMsg);
        vscode.window.showErrorMessage(errorMsg);
        return;
      }

      // The debug options for the server
      // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
      const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

      // If the extension is launched in debug mode then the debug server options are used
      // Otherwise the run options are used
      const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: {
          module: serverModule,
          transport: TransportKind.ipc,
          options: debugOptions,
        },
      };

      // Options to control the language client
      const clientOptions: LanguageClientOptions = {
        // Register the server for LookML documents
        documentSelector: [
          { scheme: "file", language: "lookml" },
          { scheme: "file", pattern: "**/*.lkml" },
        ],
        synchronize: {
          // Notify the server about file changes to LookML files contained in the workspace
          fileEvents: vscode.workspace.createFileSystemWatcher("**/*.lkml"),
        },
        outputChannel: this.outputChannel,
        revealOutputChannelOn: RevealOutputChannelOn.Info,
      };

      // Create the language client and start the client
      this.client = new LanguageClient(
        "lookmlLanguageServer",
        "LookML Language Server",
        serverOptions,
        clientOptions
      );

      // Start the client. This will also launch the server
      await this.client.start();

      this.outputChannel.appendLine(
        "LookML Language Server started successfully"
      );

      // Register additional commands that depend on the language server
      this.registerLanguageServerCommands();
    } catch (error) {
      const errorMsg = `Failed to start LookML Language Server: ${error}`;
      this.outputChannel.appendLine(errorMsg);
      vscode.window.showErrorMessage(errorMsg);
      throw error;
    }
  }

  /**
   * Stop the language server
   */
  async stop(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      await this.client.stop();
      this.client = undefined;
      this.outputChannel.appendLine("LookML Language Server stopped");
    } catch (error) {
      const errorMsg = `Error stopping LookML Language Server: ${error}`;
      this.outputChannel.appendLine(errorMsg);
      console.error(errorMsg);
    }
  }

  /**
   * Check if the language server is running
   */
  isRunning(): boolean {
    return this.client !== undefined && this.client.isRunning();
  }

  /**
   * Get the language client instance
   */
  getClient(): LanguageClient | undefined {
    return this.client;
  }

  /**
   * Register commands that depend on the language server
   */
  private registerLanguageServerCommands(): void {
    if (!this.client) return;

    // Register restart language server command
    const restartCommand = vscode.commands.registerCommand(
      "lookml.restartLanguageServer",
      async () => {
        await this.restart();
      }
    );

    // Register show output command
    const showOutputCommand = vscode.commands.registerCommand(
      "lookml.showLanguageServerOutput",
      () => {
        this.outputChannel.show();
      }
    );

    // Register workspace diagnostics command
    const workspaceDiagnosticsCommand = vscode.commands.registerCommand(
      "lookml.showWorkspaceDiagnostics",
      async () => {
        if (!this.client) {
          vscode.window.showWarningMessage("Language server is not running");
          return;
        }

        // This would trigger a workspace-wide diagnostics refresh
        // The specific implementation depends on the language server capabilities
        await vscode.commands.executeCommand(
          "vscode.executeDocumentDiagnostics"
        );
      }
    );

    // Add commands to context for disposal
    this.context.subscriptions.push(
      restartCommand,
      showOutputCommand,
      workspaceDiagnosticsCommand
    );
  }

  /**
   * Restart the language server
   */
  async restart(): Promise<void> {
    this.outputChannel.appendLine("Restarting LookML Language Server...");

    try {
      await this.stop();
      await this.start();
      vscode.window.showInformationMessage(
        "LookML Language Server restarted successfully"
      );
    } catch (error) {
      const errorMsg = `Failed to restart LookML Language Server: ${error}`;
      this.outputChannel.appendLine(errorMsg);
      vscode.window.showErrorMessage(errorMsg);
    }
  }

  /**
   * Send a custom notification to the language server
   */
  async sendNotification(method: string, params?: any): Promise<void> {
    if (!this.client || !this.client.isRunning()) {
      throw new Error("Language server is not running");
    }

    await this.client.sendNotification(method, params);
  }

  /**
   * Send a custom request to the language server
   */
  async sendRequest<T>(method: string, params?: any): Promise<T> {
    if (!this.client || !this.client.isRunning()) {
      throw new Error("Language server is not running");
    }

    return await this.client.sendRequest(method, params);
  }

  /**
   * Dispose of the service
   */
  dispose(): void {
    this.stop().catch((error) => {
      console.error("Error during language server disposal:", error);
    });
    this.outputChannel.dispose();
  }
}
