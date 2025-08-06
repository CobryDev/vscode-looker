/**
 * LookML Hover Provider
 *
 * Provides hover information for LookML constructs, showing detailed
 * documentation, type information, and usage examples.
 */

import { Hover, Position, MarkupKind } from "vscode-languageserver/node";
import { LookMLWorkspace } from "./workspace";
import {
  ViewNode,
  ExploreNode,
  DimensionNode,
  MeasureNode,
} from "../workspace-tools/ast-types";

/**
 * Provides hover information for LookML constructs
 */
export class LookMLHoverProvider {
  private workspace: LookMLWorkspace;

  constructor(workspace: LookMLWorkspace) {
    this.workspace = workspace;
  }

  /**
   * Get hover information for the symbol at the given position
   */
  async getHover(uri: string, position: Position): Promise<Hover | null> {
    const document = this.workspace.getDocument(uri);
    if (!document || !document.content) {
      return null;
    }

    // Get the symbol at the current position
    const symbol = this.workspace.getSymbolAt(
      uri,
      position.line,
      position.character
    );
    if (!symbol) {
      return null;
    }

    // Generate hover content based on symbol type
    const hoverContent = this.generateHoverContent(symbol);
    if (!hoverContent) {
      return null;
    }

    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: hoverContent,
      },
      range: {
        start: { line: symbol.startLine, character: symbol.startChar },
        end: { line: symbol.endLine, character: symbol.endChar },
      },
    };
  }

  /**
   * Generate hover content based on symbol information
   */
  private generateHoverContent(symbol: any): string | null {
    switch (symbol.type) {
      case "view":
        return this.generateViewHover(symbol);
      case "explore":
        return this.generateExploreHover(symbol);
      case "dimension":
        return this.generateDimensionHover(symbol);
      case "measure":
        return this.generateMeasureHover(symbol);
      case "filter":
        return this.generateFilterHover(symbol);
      case "parameter":
        return this.generateParameterHover(symbol);
      case "dimension_group":
        return this.generateDimensionGroupHover(symbol);
      case "join":
        return this.generateJoinHover(symbol);
      default:
        return this.generateGenericHover(symbol);
    }
  }

  /**
   * Generate hover content for views
   */
  private generateViewHover(symbol: any): string {
    const viewNode = symbol.node as ViewNode;
    const content: string[] = [];

    content.push(`## View: \`${symbol.name}\``);
    content.push("");

    // Basic information
    content.push("**Type:** View");
    content.push(`**File:** ${symbol.fileName}`);
    content.push("");

    // Description if available
    if (viewNode.parameters.description) {
      content.push(`**Description:** ${viewNode.parameters.description}`);
      content.push("");
    }

    // SQL table name if available
    if (viewNode.parameters.sql_table_name) {
      content.push(`**SQL Table:** \`${viewNode.parameters.sql_table_name}\``);
      content.push("");
    }

    // Field counts
    const dimensionCount = Object.keys(viewNode.dimensions).length;
    const measureCount = Object.keys(viewNode.measures).length;
    const filterCount = Object.keys(viewNode.filters).length;
    const parameterCount = Object.keys(viewNode.parameterNodes).length;
    const dimensionGroupCount = Object.keys(viewNode.dimensionGroups).length;

    content.push("**Fields:**");
    content.push(`- ${dimensionCount} dimension(s)`);
    content.push(`- ${measureCount} measure(s)`);
    if (filterCount > 0) content.push(`- ${filterCount} filter(s)`);
    if (parameterCount > 0) content.push(`- ${parameterCount} parameter(s)`);
    if (dimensionGroupCount > 0)
      content.push(`- ${dimensionGroupCount} dimension group(s)`);

    return content.join("\n");
  }

  /**
   * Generate hover content for explores
   */
  private generateExploreHover(symbol: any): string {
    const exploreNode = symbol.node as ExploreNode;
    const content: string[] = [];

    content.push(`## Explore: \`${symbol.name}\``);
    content.push("");

    content.push("**Type:** Explore");
    content.push(`**File:** ${symbol.fileName}`);
    content.push("");

    // Description if available
    if (exploreNode.parameters.description) {
      content.push(`**Description:** ${exploreNode.parameters.description}`);
      content.push("");
    }

    // Base view if available
    if (exploreNode.baseView) {
      content.push(`**Base View:** \`${exploreNode.baseView}\``);
      content.push("");
    }

    // Join information
    const joinCount = Object.keys(exploreNode.joins).length;
    if (joinCount > 0) {
      content.push(`**Joins:** ${joinCount} view(s)`);
      const joinNames = Object.keys(exploreNode.joins);
      content.push(joinNames.map((name) => `- \`${name}\``).join("\n"));
    }

    return content.join("\n");
  }

  /**
   * Generate hover content for dimensions
   */
  private generateDimensionHover(symbol: any): string {
    const dimensionNode = symbol.node as DimensionNode;
    const content: string[] = [];

    content.push(`## Dimension: \`${symbol.name}\``);
    content.push("");

    content.push("**Type:** Dimension");
    content.push(`**File:** ${symbol.fileName}`);
    content.push("");

    // Data type
    if (dimensionNode.dataType) {
      content.push(`**Data Type:** \`${dimensionNode.dataType}\``);
    }

    // SQL expression
    if (dimensionNode.sql) {
      content.push(`**SQL:** \`${dimensionNode.sql.trim()}\``);
    }

    // Primary key
    if (dimensionNode.primaryKey) {
      content.push("**Primary Key:** Yes");
    }

    // Hidden status
    if (dimensionNode.hidden) {
      content.push("**Hidden:** Yes");
    }

    // Description
    if (dimensionNode.parameters.description) {
      content.push("");
      content.push(`**Description:** ${dimensionNode.parameters.description}`);
    }

    // Label
    if (dimensionNode.parameters.label) {
      content.push(`**Label:** ${dimensionNode.parameters.label}`);
    }

    return content.join("\n");
  }

  /**
   * Generate hover content for measures
   */
  private generateMeasureHover(symbol: any): string {
    const measureNode = symbol.node as MeasureNode;
    const content: string[] = [];

    content.push(`## Measure: \`${symbol.name}\``);
    content.push("");

    content.push("**Type:** Measure");
    content.push(`**File:** ${symbol.fileName}`);
    content.push("");

    // Measure type
    if (measureNode.measureType) {
      content.push(`**Measure Type:** \`${measureNode.measureType}\``);
    }

    // SQL expression
    if (measureNode.sql) {
      content.push(`**SQL:** \`${measureNode.sql.trim()}\``);
    }

    // Drill fields
    if (measureNode.drillFields && measureNode.drillFields.length > 0) {
      content.push(
        `**Drill Fields:** ${measureNode.drillFields
          .map((f) => `\`${f}\``)
          .join(", ")}`
      );
    }

    // Hidden status
    if (measureNode.hidden) {
      content.push("**Hidden:** Yes");
    }

    // Description
    if (measureNode.parameters.description) {
      content.push("");
      content.push(`**Description:** ${measureNode.parameters.description}`);
    }

    // Label
    if (measureNode.parameters.label) {
      content.push(`**Label:** ${measureNode.parameters.label}`);
    }

    // Value format
    if (measureNode.parameters.value_format) {
      content.push(
        `**Value Format:** \`${measureNode.parameters.value_format}\``
      );
    }

    return content.join("\n");
  }

  /**
   * Generate hover content for filters
   */
  private generateFilterHover(symbol: any): string {
    const content: string[] = [];

    content.push(`## Filter: \`${symbol.name}\``);
    content.push("");

    content.push("**Type:** Filter");
    content.push(`**File:** ${symbol.fileName}`);

    // Add filter-specific information
    const filterNode = symbol.node;
    if (filterNode.filterType) {
      content.push(`**Filter Type:** \`${filterNode.filterType}\``);
    }

    if (filterNode.defaultValue) {
      content.push(`**Default Value:** \`${filterNode.defaultValue}\``);
    }

    return content.join("\n");
  }

  /**
   * Generate hover content for parameters
   */
  private generateParameterHover(symbol: any): string {
    const content: string[] = [];

    content.push(`## Parameter: \`${symbol.name}\``);
    content.push("");

    content.push("**Type:** Parameter");
    content.push(`**File:** ${symbol.fileName}`);

    // Add parameter-specific information
    const parameterNode = symbol.node;
    if (parameterNode.parameterType) {
      content.push(`**Parameter Type:** \`${parameterNode.parameterType}\``);
    }

    if (parameterNode.defaultValue) {
      content.push(`**Default Value:** \`${parameterNode.defaultValue}\``);
    }

    if (parameterNode.allowedValues) {
      content.push("**Has Allowed Values:** Yes");
    }

    return content.join("\n");
  }

  /**
   * Generate hover content for dimension groups
   */
  private generateDimensionGroupHover(symbol: any): string {
    const content: string[] = [];

    content.push(`## Dimension Group: \`${symbol.name}\``);
    content.push("");

    content.push("**Type:** Dimension Group");
    content.push(`**File:** ${symbol.fileName}`);

    // Add dimension group-specific information
    const groupNode = symbol.node;
    if (groupNode.groupType) {
      content.push(`**Group Type:** \`${groupNode.groupType}\``);
    }

    if (groupNode.sql) {
      content.push(`**SQL:** \`${groupNode.sql.trim()}\``);
    }

    if (groupNode.timeframes && groupNode.timeframes.length > 0) {
      content.push(
        `**Timeframes:** ${groupNode.timeframes
          .map((t: string) => `\`${t}\``)
          .join(", ")}`
      );
    }

    return content.join("\n");
  }

  /**
   * Generate hover content for joins
   */
  private generateJoinHover(symbol: any): string {
    const content: string[] = [];

    content.push(`## Join: \`${symbol.name}\``);
    content.push("");

    content.push("**Type:** Join");
    content.push(`**File:** ${symbol.fileName}`);

    // Add join-specific information
    const joinNode = symbol.node;
    if (joinNode.view) {
      content.push(`**View:** \`${joinNode.view}\``);
    }

    if (joinNode.sqlOn) {
      content.push(`**SQL ON:** \`${joinNode.sqlOn.trim()}\``);
    }

    if (joinNode.relationship) {
      content.push(`**Relationship:** \`${joinNode.relationship}\``);
    }

    if (joinNode.joinType) {
      content.push(`**Join Type:** \`${joinNode.joinType}\``);
    }

    return content.join("\n");
  }

  /**
   * Generate generic hover content for unknown types
   */
  private generateGenericHover(symbol: any): string {
    const content: string[] = [];

    content.push(`## ${symbol.type}: \`${symbol.name}\``);
    content.push("");

    content.push(`**Type:** ${symbol.type}`);
    content.push(`**File:** ${symbol.fileName}`);

    return content.join("\n");
  }
}
