import { Diagnostic } from "vscode-languageserver/node";
import { AnyASTNode, Position } from "../workspace-tools/ast-types";

/** Represents a single, unique symbol in the workspace (e.g., a view, a dimension). */
export interface Symbol {
  name: string;
  type: string; // 'view', 'dimension', 'measure', etc.
  declaration: {
    uri: string;
    position: Position;
    node: AnyASTNode;
  };
  references: {
    uri: string;
    position: Position;
  }[];
  /** Optional parent scope for this symbol (e.g., a dimension's parent view, a join's parent explore) */
  parent?: Symbol;
}

/** The comprehensive, analyzed state of the entire workspace. */
export interface SemanticModel {
  /** A map of all symbols in the workspace, keyed by a unique identifier. */
  symbols: Map<string, Symbol>;
  /** Fast lookup from AST node to its semantic symbol. */
  nodeToSymbol: WeakMap<AnyASTNode, Symbol>;
  /** A list of all semantic and syntactic errors found. */
  diagnostics: Diagnostic[];
  /** Diagnostics grouped by document URI for quick lookup. */
  diagnosticsByUri: Map<string, Diagnostic[]>;
  /** A map linking a file URI to the symbols it contains. */
  symbolsByUri: Map<string, Symbol[]>;
  // Future: Add scope tree, type information, etc.
}
