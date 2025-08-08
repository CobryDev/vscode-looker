/**
 * LookML Completion Provider
 *
 * Provides intelligent code completion for LookML files based on AST context.
 * This replaces and enhances the logic from lookml-schema-service.ts with
 * context-aware suggestions.
 */

import {
  CompletionItem,
  CompletionItemKind,
  Position,
  MarkupKind,
  MarkupContent,
} from "vscode-languageserver/node";

import { LookMLWorkspace } from "./workspace";
import {
  AnyASTNode,
  ExploreNode,
  JoinNode,
  LookMLFile,
  ViewNode,
  DimensionNode,
  MeasureNode,
  FilterNode,
  ParameterNode,
  DimensionGroupNode,
  Position as ASTPosition,
} from "../workspace-tools/ast-types";

/**
 * Context information for determining appropriate completions
 */
interface CompletionContext {
  inView?: boolean;
  inExplore?: boolean;
  inDimension?: boolean;
  inMeasure?: boolean;
  inFilter?: boolean;
  inParameter?: boolean;
  inJoin?: boolean;
  viewName?: string;
  exploreName?: string;
  currentProperty?: string;
  lineText: string;
  position: Position;
}

/**
 * Provides intelligent code completion for LookML
 */
export class LookMLCompletionProvider {
  private workspace: LookMLWorkspace;

  constructor(workspace: LookMLWorkspace) {
    this.workspace = workspace;
  }

  /**
   * Get completions for a specific position
   */
  async getCompletions(
    uri: string,
    position: Position
  ): Promise<CompletionItem[]> {
    const document = this.workspace.getDocument(uri);
    if (!document || !document.content) {
      return [];
    }

    const context = this.analyzeContext(document, position);
    return this.getCompletionsForContext(context);
  }

  /**
   * Resolve additional details for a completion item
   */
  async resolveCompletion(item: CompletionItem): Promise<CompletionItem> {
    // Add detailed documentation and examples if needed
    return item;
  }

  /**
   * Analyze the context at the current position
   */
  private analyzeContext(
    document: { content: string; ast?: LookMLFile },
    position: Position
  ): CompletionContext {
    const lines = document.content.split("\n");
    const currentLine = lines[position.line] || "";
    const lineText = currentLine.substring(0, position.character);

    const context: CompletionContext = {
      lineText,
      position,
    };

    // Prefer precise AST lookup when available
    const ast = document.ast;
    if (ast) {
      const node = this.findDeepestNodeAtPosition(
        ast,
        position.line,
        position.character
      );

      if (node) {
        // Map node hierarchy to context flags
        // Walk up via helper capturing container view/explore if any
        const mapping = this.mapNodeToContext(node, ast);
        Object.assign(context, mapping);
        return context;
      }
    }

    // Fallback (should rarely be needed): minimal, line-based hints
    return context;
  }

  private findDeepestNodeAtPosition(
    file: LookMLFile,
    line: number,
    character: number
  ): AnyASTNode | null {
    const contains = (pos: ASTPosition): boolean => {
      if (line < pos.startLine || line > pos.endLine) return false;
      if (line === pos.startLine && character < pos.startChar) return false;
      if (line === pos.endLine && character > pos.endChar) return false;
      return true;
    };

    let best: AnyASTNode | null = null;
    const consider = (node: AnyASTNode) => {
      if (!contains((node as any).position)) return;
      // Prefer the smallest range that still contains the point
      if (
        !best ||
        this.rangeIsInside((node as any).position, (best as any).position)
      ) {
        best = node;
      }
    };

    // Views and their children
    for (const view of Object.values(file.views)) {
      consider(view as AnyASTNode);
      // Children
      for (const dim of Object.values(view.dimensions))
        consider(dim as AnyASTNode);
      for (const mea of Object.values(view.measures))
        consider(mea as AnyASTNode);
      for (const fil of Object.values(view.filters))
        consider(fil as AnyASTNode);
      for (const par of Object.values(view.parameterNodes))
        consider(par as AnyASTNode);
      for (const grp of Object.values(view.dimensionGroups))
        consider(grp as AnyASTNode);
      if (view.derivedTable) consider(view.derivedTable as AnyASTNode);
    }

    // Explores and children
    for (const explore of Object.values(file.explores)) {
      consider(explore as AnyASTNode);
      for (const join of Object.values(explore.joins))
        consider(join as AnyASTNode);
    }

    // Models and their explores
    for (const model of Object.values(file.models)) {
      consider(model as AnyASTNode);
      for (const ex of Object.values(model.explores))
        consider(ex as AnyASTNode);
    }

    // Dashboards (elements/filters are placeholders currently)
    for (const dash of Object.values(file.dashboards)) {
      consider(dash as AnyASTNode);
    }

    return best;
  }

  private rangeIsInside(inner: ASTPosition, outer: ASTPosition): boolean {
    if (inner.startLine < outer.startLine) return false;
    if (inner.endLine > outer.endLine) return false;
    if (
      inner.startLine === outer.startLine &&
      inner.startChar < outer.startChar
    )
      return false;
    if (inner.endLine === outer.endLine && inner.endChar > outer.endChar)
      return false;
    return true;
  }

  private mapNodeToContext(
    node: AnyASTNode,
    file: LookMLFile
  ): Partial<CompletionContext> {
    const flags: Partial<CompletionContext> = {};

    const assignViewContext = (view: ViewNode) => {
      flags.inView = true;
      flags.viewName = view.name;
    };
    const assignExploreContext = (explore: ExploreNode) => {
      flags.inExplore = true;
      flags.exploreName = explore.name;
    };

    // Try to use semantic symbol parent links first if available
    const model = this.workspace.semanticModel;
    const symbolForNode = model.nodeToSymbol.get(node);
    if (symbolForNode?.parent) {
      if (symbolForNode.parent.type === "view") {
        assignViewContext(symbolForNode.parent.declaration.node as ViewNode);
      }
      if (symbolForNode.parent.type === "explore") {
        assignExploreContext(
          symbolForNode.parent.declaration.node as ExploreNode
        );
      }
    }

    switch ((node as any).type) {
      case "view":
        assignViewContext(node as ViewNode);
        break;
      case "dimension":
        flags.inDimension = true;
        if (!flags.inView)
          this.findContainerView(
            node as DimensionNode,
            file,
            assignViewContext
          );
        break;
      case "measure":
        flags.inMeasure = true;
        if (!flags.inView)
          this.findContainerView(node as MeasureNode, file, assignViewContext);
        break;
      case "filter":
        flags.inFilter = true;
        if (!flags.inView)
          this.findContainerView(node as FilterNode, file, assignViewContext);
        break;
      case "parameter":
        flags.inParameter = true;
        if (!flags.inView)
          this.findContainerView(
            node as ParameterNode,
            file,
            assignViewContext
          );
        break;
      case "dimension_group":
        // Treat like a field inside a view for completion purposes
        if (!flags.inView)
          this.findContainerView(
            node as DimensionGroupNode,
            file,
            assignViewContext
          );
        break;
      case "explore":
        assignExploreContext(node as ExploreNode);
        break;
      case "join":
        flags.inJoin = true;
        if (!flags.inExplore)
          this.findContainerExplore(
            node as JoinNode,
            file,
            assignExploreContext
          );
        break;
      default:
        break;
    }

    return flags;
  }

  private findContainerView(
    child: AnyASTNode,
    file: LookMLFile,
    onFound: (view: ViewNode) => void
  ): void {
    for (const view of Object.values(file.views)) {
      const pos = (view as any).position as ASTPosition;
      const cpos = (child as any).position as ASTPosition;
      if (this.rangeIsInside(cpos, pos)) {
        onFound(view);
        return;
      }
    }
  }

  private findContainerExplore(
    child: AnyASTNode,
    file: LookMLFile,
    onFound: (explore: ExploreNode) => void
  ): void {
    for (const explore of Object.values(file.explores)) {
      const pos = (explore as any).position as ASTPosition;
      const cpos = (child as any).position as ASTPosition;
      if (this.rangeIsInside(cpos, pos)) {
        onFound(explore);
        return;
      }
    }
  }

  /**
   * Get completions based on the current context
   */
  private getCompletionsForContext(
    context: CompletionContext
  ): CompletionItem[] {
    const completions: CompletionItem[] = [];

    if (context.inView) {
      completions.push(...this.getViewCompletions(context));
    } else if (context.inExplore) {
      completions.push(...this.getExploreCompletions(context));
    } else if (context.inDimension) {
      completions.push(...this.getDimensionCompletions(context));
    } else if (context.inMeasure) {
      completions.push(...this.getMeasureCompletions(context));
    } else if (context.inFilter) {
      completions.push(...this.getFilterCompletions(context));
    } else if (context.inParameter) {
      completions.push(...this.getParameterCompletions(context));
    } else if (context.inJoin) {
      completions.push(...this.getJoinCompletions(context));
    } else {
      // Top-level completions
      completions.push(...this.getTopLevelCompletions(context));
    }

    // Add reference completions if applicable
    if (context.lineText.includes("${") || context.lineText.includes("view:")) {
      completions.push(...this.getReferenceCompletions(context));
    }

    return completions;
  }

  /**
   * Get top-level completions (view, explore, model, etc.)
   */
  private getTopLevelCompletions(context: CompletionContext): CompletionItem[] {
    return [
      {
        label: "view",
        kind: CompletionItemKind.Keyword,
        detail: "Define a view",
        documentation: this.createMarkdown("Creates a new view definition"),
        insertText: "view: ${1:view_name} {\n  $0\n}",
        insertTextFormat: 2, // snippet
      },
      {
        label: "explore",
        kind: CompletionItemKind.Keyword,
        detail: "Define an explore",
        documentation: this.createMarkdown("Creates a new explore definition"),
        insertText: "explore: ${1:explore_name} {\n  $0\n}",
        insertTextFormat: 2,
      },
      {
        label: "model",
        kind: CompletionItemKind.Keyword,
        detail: "Define a model",
        documentation: this.createMarkdown("Creates a new model definition"),
        insertText:
          'model: ${1:model_name} {\n  connection: "${2:connection_name}"\n  $0\n}',
        insertTextFormat: 2,
      },
      {
        label: "dashboard",
        kind: CompletionItemKind.Keyword,
        detail: "Define a dashboard",
        documentation: this.createMarkdown(
          "Creates a new dashboard definition"
        ),
        insertText: "dashboard: ${1:dashboard_name} {\n  $0\n}",
        insertTextFormat: 2,
      },
    ];
  }

  /**
   * Get completions within a view context
   */
  private getViewCompletions(context: CompletionContext): CompletionItem[] {
    return [
      {
        label: "dimension",
        kind: CompletionItemKind.Property,
        detail: "Add a dimension",
        documentation: this.createMarkdown("Creates a new dimension field"),
        insertText:
          "dimension: ${1:dimension_name} {\n  type: ${2:string}\n  sql: \\${TABLE}.${3:column_name} ;;\n}",
        insertTextFormat: 2,
      },
      {
        label: "measure",
        kind: CompletionItemKind.Property,
        detail: "Add a measure",
        documentation: this.createMarkdown("Creates a new measure field"),
        insertText:
          "measure: ${1:measure_name} {\n  type: ${2:count}\n  ${3:sql: \\${TABLE}.${4:column_name} ;;}\n}",
        insertTextFormat: 2,
      },
      {
        label: "dimension_group",
        kind: CompletionItemKind.Property,
        detail: "Add a dimension group",
        documentation: this.createMarkdown(
          "Creates a new dimension group for time-based fields"
        ),
        insertText:
          "dimension_group: ${1:group_name} {\n  type: time\n  timeframes: [raw, time, date, week, month, quarter, year]\n  sql: \\${TABLE}.${2:timestamp_column} ;;\n}",
        insertTextFormat: 2,
      },
      {
        label: "filter",
        kind: CompletionItemKind.Property,
        detail: "Add a filter",
        documentation: this.createMarkdown("Creates a new filter field"),
        insertText: "filter: ${1:filter_name} {\n  type: ${2:date}\n}",
        insertTextFormat: 2,
      },
      {
        label: "parameter",
        kind: CompletionItemKind.Property,
        detail: "Add a parameter",
        documentation: this.createMarkdown("Creates a new parameter field"),
        insertText:
          'parameter: ${1:parameter_name} {\n  type: ${2:unquoted}\n  default_value: "${3:default}"\n}',
        insertTextFormat: 2,
      },
      {
        label: "sql_table_name",
        kind: CompletionItemKind.Property,
        detail: "Set the SQL table name",
        documentation: this.createMarkdown(
          "Specifies the underlying table or query for this view"
        ),
        insertText: "sql_table_name: ${1:schema.table_name} ;;",
      },
      {
        label: "derived_table",
        kind: CompletionItemKind.Property,
        detail: "Define a derived table",
        documentation: this.createMarkdown(
          "Creates a derived table based on SQL"
        ),
        insertText: "derived_table: {\n  sql: ${1:SELECT * FROM table} ;;\n}",
      },
    ];
  }

  /**
   * Get completions within an explore context
   */
  private getExploreCompletions(context: CompletionContext): CompletionItem[] {
    const completions: CompletionItem[] = [
      {
        label: "join",
        kind: CompletionItemKind.Property,
        detail: "Add a join",
        documentation: this.createMarkdown(
          "Joins another view to this explore"
        ),
        insertText:
          "join: ${1:view_name} {\n  sql_on: \\${${2:base_view}.${3:key}} = \\${${1:view_name}.${4:key}} ;;\n  relationship: ${5:many_to_one}\n}",
        insertTextFormat: 2,
      },
      {
        label: "view_name",
        kind: CompletionItemKind.Property,
        detail: "Set the base view",
        documentation: this.createMarkdown(
          "Specifies the base view for this explore"
        ),
        insertText: "view_name: ${1:view_name}",
      },
      {
        label: "label",
        kind: CompletionItemKind.Property,
        detail: "Set the explore label",
        insertText: 'label: "${1:Display Name}"',
      },
      {
        label: "description",
        kind: CompletionItemKind.Property,
        detail: "Set the explore description",
        insertText: 'description: "${1:Description}"',
      },
    ];

    // Add available views as join targets
    // Use semantic model for views
    const modelViews = Array.from(
      this.workspace.semanticModel.symbols.values()
    ).filter((s) => s.type === "view");
    for (const view of modelViews) {
      completions.push({
        label: view.name,
        kind: CompletionItemKind.Reference,
        detail: `View`,
        documentation: this.createMarkdown(`Reference to view '${view.name}'`),
        insertText: view.name,
      });
    }

    return completions;
  }

  /**
   * Get completions within a dimension context
   */
  private getDimensionCompletions(
    context: CompletionContext
  ): CompletionItem[] {
    return [
      {
        label: "type",
        kind: CompletionItemKind.Property,
        detail: "Set dimension type",
        insertText:
          "type: ${1|string,number,int,yesno,tier,date,date_time,time,duration,location,zipcode|}",
      },
      {
        label: "sql",
        kind: CompletionItemKind.Property,
        detail: "Set SQL expression",
        insertText: "sql: ${TABLE}.${1:column_name} ;;",
      },
      {
        label: "primary_key",
        kind: CompletionItemKind.Property,
        detail: "Mark as primary key",
        insertText: "primary_key: yes",
      },
      {
        label: "hidden",
        kind: CompletionItemKind.Property,
        detail: "Hide from users",
        insertText: "hidden: yes",
      },
      {
        label: "label",
        kind: CompletionItemKind.Property,
        detail: "Set display label",
        insertText: 'label: "${1:Display Name}"',
      },
      {
        label: "description",
        kind: CompletionItemKind.Property,
        detail: "Set description",
        insertText: 'description: "${1:Description}"',
      },
      {
        label: "value_format",
        kind: CompletionItemKind.Property,
        detail: "Set value format",
        insertText: 'value_format: "${1:#,##0}"',
      },
    ];
  }

  /**
   * Get completions within a measure context
   */
  private getMeasureCompletions(context: CompletionContext): CompletionItem[] {
    return [
      {
        label: "type",
        kind: CompletionItemKind.Property,
        detail: "Set measure type",
        insertText:
          "type: ${1|count,count_distinct,sum,average,min,max,median,percentile,number,yesno,list|}",
      },
      {
        label: "sql",
        kind: CompletionItemKind.Property,
        detail: "Set SQL expression",
        insertText: "sql: ${TABLE}.${1:column_name} ;;",
      },
      {
        label: "drill_fields",
        kind: CompletionItemKind.Property,
        detail: "Set drill fields",
        insertText: "drill_fields: [${1:field1, field2}]",
      },
      {
        label: "value_format",
        kind: CompletionItemKind.Property,
        detail: "Set value format",
        insertText: 'value_format: "${1:#,##0}"',
      },
      {
        label: "label",
        kind: CompletionItemKind.Property,
        detail: "Set display label",
        insertText: 'label: "${1:Display Name}"',
      },
      {
        label: "description",
        kind: CompletionItemKind.Property,
        detail: "Set description",
        insertText: 'description: "${1:Description}"',
      },
      {
        label: "hidden",
        kind: CompletionItemKind.Property,
        detail: "Hide from users",
        insertText: "hidden: yes",
      },
    ];
  }

  /**
   * Get completions within a filter context
   */
  private getFilterCompletions(context: CompletionContext): CompletionItem[] {
    return [
      {
        label: "type",
        kind: CompletionItemKind.Property,
        detail: "Set filter type",
        insertText: "type: ${1|date,date_time,string,number,yesno|}",
      },
      {
        label: "default_value",
        kind: CompletionItemKind.Property,
        detail: "Set default value",
        insertText: 'default_value: "${1:default}"',
      },
      {
        label: "suggest_dimension",
        kind: CompletionItemKind.Property,
        detail: "Suggest values from dimension",
        insertText: "suggest_dimension: ${1:dimension_name}",
      },
    ];
  }

  /**
   * Get completions within a parameter context
   */
  private getParameterCompletions(
    context: CompletionContext
  ): CompletionItem[] {
    return [
      {
        label: "type",
        kind: CompletionItemKind.Property,
        detail: "Set parameter type",
        insertText: "type: ${1|unquoted,number,date_time|}",
      },
      {
        label: "default_value",
        kind: CompletionItemKind.Property,
        detail: "Set default value",
        insertText: 'default_value: "${1:default}"',
      },
      {
        label: "allowed_values",
        kind: CompletionItemKind.Property,
        detail: "Set allowed values",
        insertText:
          'allowed_values: {\n  label: "${1:Label}"\n  value: "${2:value}"\n}',
      },
    ];
  }

  /**
   * Get completions within a join context
   */
  private getJoinCompletions(context: CompletionContext): CompletionItem[] {
    return [
      {
        label: "sql_on",
        kind: CompletionItemKind.Property,
        detail: "Set join condition",
        insertText:
          "sql_on: ${${1:left_view}.${2:left_field}} = ${${3:right_view}.${4:right_field}} ;;",
      },
      {
        label: "relationship",
        kind: CompletionItemKind.Property,
        detail: "Set join relationship",
        insertText:
          "relationship: ${1|one_to_one,one_to_many,many_to_one,many_to_many|}",
      },
      {
        label: "type",
        kind: CompletionItemKind.Property,
        detail: "Set join type",
        insertText: "type: ${1|left_outer,inner,full_outer,cross|}",
      },
      {
        label: "view_label",
        kind: CompletionItemKind.Property,
        detail: "Set view label",
        insertText: 'view_label: "${1:Label}"',
      },
    ];
  }

  /**
   * Get reference completions (views, fields, etc.)
   */
  private getReferenceCompletions(
    context: CompletionContext
  ): CompletionItem[] {
    const completions: CompletionItem[] = [];

    // Add view references from semantic model
    const modelViews = Array.from(
      this.workspace.semanticModel.symbols.values()
    ).filter((s) => s.type === "view");
    for (const view of modelViews) {
      completions.push({
        label: view.name,
        kind: CompletionItemKind.Reference,
        detail: `View`,
        documentation: this.createMarkdown(`Reference to view '${view.name}'`),
        insertText: view.name,
      });
    }

    // Add explore references
    const modelExplores = Array.from(
      this.workspace.semanticModel.symbols.values()
    ).filter((s) => s.type === "explore");
    for (const explore of modelExplores) {
      completions.push({
        label: explore.name,
        kind: CompletionItemKind.Reference,
        detail: `Explore`,
        documentation: this.createMarkdown(
          `Reference to explore '${explore.name}'`
        ),
        insertText: explore.name,
      });
    }

    return completions;
  }

  /**
   * Create markdown documentation
   */
  private createMarkdown(content: string): MarkupContent {
    return {
      kind: MarkupKind.Markdown,
      value: content,
    };
  }
}
