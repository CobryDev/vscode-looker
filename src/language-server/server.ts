/**
 * LookML Language Server
 *
 * This is the main entry point for the LookML Language Server Process.
 * It implements the Language Server Protocol (LSP) to provide advanced
 * development features for LookML files.
 */

import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  DocumentDiagnosticReportKind,
  type DocumentDiagnosticReport,
  type WorkspaceDiagnosticReport,
  type WorkspaceFullDocumentDiagnosticReport,
  DefinitionParams,
  Location,
  HoverParams,
  Hover,
  ReferenceParams,
  SemanticTokensParams,
  SemanticTokens,
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";

import { LookMLWorkspace } from "./workspace";
import { LookMLDiagnosticsProvider } from "./diagnostics-provider";
import { LookMLCompletionProvider } from "./completion-provider";
import { LookMLDefinitionProvider } from "./definition-provider";
import { LookMLHoverProvider } from "./hover-provider";
import { LookMLReferenceProvider } from "./reference-provider";
import {
  LookMLSemanticTokensProvider,
  createSemanticTokensLegend,
} from "./semantic-tokens-provider";

// Create a connection for the server, using Node's IPC as a transport.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Global workspace manager
let workspace: LookMLWorkspace;

// Service providers
let diagnosticsProvider: LookMLDiagnosticsProvider;
let completionProvider: LookMLCompletionProvider;
let definitionProvider: LookMLDefinitionProvider;
let hoverProvider: LookMLHoverProvider;
let referenceProvider: LookMLReferenceProvider;
let semanticTokensProvider: LookMLSemanticTokensProvider;

// Configuration
let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

/**
 * Initialize the language server
 */
connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  // Check client capabilities
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  );

  // Initialize workspace
  const workspaceUri = params.workspaceFolders?.[0]?.uri || params.rootUri;
  workspace = new LookMLWorkspace(
    workspaceUri ? URI.parse(workspaceUri).fsPath : process.cwd()
  );

  // Initialize providers
  diagnosticsProvider = new LookMLDiagnosticsProvider(workspace);
  completionProvider = new LookMLCompletionProvider(workspace);
  definitionProvider = new LookMLDefinitionProvider(workspace);
  hoverProvider = new LookMLHoverProvider(workspace);
  referenceProvider = new LookMLReferenceProvider(workspace);
  semanticTokensProvider = new LookMLSemanticTokensProvider(workspace);

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion.
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: [".", "$", "{", ":", " "],
      },
      // Support diagnostics
      diagnosticProvider: {
        interFileDependencies: true,
        workspaceDiagnostics: true,
      },
      // Support go-to-definition
      definitionProvider: true,
      // Support hover information
      hoverProvider: true,
      // Support find references
      referencesProvider: true,
      // Support semantic tokens
      semanticTokensProvider: {
        legend: createSemanticTokensLegend(),
        range: false,
        full: {
          delta: false,
        },
      },
    },
  };

  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    };
  }

  return result;
});

/**
 * Handle initialization completion
 */
connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(
      DidChangeConfigurationNotification.type,
      undefined
    );
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      connection.console.log("Workspace folder change event received.");
    });
  }

  // Scan workspace for LookML files on startup
  workspace
    .initialize()
    .then(() => {
      connection.console.log("LookML Language Server initialized successfully");
    })
    .catch((error) => {
      connection.console.error(`Failed to initialize workspace: ${error}`);
    });
});

/**
 * Handle configuration changes
 */
connection.onDidChangeConfiguration((change) => {
  // Revalidate all open text documents
  documents.all().forEach(validateTextDocument);
});

/**
 * Document event handlers
 */

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
  validateTextDocument(change.document);
});

documents.onDidOpen((event) => {
  workspace.updateDocument(event.document.uri, event.document.getText());
  validateTextDocument(event.document);
});

documents.onDidSave((event) => {
  workspace.updateDocument(event.document.uri, event.document.getText());
  validateTextDocument(event.document);
});

documents.onDidClose((event) => {
  workspace.removeDocument(event.document.uri);
});

/**
 * Validate a text document and send diagnostics
 */
async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  try {
    // Update the workspace with the latest content
    workspace.updateDocument(textDocument.uri, textDocument.getText());

    // Get diagnostics for this document
    const diagnostics = await diagnosticsProvider.getDiagnostics(
      textDocument.uri
    );

    // Send the computed diagnostics to VS Code
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
  } catch (error) {
    connection.console.error(
      `Error validating document ${textDocument.uri}: ${error}`
    );
  }
}

/**
 * Handle completion requests
 */
connection.onCompletion(
  async (
    textDocumentPosition: TextDocumentPositionParams
  ): Promise<CompletionItem[]> => {
    try {
      return await completionProvider.getCompletions(
        textDocumentPosition.textDocument.uri,
        textDocumentPosition.position
      );
    } catch (error) {
      connection.console.error(`Error providing completions: ${error}`);
      return [];
    }
  }
);

/**
 * Handle completion item resolve requests
 */
connection.onCompletionResolve(
  async (item: CompletionItem): Promise<CompletionItem> => {
    try {
      return await completionProvider.resolveCompletion(item);
    } catch (error) {
      connection.console.error(`Error resolving completion: ${error}`);
      return item;
    }
  }
);

/**
 * Handle go-to-definition requests
 */
connection.onDefinition(
  async (params: DefinitionParams): Promise<Location[]> => {
    try {
      return await definitionProvider.getDefinition(
        params.textDocument.uri,
        params.position
      );
    } catch (error) {
      connection.console.error(`Error providing definition: ${error}`);
      return [];
    }
  }
);

/**
 * Handle hover requests
 */
connection.onHover(async (params: HoverParams): Promise<Hover | null> => {
  try {
    return await hoverProvider.getHover(
      params.textDocument.uri,
      params.position
    );
  } catch (error) {
    connection.console.error(`Error providing hover: ${error}`);
    return null;
  }
});

/**
 * Handle find references requests
 */
connection.onReferences(
  async (params: ReferenceParams): Promise<Location[]> => {
    try {
      return await referenceProvider.getReferences(
        params.textDocument.uri,
        params.position,
        params.context
      );
    } catch (error) {
      connection.console.error(`Error finding references: ${error}`);
      return [];
    }
  }
);

/**
 * Handle semantic tokens requests
 */
connection.languages.semanticTokens.on(
  async (params: SemanticTokensParams): Promise<SemanticTokens> => {
    try {
      const result = await semanticTokensProvider.getSemanticTokens(
        params.textDocument.uri
      );
      if (result) {
        return result;
      }
      // Return empty semantic tokens if no result
      return { data: [] };
    } catch (error) {
      connection.console.error(`Error providing semantic tokens: ${error}`);
      // Return empty semantic tokens on error
      return { data: [] };
    }
  }
);

/**
 * Handle diagnostic requests
 */
connection.languages.diagnostics.on(async (params) => {
  const document = documents.get(params.textDocument.uri);
  if (document !== undefined) {
    return {
      kind: DocumentDiagnosticReportKind.Full,
      items: await diagnosticsProvider.getDiagnostics(params.textDocument.uri),
    } satisfies DocumentDiagnosticReport;
  } else {
    // We don't know the document. We can either try to read it from disk
    // or we don't report problems for it.
    return {
      kind: DocumentDiagnosticReportKind.Full,
      items: [],
    } satisfies DocumentDiagnosticReport;
  }
});

/**
 * Handle workspace diagnostic requests
 */
connection.languages.diagnostics.onWorkspace(async (params) => {
  const resultReports: WorkspaceFullDocumentDiagnosticReport[] = [];

  // Get diagnostics for all LookML documents in the workspace
  for (const document of documents.all()) {
    if (document.uri.endsWith(".lkml")) {
      const diagnostics = await diagnosticsProvider.getDiagnostics(
        document.uri
      );
      resultReports.push({
        uri: document.uri,
        version: document.version,
        kind: DocumentDiagnosticReportKind.Full,
        items: diagnostics,
      });
    }
  }

  return {
    items: resultReports,
  } satisfies WorkspaceDiagnosticReport;
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();

// Log that the server is ready
connection.console.log("LookML Language Server is running");
