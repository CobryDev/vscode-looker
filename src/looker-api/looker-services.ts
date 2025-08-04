import * as vscode from "vscode";
import fetch, { RequestInit } from "node-fetch";
import { URLSearchParams } from "url";
import { LOOKER_API, MESSAGES } from "../constants";

// TODO: Consider moving additional configurable constants to package.json (completed: API version moved).

export interface LookerApiCredentials {
  lookerId: String;
  lookerSecret: String;
  lookerServerUrl: String;
  lookerServerPort: String;
}

export interface LookerAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at?: number; // Calculated field for expiry time
}

export interface LookerApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

export interface SqlQueryRequest {
  sql: string;
  limit?: number;
  apply_formatting?: boolean;
  apply_vis?: boolean;
  cache?: boolean;
  image_width?: number;
  image_height?: number;
  generate_drill_links?: boolean;
  force_production?: boolean;
  cache_only?: boolean;
  path_prefix?: string;
  rebuild_pdts?: boolean;
  server_table_calcs?: boolean;
}

export interface ProjectValidationResult {
  project: string;
  errors?: Array<{
    message: string;
    file_path?: string;
    line_number?: number;
    severity?: string;
  }>;
  warnings?: Array<{
    message: string;
    file_path?: string;
    line_number?: number;
    severity?: string;
  }>;
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
      throw new Error(`Could not store ${credentialType}: ${errorMessage}`);
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
        throw new Error("Unable to retrieve API credentials");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(errorMessage || "Failed to save credentials");
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
        throw new Error("Unable to retrieve Looker API ID.");
      }
      if (!lookerSecret) {
        throw new Error("Unable to retrieve Looker API Secret.");
      }
      if (!lookerServerUrl) {
        throw new Error("Unable to retrieve Looker Server URL.");
      }
      if (!lookerServerPort) {
        throw new Error("Unable to retrieve Looker Server Port.");
      }

      apiCredentials.lookerId = lookerId;
      apiCredentials.lookerSecret = lookerSecret;
      apiCredentials.lookerServerUrl = lookerServerUrl;
      apiCredentials.lookerServerPort = lookerServerPort;

      return apiCredentials;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(errorMessage || "Failed to retrieve credentials");
    }
  }

  /**
   * Create an API client instance using the stored credentials
   */
  public async createApiClient(): Promise<LookerApiClient> {
    const credentials = await this.getLookerAPICredentials();
    return new LookerApiClient(credentials);
  }
}

export class LookerApiClient {
  private credentials: LookerApiCredentials;
  private authToken: LookerAuthToken | null = null;
  private baseUrl: string;

  constructor(credentials: LookerApiCredentials) {
    this.credentials = credentials;
    this.baseUrl = `${credentials.lookerServerUrl}:${credentials.lookerServerPort}/api/${LOOKER_API.VERSION}`;
  }

  private async authenticate(): Promise<LookerAuthToken> {
    const authUrl = `${this.baseUrl}${LOOKER_API.ENDPOINTS.LOGIN}`;
    const authData = {
      client_id: this.credentials.lookerId.toString(),
      client_secret: this.credentials.lookerSecret.toString(),
    };

    try {
      const response = await fetch(authUrl, {
        method: "POST",
        headers: {
          [LOOKER_API.HEADERS.CONTENT_TYPE]:
            LOOKER_API.CONTENT_TYPES.FORM_URLENCODED,
        },
        body: new URLSearchParams(authData),
      });

      if (!response.ok) {
        throw new Error(
          `${MESSAGES.ERRORS.AUTH_FAILED}: ${response.status} ${response.statusText}`
        );
      }

      const tokenData = (await response.json()) as LookerAuthToken;

      // Calculate expiry time
      tokenData.expires_at = Date.now() + tokenData.expires_in * 1000;

      this.authToken = tokenData;
      return tokenData;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `${MESSAGES.ERRORS.AUTH_FAILED} with Looker API: ${errorMessage}`
      );
    }
  }

  private async ensureValidToken(): Promise<string> {
    // Check if we have a valid token
    if (
      !this.authToken ||
      !this.authToken.expires_at ||
      Date.now() >= this.authToken.expires_at - 30000
    ) {
      // Token is missing or expires within 30 seconds, refresh it
      await this.authenticate();
    }

    if (!this.authToken) {
      throw new Error("Failed to obtain authentication token");
    }

    return `${this.authToken.token_type} ${this.authToken.access_token}`;
  }

  private async makeRequest<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<LookerApiResponse<T>> {
    try {
      const authHeader = await this.ensureValidToken();
      const url = `${this.baseUrl}${endpoint}`;

      const response = await fetch(url, {
        ...options,
        headers: {
          [LOOKER_API.HEADERS.AUTHORIZATION]: authHeader,
          [LOOKER_API.HEADERS.CONTENT_TYPE]: LOOKER_API.CONTENT_TYPES.JSON,
          ...options.headers,
        },
      });

      const responseData = (await response.json()) as any;

      if (!response.ok) {
        return {
          error:
            responseData.message ||
            `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
        };
      }

      return {
        data: responseData as T,
        status: response.status,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        error: `${MESSAGES.ERRORS.REQUEST_FAILED}: ${errorMessage}`,
        status: 0,
      };
    }
  }

  /**
   * Execute a SQL query against the Looker API
   */
  public async runSqlQuery(
    queryRequest: SqlQueryRequest
  ): Promise<LookerApiResponse<any[]>> {
    const queryParams = new URLSearchParams();

    // Add query parameters
    Object.entries(queryRequest).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    return this.makeRequest(`/sql_queries/run/json?${queryParams.toString()}`, {
      method: "POST",
    });
  }

  /**
   * Validate a LookML project
   */
  public async validateProject(
    projectId: string
  ): Promise<LookerApiResponse<ProjectValidationResult>> {
    return this.makeRequest(`/projects/${projectId}/validate`, {
      method: "POST",
    });
  }

  /**
   * Get all projects accessible to the current user
   */
  public async getProjects(): Promise<LookerApiResponse<any[]>> {
    return this.makeRequest("/projects");
  }

  /**
   * Get project information by ID
   */
  public async getProject(projectId: string): Promise<LookerApiResponse<any>> {
    return this.makeRequest(`/projects/${projectId}`);
  }

  /**
   * Get all models in a project
   */
  public async getProjectModels(
    projectId: string
  ): Promise<LookerApiResponse<any[]>> {
    return this.makeRequest(`/projects/${projectId}/models`);
  }

  /**
   * Get model information
   */
  public async getModel(modelName: string): Promise<LookerApiResponse<any>> {
    return this.makeRequest(
      `${LOOKER_API.ENDPOINTS.LOOKML_MODELS}/${modelName}`
    );
  }

  /**
   * Test the connection to Looker API
   */
  public async testConnection(): Promise<LookerApiResponse<any>> {
    return this.makeRequest(LOOKER_API.ENDPOINTS.USER);
  }

  /**
   * Logout and invalidate the current token
   */
  public async logout(): Promise<void> {
    if (this.authToken) {
      try {
        await this.makeRequest("/logout", { method: "DELETE" });
      } catch {
        // Ignore logout errors as token will expire anyway
      } finally {
        this.authToken = null;
      }
    }
  }

  /**
   * Get current authentication status
   */
  public isAuthenticated(): boolean {
    return (
      this.authToken !== null &&
      this.authToken.expires_at !== undefined &&
      Date.now() < this.authToken.expires_at - 30000
    );
  }
}
