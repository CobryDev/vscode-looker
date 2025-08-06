/**
 * LookML Workspace Manager
 *
 * Manages the workspace state, including ASTs for all LookML files,
 * document synchronization, and cross-file analysis capabilities.
 */

import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";
import { URI } from "vscode-uri";

import { LookMLASTParser, ASTParseResult } from "../workspace-tools/ast-parser";
import {
  LookMLFile,
  ViewNode,
  ExploreNode,
  ModelNode,
  AnyASTNode,
} from "../workspace-tools/ast-types";

/**
 * Represents a parsed LookML document in the workspace
 */
export interface WorkspaceDocument {
  uri: string;
  fileName: string;
  content: string;
  ast?: LookMLFile;
  parseResult: ASTParseResult;
  lastModified: number;
}

/**
 * Information about a LookML symbol (view, explore, dimension, etc.)
 */
export interface SymbolInfo {
  name: string;
  type: string;
  uri: string;
  fileName: string;
  startLine: number;
  startChar: number;
  endLine: number;
  endChar: number;
  node: AnyASTNode;
}

/**
 * Manages the LookML workspace and provides analysis capabilities
 */
export class LookMLWorkspace {
  private documents = new Map<string, WorkspaceDocument>();
  private symbolIndex = new Map<string, SymbolInfo[]>();
  private viewIndex = new Map<string, SymbolInfo>();
  private exploreIndex = new Map<string, SymbolInfo>();
  private workspacePath: string;

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
  }

  /**
   * Initialize the workspace by scanning for LookML files
   */
  async initialize(): Promise<void> {
    try {
      const lookmlFiles = await glob(`${this.workspacePath}/**/*.lkml`);

      for (const filePath of lookmlFiles) {
        const uri = URI.file(filePath).toString();
        await this.loadDocument(uri);
      }

      this.rebuildIndexes();
    } catch (error) {
      throw new Error(`Failed to initialize workspace: ${error}`);
    }
  }

  /**
   * Load a document from disk
   */
  private async loadDocument(uri: string): Promise<void> {
    try {
      const filePath = URI.parse(uri).fsPath;
      const content = await fs.promises.readFile(filePath, "utf-8");
      const fileName = path.basename(filePath);
      const stats = await fs.promises.stat(filePath);

      await this.parseAndStoreDocument(
        uri,
        fileName,
        content,
        stats.mtime.getTime()
      );
    } catch (error) {
      console.error(`Failed to load document ${uri}: ${error}`);
    }
  }

  /**
   * Update a document's content (called when document changes in editor)
   */
  updateDocument(uri: string, content: string): void {
    const fileName = path.basename(URI.parse(uri).fsPath);
    this.parseAndStoreDocument(uri, fileName, content, Date.now());
  }

  /**
   * Remove a document from the workspace
   */
  removeDocument(uri: string): void {
    this.documents.delete(uri);
    this.rebuildIndexes();
  }

  /**
   * Parse and store a document
   */
  private parseAndStoreDocument(
    uri: string,
    fileName: string,
    content: string,
    lastModified: number
  ): void {
    const parseResult = LookMLASTParser.parseContent(content, fileName);

    const document: WorkspaceDocument = {
      uri,
      fileName,
      content,
      ast: parseResult.success ? parseResult.ast : undefined,
      parseResult,
      lastModified,
    };

    this.documents.set(uri, document);
    this.rebuildIndexes();
  }

  /**
   * Get a document by URI
   */
  getDocument(uri: string): WorkspaceDocument | undefined {
    return this.documents.get(uri);
  }

  /**
   * Get all documents in the workspace
   */
  getAllDocuments(): WorkspaceDocument[] {
    return Array.from(this.documents.values());
  }

  /**
   * Get all successfully parsed documents
   */
  getParsedDocuments(): WorkspaceDocument[] {
    return this.getAllDocuments().filter((doc) => doc.ast);
  }

  /**
   * Find a view by name across the workspace
   */
  findView(viewName: string): SymbolInfo | undefined {
    return this.viewIndex.get(viewName);
  }

  /**
   * Find an explore by name across the workspace
   */
  findExplore(exploreName: string): SymbolInfo | undefined {
    return this.exploreIndex.get(exploreName);
  }

  /**
   * Find symbols by name (fuzzy search)
   */
  findSymbols(query: string): SymbolInfo[] {
    const results: SymbolInfo[] = [];
    const lowerQuery = query.toLowerCase();

    for (const symbols of this.symbolIndex.values()) {
      for (const symbol of symbols) {
        if (symbol.name.toLowerCase().includes(lowerQuery)) {
          results.push(symbol);
        }
      }
    }

    return results.sort((a, b) => {
      // Exact matches first
      const aExact = a.name.toLowerCase() === lowerQuery;
      const bExact = b.name.toLowerCase() === lowerQuery;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      // Then prefix matches
      const aPrefix = a.name.toLowerCase().startsWith(lowerQuery);
      const bPrefix = b.name.toLowerCase().startsWith(lowerQuery);
      if (aPrefix && !bPrefix) return -1;
      if (!aPrefix && bPrefix) return 1;

      // Finally alphabetical
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Get all views in the workspace
   */
  getAllViews(): SymbolInfo[] {
    return Array.from(this.viewIndex.values());
  }

  /**
   * Get all explores in the workspace
   */
  getAllExplores(): SymbolInfo[] {
    return Array.from(this.exploreIndex.values());
  }

  /**
   * Get symbols at a specific position in a document
   */
  getSymbolAt(
    uri: string,
    line: number,
    character: number
  ): SymbolInfo | undefined {
    const symbols = this.symbolIndex.get(uri);
    if (!symbols) return undefined;

    // Find the most specific symbol at this position
    let bestMatch: SymbolInfo | undefined;
    let smallestRange = Infinity;

    for (const symbol of symbols) {
      if (this.isPositionInRange(line, character, symbol)) {
        const range =
          (symbol.endLine - symbol.startLine) * 1000 +
          (symbol.endChar - symbol.startChar);
        if (range < smallestRange) {
          smallestRange = range;
          bestMatch = symbol;
        }
      }
    }

    return bestMatch;
  }

  /**
   * Check if a position is within a symbol's range
   */
  private isPositionInRange(
    line: number,
    character: number,
    symbol: SymbolInfo
  ): boolean {
    if (line < symbol.startLine || line > symbol.endLine) {
      return false;
    }
    if (line === symbol.startLine && character < symbol.startChar) {
      return false;
    }
    if (line === symbol.endLine && character > symbol.endChar) {
      return false;
    }
    return true;
  }

  /**
   * Find all references to a symbol
   */
  findReferences(symbolName: string, symbolType?: string): SymbolInfo[] {
    const references: SymbolInfo[] = [];

    for (const doc of this.getParsedDocuments()) {
      const docReferences = this.findReferencesInDocument(
        doc,
        symbolName,
        symbolType
      );
      references.push(...docReferences);
    }

    return references;
  }

  /**
   * Find references to a symbol within a specific document
   */
  private findReferencesInDocument(
    doc: WorkspaceDocument,
    symbolName: string,
    symbolType?: string
  ): SymbolInfo[] {
    const references: SymbolInfo[] = [];

    if (!doc.ast) return references;

    // For now, implement basic reference finding
    // This can be enhanced with more sophisticated analysis
    const symbols = this.symbolIndex.get(doc.uri) || [];

    for (const symbol of symbols) {
      if (
        symbol.name === symbolName &&
        (!symbolType || symbol.type === symbolType)
      ) {
        references.push(symbol);
      }
    }

    return references;
  }

  /**
   * Rebuild symbol indexes after document changes
   */
  private rebuildIndexes(): void {
    this.symbolIndex.clear();
    this.viewIndex.clear();
    this.exploreIndex.clear();

    for (const doc of this.getParsedDocuments()) {
      this.indexDocument(doc);
    }
  }

  /**
   * Index symbols in a document
   */
  private indexDocument(doc: WorkspaceDocument): void {
    if (!doc.ast) return;

    const symbols: SymbolInfo[] = [];

    // Index views
    for (const [viewName, viewNode] of Object.entries(doc.ast.views)) {
      const viewSymbol = this.createSymbolInfo(viewName, "view", doc, viewNode);
      symbols.push(viewSymbol);
      this.viewIndex.set(viewName, viewSymbol);

      // Index fields within the view
      this.indexViewFields(viewNode, doc, symbols);
    }

    // Index explores
    for (const [exploreName, exploreNode] of Object.entries(doc.ast.explores)) {
      const exploreSymbol = this.createSymbolInfo(
        exploreName,
        "explore",
        doc,
        exploreNode
      );
      symbols.push(exploreSymbol);
      this.exploreIndex.set(exploreName, exploreSymbol);

      // Index joins within the explore
      this.indexExploreJoins(exploreNode, doc, symbols);
    }

    // Index models
    for (const [modelName, modelNode] of Object.entries(doc.ast.models)) {
      const modelSymbol = this.createSymbolInfo(
        modelName,
        "model",
        doc,
        modelNode
      );
      symbols.push(modelSymbol);
    }

    this.symbolIndex.set(doc.uri, symbols);
  }

  /**
   * Index fields within a view
   */
  private indexViewFields(
    viewNode: ViewNode,
    doc: WorkspaceDocument,
    symbols: SymbolInfo[]
  ): void {
    // Index dimensions
    for (const [dimName, dimNode] of Object.entries(viewNode.dimensions)) {
      symbols.push(this.createSymbolInfo(dimName, "dimension", doc, dimNode));
    }

    // Index measures
    for (const [measureName, measureNode] of Object.entries(
      viewNode.measures
    )) {
      symbols.push(
        this.createSymbolInfo(measureName, "measure", doc, measureNode)
      );
    }

    // Index filters
    for (const [filterName, filterNode] of Object.entries(viewNode.filters)) {
      symbols.push(
        this.createSymbolInfo(filterName, "filter", doc, filterNode)
      );
    }

    // Index parameters
    for (const [paramName, paramNode] of Object.entries(
      viewNode.parameterNodes
    )) {
      symbols.push(
        this.createSymbolInfo(paramName, "parameter", doc, paramNode)
      );
    }

    // Index dimension groups
    for (const [groupName, groupNode] of Object.entries(
      viewNode.dimensionGroups
    )) {
      symbols.push(
        this.createSymbolInfo(groupName, "dimension_group", doc, groupNode)
      );
    }
  }

  /**
   * Index joins within an explore
   */
  private indexExploreJoins(
    exploreNode: ExploreNode,
    doc: WorkspaceDocument,
    symbols: SymbolInfo[]
  ): void {
    for (const [joinName, joinNode] of Object.entries(exploreNode.joins)) {
      symbols.push(this.createSymbolInfo(joinName, "join", doc, joinNode));
    }
  }

  /**
   * Create a SymbolInfo object from an AST node
   */
  private createSymbolInfo(
    name: string,
    type: string,
    doc: WorkspaceDocument,
    node: AnyASTNode
  ): SymbolInfo {
    return {
      name,
      type,
      uri: doc.uri,
      fileName: doc.fileName,
      startLine: node.position.startLine,
      startChar: node.position.startChar,
      endLine: node.position.endLine,
      endChar: node.position.endChar,
      node,
    };
  }

  /**
   * Get workspace statistics
   */
  getWorkspaceStats(): {
    totalFiles: number;
    parsedFiles: number;
    errorFiles: number;
    totalViews: number;
    totalExplores: number;
    totalModels: number;
  } {
    const allDocs = this.getAllDocuments();
    const parsedDocs = this.getParsedDocuments();

    return {
      totalFiles: allDocs.length,
      parsedFiles: parsedDocs.length,
      errorFiles: allDocs.length - parsedDocs.length,
      totalViews: this.viewIndex.size,
      totalExplores: this.exploreIndex.size,
      totalModels: parsedDocs.reduce(
        (count, doc) =>
          count + (doc.ast ? Object.keys(doc.ast.models).length : 0),
        0
      ),
    };
  }
}
