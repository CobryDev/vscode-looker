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
 * Using only standard VS Code semantic token types for maximum theme compatibility
 */
export const SEMANTIC_TOKEN_TYPES = [
  // Standard VS Code semantic token types
  "class", // Views, Explores, Models, Joins (main constructs)
  "function", // Measures (functional elements)
  "variable", // Dimensions, Filters, Parameters, Dimension Groups (data elements)
  "property", // Field names within constructs
  "parameter", // Parameter names
  "string", // String literals
  "number", // Numeric literals
  "keyword", // LookML keywords (type, sql, etc.)
  "comment", // Comments
  "operator", // SQL operators
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

    const result = builder.build();

    // Debug: Show what we're sending to VS Code
    console.log(
      `[SEMANTIC] Generated ${result.data.length / 5} tokens for ${uri}`
    );
    console.log(`[SEMANTIC] Token types legend:`, SEMANTIC_TOKEN_TYPES);

    // Log first few tokens for debugging
    if (result.data.length > 0) {
      for (let i = 0; i < Math.min(15, result.data.length); i += 5) {
        const line = result.data[i];
        const char = result.data[i + 1];
        const length = result.data[i + 2];
        const tokenTypeIndex = result.data[i + 3];
        const modifiers = result.data[i + 4];
        const tokenType = SEMANTIC_TOKEN_TYPES[tokenTypeIndex] || "INVALID";
        console.log(
          `[SEMANTIC] Token ${
            i / 5
          }: Line ${line}, Char ${char}, Len ${length}, Type: ${tokenType}(${tokenTypeIndex})`
        );
      }
    }

    return result;
  }

  /**
   * Collect tokens from the entire file AST
   */
  private collectFileTokens(
    ast: LookMLFile,
    collector: SemanticTokenCollector
  ): void {
    // Process top-level constructs from the AST first (more accurate)
    Object.values(ast.views).forEach((view) =>
      this.collectViewTokens(view, collector)
    );

    Object.values(ast.explores).forEach((explore) =>
      this.collectExploreTokens(explore, collector)
    );

    Object.values(ast.models).forEach((model) =>
      this.collectModelTokens(model, collector)
    );

    // The fallback scanner has been removed to prevent token conflicts.
  }

  /**
   * Collect tokens for a view construct
   */
  private collectViewTokens(
    view: ViewNode,
    collector: SemanticTokenCollector
  ): void {
    // Highlight the "view:" keyword
    collector.addKeywordAtPosition(view.position, "view", "keyword");

    // Mark the view name as a class declaration (using standard token type)
    collector.addToken(view.position, "class", ["declaration"], view.name);

    // Collect field tokens with their keywords
    Object.values(view.dimensions).forEach((dim) => {
      collector.addKeywordAtPosition(dim.position, "dimension", "keyword");
      // Mark dimension name as a 'variable' (using standard token type)
      collector.addToken(dim.position, "variable", ["declaration"], dim.name);
      this.collectParameterTokens(dim, collector);
    });

    Object.values(view.measures).forEach((measure) => {
      collector.addKeywordAtPosition(measure.position, "measure", "keyword");
      // Mark measure name as a 'function' (using standard token type)
      collector.addToken(
        measure.position,
        "function",
        ["declaration"],
        measure.name
      );
      this.collectParameterTokens(measure, collector);
    });

    Object.values(view.filters).forEach((filter) => {
      collector.addKeywordAtPosition(filter.position, "filter", "keyword");
      // Mark filter name as a 'variable' (using standard token type)
      collector.addToken(
        filter.position,
        "variable",
        ["declaration"],
        filter.name
      );
      this.collectParameterTokens(filter, collector);
    });

    Object.values(view.parameterNodes).forEach((param) => {
      collector.addKeywordAtPosition(param.position, "parameter", "keyword");
      // Mark parameter name as a 'variable' (using standard token type)
      collector.addToken(
        param.position,
        "variable",
        ["declaration"],
        param.name
      );
      this.collectParameterTokens(param, collector);
    });

    Object.values(view.dimensionGroups).forEach((dimGroup) => {
      collector.addKeywordAtPosition(
        dimGroup.position,
        "dimension_group",
        "keyword"
      );
      // Mark dimension group name as a 'variable' (using standard token type)
      collector.addToken(
        dimGroup.position,
        "variable",
        ["declaration"],
        dimGroup.name
      );
      this.collectParameterTokens(dimGroup, collector);
    });

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
    // Highlight the "explore:" keyword
    collector.addKeywordAtPosition(explore.position, "explore", "keyword");

    // Mark the explore name as a class declaration (using standard token type)
    collector.addToken(
      explore.position,
      "class",
      ["declaration"],
      explore.name
    );

    // Collect join tokens
    Object.values(explore.joins).forEach((join) => {
      collector.addKeywordAtPosition(join.position, "join", "keyword");
      // Mark join name as a 'class' (using standard token type)
      collector.addToken(join.position, "class", ["declaration"], join.name);
      this.collectParameterTokens(join, collector);
    });

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
    // Highlight the "model:" keyword if this is a model file
    collector.addKeywordAtPosition(model.position, "model", "keyword");

    // Mark the model name as a class declaration (using standard token type)
    collector.addToken(model.position, "class", ["declaration"], model.name);

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
    // Ensure we have a valid construct with parameters and a position
    if (!construct.parameters || !construct.position) return;

    // For each parameter the AST found for this construct...
    for (const [paramName, paramValue] of Object.entries(
      construct.parameters
    )) {
      // Determine the appropriate token type for the parameter's VALUE
      let valueTokenType: (typeof SEMANTIC_TOKEN_TYPES)[number];

      if (paramName === "type" || typeof paramValue === "boolean") {
        // Values like 'string', 'number', 'yesno', 'yes', 'no' are keywords
        valueTokenType = "keyword";
      } else if (paramName === "sql" || paramName === "sql_on") {
        // SQL content is best represented as a string or variable
        valueTokenType = "string";
      } else if (typeof paramValue === "number") {
        valueTokenType = "number";
      } else {
        // Default to string for everything else (e.g., label, description)
        valueTokenType = "string";
      }

      // Ask the collector to highlight both the key and the value
      collector.highlightParameter(
        construct.position,
        paramName,
        String(paramValue),
        "keyword", // The key (e.g., "type:") is always a keyword
        valueTokenType // The value gets our calculated type
      );
    }
  }

  /**
   * Collect tokens by scanning for keywords in the text
   * This is a fallback for keywords not covered by AST
   */
  private collectKeywordTokens(collector: SemanticTokenCollector): void {
    // Only scan for parameter keywords that might be missed by AST
    const parameterKeywords = [
      "type",
      "sql",
      "sql_on",
      "label",
      "description",
      "hidden",
      "drill_fields",
      "timeframes",
      "group_label",
      "primary_key",
    ];

    collector.scanForKeywords(parameterKeywords, "keyword");

    // Scan for common LookML type values
    const typeValues = [
      "string",
      "number",
      "date",
      "time",
      "count",
      "sum",
      "average",
      "count_distinct",
      "yes",
      "no",
    ];

    collector.scanForValues(typeValues, "keyword");
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
    if (tokenTypeIndex === -1) {
      console.log(`[WARNING] Unknown token type: ${tokenType}`);
      return;
    }

    const modifierBits = modifiers.reduce((bits, modifier) => {
      const modifierIndex = SEMANTIC_TOKEN_MODIFIERS.indexOf(modifier);
      return modifierIndex !== -1 ? bits | (1 << modifierIndex) : bits;
    }, 0);

    let startChar = position.startChar;
    let length = name ? name.length : this.calculateTokenLength(position);

    // FIX: If a name is provided, find its actual start position on the line.
    if (name) {
      const line = this.lines[position.startLine];
      if (line) {
        // Search for the name starting from the block's start character
        const nameIndex = line.indexOf(name, position.startChar);
        if (nameIndex !== -1) {
          // If found, update the startChar to the correct position.
          startChar = nameIndex;
        }
      }
    }

    this.builder.push(
      position.startLine,
      startChar, // <-- Corrected start position
      length,
      tokenTypeIndex,
      modifierBits
    );

    // Debug: Log token creation
    if (name) {
      console.log(
        `[TOKEN] ${tokenType}: "${name}" at line ${position.startLine}, char ${startChar}`
      );
    }
  }

  /**
   * Add a keyword token at a specific position (like "view:", "dimension:")
   */
  addKeywordAtPosition(
    nodePosition: Position,
    keyword: string,
    tokenType: (typeof SEMANTIC_TOKEN_TYPES)[number],
    modifiers: (typeof SEMANTIC_TOKEN_MODIFIERS)[number][] = []
  ): void {
    const line = this.lines[nodePosition.startLine];
    if (!line) return;

    // Trim leading whitespace to find the keyword at the start of the declaration
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith(`${keyword}:`)) {
      const startChar = line.indexOf(keyword);
      if (startChar !== -1) {
        this.addTokenAtPosition(
          nodePosition.startLine,
          startChar,
          keyword.length,
          tokenType,
          modifiers
        );
      }
    }
  }

  /**
   * Finds and highlights a parameter's key and its value within a construct's scope.
   * Accepts separate token types for the key and the value.
   */
  highlightParameter(
    constructPosition: Position,
    paramName: string,
    paramValue: string,
    keyTokenType: (typeof SEMANTIC_TOKEN_TYPES)[number],
    valueTokenType: (typeof SEMANTIC_TOKEN_TYPES)[number]
  ): void {
    // A simple regex to find the line where the parameter is defined
    const linePattern = new RegExp(`\\b${paramName}\\s*:`);

    // Search only within the lines of the parent construct
    for (
      let i = constructPosition.startLine;
      i <= constructPosition.endLine;
      i++
    ) {
      const line = this.lines[i];
      if (line && linePattern.test(line)) {
        // We found the correct line. Now, tokenize the key and value.

        // 1. Highlight the keyword (e.g., "type:")
        const keyIndex = line.indexOf(`${paramName}:`);
        if (keyIndex !== -1) {
          this.addTokenAtPosition(i, keyIndex, paramName.length, keyTokenType);
        }

        // 2. Highlight the value (e.g., "count" or "string")
        // To avoid highlighting the wrong "count", we search after the key
        const valueIndex = line.indexOf(
          paramValue,
          keyIndex !== -1 ? keyIndex + paramName.length : 0
        );
        if (valueIndex !== -1) {
          // Strip quotes from the value length if they exist
          const valueLength = paramValue.replace(/\"/g, "").length;
          // Adjust start position if value is quoted
          const valueStartPos =
            line.charAt(valueIndex) === '"' ? valueIndex + 1 : valueIndex;

          this.addTokenAtPosition(
            i,
            valueStartPos,
            valueLength,
            valueTokenType
          );
        }

        // Stop after finding the first match for this parameter
        return;
      }
    }
  }

  /**
   * Scan for a specific keyword with a specific token type
   */
  scanForSpecificKeyword(
    keyword: string,
    tokenType: (typeof SEMANTIC_TOKEN_TYPES)[number]
  ): void {
    const keywordPattern = new RegExp(`\\b${keyword}\\s*:`, "g");

    for (let lineIndex = 0; lineIndex < this.lines.length; lineIndex++) {
      const line = this.lines[lineIndex];
      let match;
      while ((match = keywordPattern.exec(line)) !== null) {
        const startChar = match.index;
        this.addTokenAtPosition(
          lineIndex,
          startChar,
          keyword.length,
          tokenType,
          []
        );
      }
    }
  }

  /**
   * Scan for keywords in the document
   */
  scanForKeywords(
    keywords: string[],
    tokenType: (typeof SEMANTIC_TOKEN_TYPES)[number]
  ): void {
    for (const keyword of keywords) {
      const keywordPattern = new RegExp(`\\b${keyword}\\s*:`, "g");

      for (let lineIndex = 0; lineIndex < this.lines.length; lineIndex++) {
        const line = this.lines[lineIndex];
        let match;
        while ((match = keywordPattern.exec(line)) !== null) {
          const startChar = match.index;
          this.addTokenAtPosition(
            lineIndex,
            startChar,
            keyword.length,
            tokenType,
            []
          );
        }
      }
    }
  }

  /**
   * Scan for LookML values in the document
   */
  scanForValues(
    values: string[],
    tokenType: (typeof SEMANTIC_TOKEN_TYPES)[number]
  ): void {
    for (const value of values) {
      // Look for values after a colon (parameter values)
      const valuePattern = new RegExp(`:\\s*${value}\\b`, "g");

      for (let lineIndex = 0; lineIndex < this.lines.length; lineIndex++) {
        const line = this.lines[lineIndex];
        let match;
        while ((match = valuePattern.exec(line)) !== null) {
          const startChar = match.index + match[0].indexOf(value);
          this.addTokenAtPosition(
            lineIndex,
            startChar,
            value.length,
            tokenType,
            []
          );
        }
      }
    }
  }

  /**
   * Helper method to add a token at a specific position
   */
  private addTokenAtPosition(
    line: number,
    startChar: number,
    length: number,
    tokenType: (typeof SEMANTIC_TOKEN_TYPES)[number],
    modifiers: (typeof SEMANTIC_TOKEN_MODIFIERS)[number][] = []
  ): void {
    const tokenTypeIndex = SEMANTIC_TOKEN_TYPES.indexOf(tokenType);
    if (tokenTypeIndex === -1) return;

    const modifierBits = modifiers.reduce((bits, modifier) => {
      const modifierIndex = SEMANTIC_TOKEN_MODIFIERS.indexOf(modifier);
      return modifierIndex !== -1 ? bits | (1 << modifierIndex) : bits;
    }, 0);

    this.builder.push(line, startChar, length, tokenTypeIndex, modifierBits);
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
