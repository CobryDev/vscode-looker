/**
 * Centralized constants for the VSCode Looker extension
 * This file contains all hardcoded strings to prevent magic string usage
 */

/**
 * Looker API related constants
 */
// Get package.json configuration
const packageJson = require("../package.json");

export const LOOKER_API = {
  /** API version used for all Looker API endpoints */
  VERSION: packageJson["vscode-looker"]?.lookerApiVersion || "4.0",

  /** API endpoints */
  ENDPOINTS: {
    LOGIN: "/login",
    USER: "/user",
    QUERIES: "/queries",
    LOOKML_MODELS: "/lookml_models",
  },

  /** HTTP headers */
  HEADERS: {
    CONTENT_TYPE: "Content-Type",
    AUTHORIZATION: "Authorization",
  },

  /** Content types */
  CONTENT_TYPES: {
    FORM_URLENCODED: "application/x-www-form-urlencoded",
    JSON: "application/json",
  },
} as const;

/**
 * VSCode extension command identifiers
 * These must match the commands defined in package.json
 */
export const COMMANDS = {
  SAVE_PASSWORD: "looker.savePassword",
  API_LOGIN: "looker.apiLogin",
} as const;

/**
 * Language and extension identifiers
 */
export const LANGUAGE = {
  /** LookML language identifier */
  ID: "lookml",

  /** File extensions */
  EXTENSIONS: {
    LOOKML: ".lkml",
  },
} as const;

/**
 * User interface messages
 */
export const MESSAGES = {
  WELCOME: "Welcome good Looker!",
  CREDENTIALS_LOADED: "Looker API credentials loaded successfully.",
  CONNECTION_SUCCESS: "Successfully connected to Looker API!",

  /** Error message prefixes */
  ERRORS: {
    CREDENTIALS_FAILED: "Failed to load API credentials",
    API_LOGIN_FAILED: "API login failed",
    AUTH_FAILED: "Authentication failed",
    REQUEST_FAILED: "Request failed",
    NO_VALUE_PROVIDED: "No value provided for",
  },
} as const;

/**
 * VSCode completion provider trigger characters
 */
export const COMPLETION_TRIGGERS = {
  VIEW_NAME: "{",
  FIELD_NAME: ".",
} as const;
