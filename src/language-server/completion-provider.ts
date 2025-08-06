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
import { ViewNode, ExploreNode } from "../workspace-tools/ast-types";

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

    const context = this.analyzeContext(document.content, position);
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
    content: string,
    position: Position
  ): CompletionContext {
    const lines = content.split("\n");
    const currentLine = lines[position.line] || "";
    const lineText = currentLine.substring(0, position.character);

    const context: CompletionContext = {
      lineText,
      position,
    };

    // Analyze the AST structure to determine context
    const beforeText = lines.slice(0, position.line + 1).join("\n");

    // Simple pattern matching for context detection
    // This could be enhanced with proper AST traversal
    const viewMatch = beforeText.match(/view:\s*(\w+)\s*{[^}]*$/);
    if (viewMatch) {
      context.inView = true;
      context.viewName = viewMatch[1];
    }

    const exploreMatch = beforeText.match(/explore:\s*(\w+)\s*{[^}]*$/);
    if (exploreMatch) {
      context.inExplore = true;
      context.exploreName = exploreMatch[1];
    }

    // Check if we're inside a field definition
    if (
      lineText.includes("dimension:") ||
      beforeText.match(/dimension:\s*\w+\s*{[^}]*$/)
    ) {
      context.inDimension = true;
    }
    if (
      lineText.includes("measure:") ||
      beforeText.match(/measure:\s*\w+\s*{[^}]*$/)
    ) {
      context.inMeasure = true;
    }
    if (
      lineText.includes("filter:") ||
      beforeText.match(/filter:\s*\w+\s*{[^}]*$/)
    ) {
      context.inFilter = true;
    }
    if (
      lineText.includes("parameter:") ||
      beforeText.match(/parameter:\s*\w+\s*{[^}]*$/)
    ) {
      context.inParameter = true;
    }
    if (
      lineText.includes("join:") ||
      beforeText.match(/join:\s*\w+\s*{[^}]*$/)
    ) {
      context.inJoin = true;
    }

    return context;
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
    const views = this.workspace.getAllViews();
    for (const view of views) {
      completions.push({
        label: view.name,
        kind: CompletionItemKind.Reference,
        detail: `View from ${view.fileName}`,
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

    // Add view references
    const views = this.workspace.getAllViews();
    for (const view of views) {
      completions.push({
        label: view.name,
        kind: CompletionItemKind.Reference,
        detail: `View from ${view.fileName}`,
        documentation: this.createMarkdown(`Reference to view '${view.name}'`),
        insertText: view.name,
      });
    }

    // Add explore references
    const explores = this.workspace.getAllExplores();
    for (const explore of explores) {
      completions.push({
        label: explore.name,
        kind: CompletionItemKind.Reference,
        detail: `Explore from ${explore.fileName}`,
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
