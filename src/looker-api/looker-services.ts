import * as vscode from "vscode";

// TODO: Move constants to package.json.

export interface LookerApiCredentials {
  lookerId: String;
  lookerSecret: String;
  lookerServerUrl: String;
  lookerServerPort: String;
}

export enum LookerCredentialKeys {
  serviceKey = "Looker",
  accountKey = "Id",
  secretKey = "Secret",
  lookerUrlKey = "Looker Server URL",
  lookerServerPortKey = "Looker Server Port",
}

export class LookerServices {
  private apiCredentials: LookerApiCredentials;
  private secrets: vscode.SecretStorage;

  public constructor(context: vscode.ExtensionContext) {
    this.apiCredentials = {
      lookerId: "",
      lookerSecret: "",
      lookerServerUrl: "",
      lookerServerPort: "",
    };
    this.secrets = context.secrets;
  }

  private async storeCredential(
    credentialType: string,
    credential: String
  ): Promise<{ success: string }> {
    try {
      await this.secrets.store(credentialType, credential.toString());
      return { success: `Looker ${credentialType} stored successfully.` };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw { error: `Could not store ${credentialType}: ${errorMessage}` };
    }
  }

  public async saveApiCredentials(
    apiCredentials: LookerApiCredentials
  ): Promise<{ success: string }> {
    try {
      // Store all credentials
      await this.storeCredential(
        LookerCredentialKeys.accountKey,
        apiCredentials.lookerId
      );
      await this.storeCredential(
        LookerCredentialKeys.secretKey,
        apiCredentials.lookerSecret
      );
      await this.storeCredential(
        LookerCredentialKeys.lookerUrlKey,
        apiCredentials.lookerServerUrl
      );
      await this.storeCredential(
        LookerCredentialKeys.lookerServerPortKey,
        apiCredentials.lookerServerPort
      );

      // Retrieve and verify credentials were stored
      const retrievedCredentials = await this.getLookerAPICredentials();
      if (retrievedCredentials) {
        this.apiCredentials = retrievedCredentials;
        return { success: "Credentials saved and retrieved" };
      } else {
        throw { error: "Unable to retrieve API credentials" };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw { error: errorMessage || "Failed to save credentials" };
    }
  }

  public async getLookerAPICredentials(): Promise<LookerApiCredentials> {
    try {
      const apiCredentials: LookerApiCredentials = {
        lookerId: "",
        lookerSecret: "",
        lookerServerUrl: "",
        lookerServerPort: "",
      };

      // Retrieve all credentials
      const lookerId = await this.secrets.get(LookerCredentialKeys.accountKey);
      const lookerSecret = await this.secrets.get(
        LookerCredentialKeys.secretKey
      );
      const lookerServerUrl = await this.secrets.get(
        LookerCredentialKeys.lookerUrlKey
      );
      const lookerServerPort = await this.secrets.get(
        LookerCredentialKeys.lookerServerPortKey
      );

      if (!lookerId) {
        throw { error: "Unable to retrieve Looker API ID." };
      }
      if (!lookerSecret) {
        throw { error: "Unable to retrieve Looker API Secret." };
      }
      if (!lookerServerUrl) {
        throw { error: "Unable to retrieve Looker Server URL." };
      }
      if (!lookerServerPort) {
        throw { error: "Unable to retrieve Looker Server Port." };
      }

      apiCredentials.lookerId = lookerId;
      apiCredentials.lookerSecret = lookerSecret;
      apiCredentials.lookerServerUrl = lookerServerUrl;
      apiCredentials.lookerServerPort = lookerServerPort;

      return apiCredentials;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw { error: errorMessage || "Failed to retrieve credentials" };
    }
  }
}
