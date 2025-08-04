import * as vscode from "vscode";
import {
  LookerServices,
  LookerApiCredentials,
  LookerCredentialKeys,
} from "../looker-api/looker-services";
import { COMMANDS, MESSAGES } from "../constants";

/**
 * Service responsible for registering and managing all extension commands
 */
export class CommandService {
  private lookerServices: LookerServices;
  private commands: vscode.Disposable[] = [];

  constructor(lookerServices: LookerServices) {
    this.lookerServices = lookerServices;
  }

  /**
   * Registers all extension commands
   * @returns Array of disposables for the registered commands
   */
  public registerCommands(): vscode.Disposable[] {
    this.commands = [
      this.createSavePasswordCommand(),
      this.createApiLoginCommand(),
    ];

    return this.commands;
  }

  /**
   * Creates the save password command
   */
  private createSavePasswordCommand(): vscode.Disposable {
    return vscode.commands.registerCommand(COMMANDS.SAVE_PASSWORD, async () => {
      const apiCredentials: LookerApiCredentials = {
        lookerId: "",
        lookerSecret: "",
        lookerServerUrl: "",
        lookerServerPort: "",
      };

      try {
        // Collect all credentials from user
        apiCredentials.lookerId = await this.getApiCredentialFromUser(
          LookerCredentialKeys.accountKey
        );
        apiCredentials.lookerSecret = await this.getApiCredentialFromUser(
          LookerCredentialKeys.secretKey
        );
        apiCredentials.lookerServerUrl = await this.getApiCredentialFromUser(
          LookerCredentialKeys.lookerUrlKey
        );
        apiCredentials.lookerServerPort = await this.getApiCredentialFromUser(
          LookerCredentialKeys.lookerServerPortKey
        );

        // Save credentials
        const result = await this.lookerServices.saveApiCredentials(
          apiCredentials
        );
        vscode.window.showInformationMessage(result.success);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(errorMessage);
      }
    });
  }

  /**
   * Creates the API login command
   */
  private createApiLoginCommand(): vscode.Disposable {
    return vscode.commands.registerCommand(COMMANDS.API_LOGIN, async () => {
      try {
        // Create API client and test connection
        const apiClient = await this.lookerServices.createApiClient();
        const result = await apiClient.testConnection();

        if (result.error) {
          vscode.window.showErrorMessage(
            `${MESSAGES.ERRORS.API_LOGIN_FAILED}: ${result.error}`
          );
        } else {
          vscode.window.showInformationMessage(MESSAGES.CONNECTION_SUCCESS);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(
          `${MESSAGES.ERRORS.API_LOGIN_FAILED}: ${errorMessage}`
        );
      }
    });
  }

  /**
   * Helper method to get API credentials from user input
   * @param credentialType The type of credential to request
   * @returns Promise resolving to the credential value
   */
  private async getApiCredentialFromUser(
    credentialType: string
  ): Promise<string> {
    const options: vscode.InputBoxOptions = {
      prompt: `Please enter your Looker API ${credentialType}`,
      password: true,
      placeHolder: `Looker API ${credentialType}...`,
      ignoreFocusOut: true,
    };

    const value = await vscode.window.showInputBox(options);
    if (value) {
      return value;
    } else {
      throw new Error(`${MESSAGES.ERRORS.NO_VALUE_PROVIDED} ${credentialType}`);
    }
  }

  /**
   * Disposes all registered commands
   */
  public dispose(): void {
    this.commands.forEach((command) => command.dispose());
    this.commands = [];
  }
}
