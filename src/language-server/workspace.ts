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
import { SemanticAnalyzer } from "./semantic-analyzer";
import { SemanticModel } from "./semantic-model";

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
  private workspacePath: string;
  private semanticAnalyzer = new SemanticAnalyzer();
  public semanticModel: SemanticModel;

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
    // Initialize with an initial analysis model (empty until documents are loaded)
    this.semanticModel = this.semanticAnalyzer.analyze(this);
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

      // Run semantic analysis after initial load
      this.semanticModel = this.semanticAnalyzer.analyze(this);
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
    // Trigger semantic analysis on document update
    this.semanticModel = this.semanticAnalyzer.analyze(this);
  }

  /**
   * Remove a document from the workspace
   */
  removeDocument(uri: string): void {
    this.documents.delete(uri);
    this.semanticModel = this.semanticAnalyzer.analyze(this);
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
    // Keep analysis in sync when parse/store happens through this path
    this.semanticModel = this.semanticAnalyzer.analyze(this);
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
      totalViews: Array.from(this.semanticModel.symbols.values()).filter(
        (s) => s.type === "view"
      ).length,
      totalExplores: Array.from(this.semanticModel.symbols.values()).filter(
        (s) => s.type === "explore"
      ).length,
      totalModels: parsedDocs.reduce(
        (count, doc) =>
          count + (doc.ast ? Object.keys(doc.ast.models).length : 0),
        0
      ),
    };
  }
}
