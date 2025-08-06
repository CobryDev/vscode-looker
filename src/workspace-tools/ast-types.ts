/**
 * Abstract Syntax Tree (AST) interfaces for LookML
 *
 * These interfaces represent the complete structure of LookML files,
 * preserving all information needed for language server operations
 * including syntax highlighting, completion, validation, and refactoring.
 */

/**
 * Position information for any AST node
 */
export interface Position {
  /** Zero-indexed line number where the node starts */
  startLine: number;
  /** Zero-indexed character position where the node starts */
  startChar: number;
  /** Zero-indexed line number where the node ends */
  endLine: number;
  /** Zero-indexed character position where the node ends */
  endChar: number;
}

/**
 * Base interface for all AST nodes
 */
export interface ASTNode {
  /** Position information in the source file */
  position: Position;
  /** The original string tokens that make up this node */
  rawTokens?: string[];
}

/**
 * Base interface for named LookML constructs (views, explores, fields, etc.)
 */
export interface NamedNode extends ASTNode {
  /** The name of this construct */
  name: string;
}

/**
 * Base interface for LookML constructs that can contain parameters
 */
export interface ParameterizedNode extends NamedNode {
  /** Map of parameter name to parameter value */
  parameters: Record<string, ParameterValue>;
}

/**
 * Represents a parameter value which can be:
 * - A simple string/number value
 * - A complex object (like allowed_values)
 * - An array of values
 */
export type ParameterValue =
  | string
  | number
  | boolean
  | ParameterObject
  | ParameterValue[];

/**
 * Represents a complex parameter object (like allowed_values, drill_fields, etc.)
 */
export interface ParameterObject extends ASTNode {
  /** The type/name of this parameter object */
  type: string;
  /** Properties of this parameter object */
  properties: Record<string, ParameterValue>;
}

/**
 * Root AST node representing a complete LookML file
 */
export interface LookMLFile extends ASTNode {
  /** Source file path */
  fileName: string;
  /** Views defined in this file */
  views: Record<string, ViewNode>;
  /** Explores defined in this file */
  explores: Record<string, ExploreNode>;
  /** Models defined in this file */
  models: Record<string, ModelNode>;
  /** Dashboards defined in this file */
  dashboards: Record<string, DashboardNode>;
}

/**
 * AST node representing a LookML view
 */
export interface ViewNode extends ParameterizedNode {
  /** Type identifier */
  type: "view";
  /** Dimensions defined in this view */
  dimensions: Record<string, DimensionNode>;
  /** Measures defined in this view */
  measures: Record<string, MeasureNode>;
  /** Filters defined in this view */
  filters: Record<string, FilterNode>;
  /** Parameters defined in this view */
  parameterNodes: Record<string, ParameterNode>;
  /** Dimension groups defined in this view */
  dimensionGroups: Record<string, DimensionGroupNode>;
  /** Derived table configuration if this is a derived table view */
  derivedTable?: DerivedTableNode;
}

/**
 * AST node representing a LookML explore
 */
export interface ExploreNode extends ParameterizedNode {
  /** Type identifier */
  type: "explore";
  /** The base view this explore is built on */
  baseView?: string;
  /** Joins defined in this explore */
  joins: Record<string, JoinNode>;
}

/**
 * AST node representing a LookML model
 */
export interface ModelNode extends ParameterizedNode {
  /** Type identifier */
  type: "model";
  /** Connection name */
  connection?: string;
  /** Include statements */
  includes?: string[];
  /** Explores defined in this model */
  explores: Record<string, ExploreNode>;
}

/**
 * AST node representing a LookML dashboard
 */
export interface DashboardNode extends ParameterizedNode {
  /** Type identifier */
  type: "dashboard";
  /** Dashboard elements */
  elements: Record<string, DashboardElementNode>;
  /** Filters on the dashboard */
  filters: Record<string, DashboardFilterNode>;
}

/**
 * AST node representing a dimension
 */
export interface DimensionNode extends ParameterizedNode {
  /** Type identifier */
  type: "dimension";
  /** Data type (string, number, date, etc.) */
  dataType?: string;
  /** SQL expression */
  sql?: string;
  /** Whether this dimension is hidden */
  hidden?: boolean;
  /** Primary key designation */
  primaryKey?: boolean;
}

/**
 * AST node representing a measure
 */
export interface MeasureNode extends ParameterizedNode {
  /** Type identifier */
  type: "measure";
  /** Measure type (count, sum, average, etc.) */
  measureType?: string;
  /** SQL expression */
  sql?: string;
  /** Whether this measure is hidden */
  hidden?: boolean;
  /** Drill fields */
  drillFields?: string[];
}

/**
 * AST node representing a filter
 */
export interface FilterNode extends ParameterizedNode {
  /** Type identifier */
  type: "filter";
  /** Filter type */
  filterType?: string;
  /** Default value */
  defaultValue?: string;
}

/**
 * AST node representing a parameter
 */
export interface ParameterNode extends ParameterizedNode {
  /** Type identifier */
  type: "parameter";
  /** Parameter type */
  parameterType?: string;
  /** Default value */
  defaultValue?: string;
  /** Allowed values configuration */
  allowedValues?: ParameterObject;
}

/**
 * AST node representing a dimension group
 */
export interface DimensionGroupNode extends ParameterizedNode {
  /** Type identifier */
  type: "dimension_group";
  /** Group type (time, duration, etc.) */
  groupType?: string;
  /** SQL expression */
  sql?: string;
  /** Timeframes available */
  timeframes?: string[];
}

/**
 * AST node representing a join
 */
export interface JoinNode extends ParameterizedNode {
  /** Type identifier */
  type: "join";
  /** SQL ON condition */
  sqlOn?: string;
  /** Join type (left_outer, inner, etc.) */
  joinType?: string;
  /** Relationship (one_to_one, one_to_many, etc.) */
  relationship?: string;
  /** View to join */
  view?: string;
}

/**
 * AST node representing a derived table
 */
export interface DerivedTableNode extends ParameterizedNode {
  /** Type identifier */
  type: "derived_table";
  /** SQL query for the derived table */
  sql?: string;
  /** Explore source for the derived table */
  exploreSource?: string;
  /** Datagroup for caching */
  datagroup?: string;
}

/**
 * AST node representing a dashboard element
 */
export interface DashboardElementNode extends ParameterizedNode {
  /** Type identifier */
  type: "element";
  /** Element type (looker_line, looker_table, etc.) */
  elementType?: string;
  /** Query configuration */
  query?: Record<string, any>;
}

/**
 * AST node representing a dashboard filter
 */
export interface DashboardFilterNode extends ParameterizedNode {
  /** Type identifier */
  type: "dashboard_filter";
  /** Filter type */
  filterType?: string;
  /** Default value */
  defaultValue?: string;
}

/**
 * Utility type for all possible AST node types (excludes LookMLFile as it doesn't have a type property)
 */
export type AnyASTNode =
  | ViewNode
  | ExploreNode
  | ModelNode
  | DashboardNode
  | DimensionNode
  | MeasureNode
  | FilterNode
  | ParameterNode
  | DimensionGroupNode
  | JoinNode
  | DerivedTableNode
  | DashboardElementNode
  | DashboardFilterNode;

/**
 * Type guard to check if a node is of a specific type
 */
export function isNodeOfType<T extends AnyASTNode>(
  node: AnyASTNode,
  type: string
): node is T {
  return "type" in node && (node as any).type === type;
}

/**
 * Visitor pattern interface for traversing the AST
 */
export interface ASTVisitor {
  visitFile?(node: LookMLFile): void;
  visitView?(node: ViewNode): void;
  visitExplore?(node: ExploreNode): void;
  visitModel?(node: ModelNode): void;
  visitDashboard?(node: DashboardNode): void;
  visitDimension?(node: DimensionNode): void;
  visitMeasure?(node: MeasureNode): void;
  visitFilter?(node: FilterNode): void;
  visitParameter?(node: ParameterNode): void;
  visitDimensionGroup?(node: DimensionGroupNode): void;
  visitJoin?(node: JoinNode): void;
  visitDerivedTable?(node: DerivedTableNode): void;
  visitDashboardElement?(node: DashboardElementNode): void;
  visitDashboardFilter?(node: DashboardFilterNode): void;
}

/**
 * Utility function to traverse an AST with a visitor
 */
export function traverseAST(node: AnyASTNode, visitor: ASTVisitor): void {
  switch (node.type) {
    case "view":
      visitor.visitView?.(node);
      Object.values(node.dimensions).forEach((child) =>
        traverseAST(child, visitor)
      );
      Object.values(node.measures).forEach((child) =>
        traverseAST(child, visitor)
      );
      Object.values(node.filters).forEach((child) =>
        traverseAST(child, visitor)
      );
      Object.values(node.parameterNodes).forEach((child) =>
        traverseAST(child, visitor)
      );
      Object.values(node.dimensionGroups).forEach((child) =>
        traverseAST(child, visitor)
      );
      if (node.derivedTable) traverseAST(node.derivedTable, visitor);
      break;
    case "explore":
      visitor.visitExplore?.(node);
      Object.values(node.joins).forEach((child) => traverseAST(child, visitor));
      break;
    case "model":
      visitor.visitModel?.(node);
      Object.values(node.explores).forEach((child) =>
        traverseAST(child, visitor)
      );
      break;
    case "dashboard":
      visitor.visitDashboard?.(node);
      Object.values(node.elements).forEach((child) =>
        traverseAST(child, visitor)
      );
      Object.values(node.filters).forEach((child) =>
        traverseAST(child, visitor)
      );
      break;
    // Leaf nodes
    case "dimension":
      visitor.visitDimension?.(node);
      break;
    case "measure":
      visitor.visitMeasure?.(node);
      break;
    case "filter":
      visitor.visitFilter?.(node);
      break;
    case "parameter":
      visitor.visitParameter?.(node);
      break;
    case "dimension_group":
      visitor.visitDimensionGroup?.(node);
      break;
    case "join":
      visitor.visitJoin?.(node);
      break;
    case "derived_table":
      visitor.visitDerivedTable?.(node);
      break;
    case "element":
      visitor.visitDashboardElement?.(node);
      break;
    case "dashboard_filter":
      visitor.visitDashboardFilter?.(node);
      break;
  }
}
