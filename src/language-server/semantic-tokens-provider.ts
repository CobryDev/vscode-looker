/**
 * LookML Semantic Token Provider
 *
 * Provides semantic highlighting tokens based on the AST to enable more accurate
 * highlighting than regex-based TextMate grammars. This allows VS Code to color
 * code elements based on their actual meaning in the LookML structure.
 */

import {
  SemanticTokens,
  SemanticTokensBuilder,
  SemanticTokensLegend,
  Position as LSPPosition,
} from "vscode-languageserver/node";

import { LookMLWorkspace } from "./workspace";
import {
  LookMLFile,
  AnyASTNode,
  ViewNode,
  ExploreNode,
  ModelNode,
  DimensionNode,
  MeasureNode,
  FilterNode,
  ParameterNode,
  DimensionGroupNode,
  JoinNode,
  DerivedTableNode,
  ASTVisitor,
  traverseAST,
  Position,
} from "../workspace-tools/ast-types";

/**
 * Semantic token types that will be available for highlighting
 * These map to VS Code's built-in semantic token types and custom ones
 */
export const SEMANTIC_TOKEN_TYPES = [
  // VS Code built-in types
  "class", // Views, Explores, Models (main constructs)
  "function", // Measures, Parameters (functional elements)
  "variable", // Dimensions, Filters (data elements)
  "property", // Field names within constructs
  "parameter", // Parameter names
  "string", // String literals
  "number", // Numeric literals
  "keyword", // LookML keywords (type, sql, etc.)
  "comment", // Comments
  "operator", // SQL operators

  // Custom LookML-specific types
  "dimension", // Dimension fields
  "measure", // Measure fields
  "filter", // Filter fields
  "dimensionGroup", // Dimension group fields
  "join", // Join declarations
  "view", // View names
  "explore", // Explore names
  "model", // Model names
  "fieldReference", // References to other fields
  "sqlExpression", // SQL code blocks
] as const;

/**
 * Semantic token modifiers for additional styling
 */
export const SEMANTIC_TOKEN_MODIFIERS = [
  "declaration", // When a construct is being declared
  "definition", // When a construct is being defined
  "readonly", // Read-only fields
  "static", // Static/configuration parameters
  "deprecated", // Deprecated fields
  "modification", // Modified/overridden fields
  "documentation", // Documentation strings
  "defaultLibrary", // Built-in LookML functions
] as const;

/**
 * Creates the semantic tokens legend for the language server
 */
export function createSemanticTokensLegend(): SemanticTokensLegend {
  return {
    tokenTypes: [...SEMANTIC_TOKEN_TYPES],
    tokenModifiers: [...SEMANTIC_TOKEN_MODIFIERS],
  };
}

/**
 * Provides semantic tokens for LookML documents
 */
export class LookMLSemanticTokensProvider {
  private workspace: LookMLWorkspace;

  constructor(workspace: LookMLWorkspace) {
    this.workspace = workspace;
  }

  /**
   * Generate semantic tokens for a document
   */
  async getSemanticTokens(uri: string): Promise<SemanticTokens> {
    const document = this.workspace.getDocument(uri);
    if (!document?.ast) {
      // Return empty tokens if no AST is available
      return { data: [] };
    }

    const builder = new SemanticTokensBuilder();
    const tokenCollector = new SemanticTokenCollector(
      builder,
      document.content
    );

    // Visit the entire AST and collect semantic tokens
    this.collectFileTokens(document.ast, tokenCollector);

    return builder.build();
  }

  /**
   * Collect tokens from the entire file AST
   */
  private collectFileTokens(
    ast: LookMLFile,
    collector: SemanticTokenCollector
  ): void {
    // Process top-level constructs
    Object.values(ast.views).forEach((view) =>
      this.collectViewTokens(view, collector)
    );
    Object.values(ast.explores).forEach((explore) =>
      this.collectExploreTokens(explore, collector)
    );
    Object.values(ast.models).forEach((model) =>
      this.collectModelTokens(model, collector)
    );
    Object.values(ast.dashboards).forEach((dashboard) =>
      this.collectConstructTokens(dashboard, "class", collector)
    );
  }

  /**
   * Collect tokens for a view construct
   */
  private collectViewTokens(
    view: ViewNode,
    collector: SemanticTokenCollector
  ): void {
    // Mark the view name as a class declaration
    collector.addToken(view.position, "view", ["declaration"], view.name);

    // Collect field tokens
    Object.values(view.dimensions).forEach((dim) =>
      collector.addToken(dim.position, "dimension", ["declaration"], dim.name)
    );
    Object.values(view.measures).forEach((measure) =>
      collector.addToken(
        measure.position,
        "measure",
        ["declaration"],
        measure.name
      )
    );
    Object.values(view.filters).forEach((filter) =>
      collector.addToken(
        filter.position,
        "filter",
        ["declaration"],
        filter.name
      )
    );
    Object.values(view.parameterNodes).forEach((param) =>
      collector.addToken(
        param.position,
        "parameter",
        ["declaration"],
        param.name
      )
    );
    Object.values(view.dimensionGroups).forEach((dimGroup) =>
      collector.addToken(
        dimGroup.position,
        "dimensionGroup",
        ["declaration"],
        dimGroup.name
      )
    );

    // Collect parameter tokens within the view
    this.collectParameterTokens(view, collector);

    // Process derived table if present
    if (view.derivedTable) {
      this.collectConstructTokens(view.derivedTable, "class", collector);
    }
  }

  /**
   * Collect tokens for an explore construct
   */
  private collectExploreTokens(
    explore: ExploreNode,
    collector: SemanticTokenCollector
  ): void {
    // Mark the explore name as a class declaration
    collector.addToken(
      explore.position,
      "explore",
      ["declaration"],
      explore.name
    );

    // Collect join tokens
    Object.values(explore.joins).forEach((join) =>
      collector.addToken(join.position, "join", ["declaration"], join.name)
    );

    // Collect parameter tokens
    this.collectParameterTokens(explore, collector);
  }

  /**
   * Collect tokens for a model construct
   */
  private collectModelTokens(
    model: ModelNode,
    collector: SemanticTokenCollector
  ): void {
    // Mark the model name as a class declaration
    collector.addToken(model.position, "model", ["declaration"], model.name);

    // Process explores within the model
    Object.values(model.explores).forEach((explore) =>
      this.collectExploreTokens(explore, collector)
    );

    // Collect parameter tokens
    this.collectParameterTokens(model, collector);
  }

  /**
   * Collect tokens for any generic construct
   */
  private collectConstructTokens(
    construct: AnyASTNode,
    tokenType: (typeof SEMANTIC_TOKEN_TYPES)[number],
    collector: SemanticTokenCollector
  ): void {
    collector.addToken(construct.position, tokenType, ["declaration"]);

    if ("parameters" in construct) {
      this.collectParameterTokens(construct as any, collector);
    }
  }

  /**
   * Collect parameter tokens from a parameterized construct
   */
  private collectParameterTokens(
    construct: any,
    collector: SemanticTokenCollector
  ): void {
    if (!construct.parameters) return;

    for (const [paramName, paramValue] of Object.entries(
      construct.parameters
    )) {
      // For now, we'll use simple heuristics to identify parameter types
      // This could be enhanced with more sophisticated analysis

      if (paramName === "sql" || paramName === "sql_on") {
        // SQL expressions should be highlighted as SQL
        collector.addParameterToken(paramName, "sqlExpression", ["definition"]);
      } else if (paramName === "type") {
        // Type parameters are keywords
        collector.addParameterToken(paramName, "keyword", ["definition"]);
      } else if (typeof paramValue === "string" && paramValue.includes("${")) {
        // Field references (liquid template variables)
        collector.addParameterToken(paramName, "fieldReference", [
          "definition",
        ]);
      } else if (typeof paramValue === "string") {
        // Regular string parameters
        collector.addParameterToken(paramName, "string", ["definition"]);
      } else if (typeof paramValue === "number") {
        // Numeric parameters
        collector.addParameterToken(paramName, "number", ["definition"]);
      } else {
        // Generic property
        collector.addParameterToken(paramName, "property", ["definition"]);
      }
    }
  }
}

/**
 * Helper class to collect semantic tokens with position tracking
 */
class SemanticTokenCollector {
  private builder: SemanticTokensBuilder;
  private content: string;
  private lines: string[];

  constructor(builder: SemanticTokensBuilder, content: string) {
    this.builder = builder;
    this.content = content;
    this.lines = content.split("\n");
  }

  /**
   * Add a semantic token for an AST node
   */
  addToken(
    position: Position,
    tokenType: (typeof SEMANTIC_TOKEN_TYPES)[number],
    modifiers: (typeof SEMANTIC_TOKEN_MODIFIERS)[number][] = [],
    name?: string
  ): void {
    const tokenTypeIndex = SEMANTIC_TOKEN_TYPES.indexOf(tokenType);
    if (tokenTypeIndex === -1) return;

    const modifierBits = modifiers.reduce((bits, modifier) => {
      const modifierIndex = SEMANTIC_TOKEN_MODIFIERS.indexOf(modifier);
      return modifierIndex !== -1 ? bits | (1 << modifierIndex) : bits;
    }, 0);

    // Calculate the length of the token
    const length = name ? name.length : this.calculateTokenLength(position);

    this.builder.push(
      position.startLine,
      position.startChar,
      length,
      tokenTypeIndex,
      modifierBits
    );
  }

  /**
   * Add a semantic token for a parameter (when we don't have exact position)
   */
  addParameterToken(
    paramName: string,
    tokenType: (typeof SEMANTIC_TOKEN_TYPES)[number],
    modifiers: (typeof SEMANTIC_TOKEN_MODIFIERS)[number][] = []
  ): void {
    // For parameters, we'd need to search for their position in the content
    // This is a simplified implementation - in practice, you'd want to
    // enhance the AST to include parameter positions
    const tokenTypeIndex = SEMANTIC_TOKEN_TYPES.indexOf(tokenType);
    if (tokenTypeIndex === -1) return;

    const modifierBits = modifiers.reduce((bits, modifier) => {
      const modifierIndex = SEMANTIC_TOKEN_MODIFIERS.indexOf(modifier);
      return modifierIndex !== -1 ? bits | (1 << modifierIndex) : bits;
    }, 0);

    // For now, skip parameters without exact positions
    // TODO: Enhance AST parser to include parameter positions
  }

  /**
   * Calculate the length of a token based on its position
   */
  private calculateTokenLength(position: Position): number {
    if (position.startLine === position.endLine) {
      return position.endChar - position.startChar;
    } else {
      // Multi-line token - for now, just use the first line
      const line = this.lines[position.startLine] || "";
      return line.length - position.startChar;
    }
  }
}
