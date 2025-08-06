/**
 * LookML Diagnostics Provider
 *
 * Provides real-time validation and error detection for LookML files.
 * This replaces the need for manual validation commands with continuous
 * semantic analysis as the user types.
 */

import {
  Diagnostic,
  DiagnosticSeverity,
  Range,
} from "vscode-languageserver/node";
import { LookMLWorkspace, WorkspaceDocument } from "./workspace";
import {
  ViewNode,
  ExploreNode,
  JoinNode,
  DimensionNode,
  MeasureNode,
  isNodeOfType,
  AnyASTNode,
} from "../workspace-tools/ast-types";

/**
 * Validation rule interface
 */
interface ValidationRule {
  name: string;
  description: string;
  severity: DiagnosticSeverity;
  validate(
    document: WorkspaceDocument,
    workspace: LookMLWorkspace
  ): Diagnostic[];
}

/**
 * Provides comprehensive diagnostics for LookML files
 */
export class LookMLDiagnosticsProvider {
  private workspace: LookMLWorkspace;
  private validationRules: ValidationRule[];

  constructor(workspace: LookMLWorkspace) {
    this.workspace = workspace;
    this.validationRules = this.initializeValidationRules();
  }

  /**
   * Get diagnostics for a specific document
   */
  async getDiagnostics(uri: string): Promise<Diagnostic[]> {
    const document = this.workspace.getDocument(uri);
    if (!document) {
      return [];
    }

    const diagnostics: Diagnostic[] = [];

    // Add parse errors if any
    if (!document.parseResult.success && document.parseResult.error) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 0 },
        },
        message: `Parse error: ${document.parseResult.error.message}`,
        source: "lookml",
      });
    }

    // Run validation rules if document parsed successfully
    if (document.ast) {
      for (const rule of this.validationRules) {
        try {
          const ruleDiagnostics = rule.validate(document, this.workspace);
          diagnostics.push(...ruleDiagnostics);
        } catch (error) {
          console.error(`Error running validation rule ${rule.name}: ${error}`);
        }
      }
    }

    return diagnostics;
  }

  /**
   * Initialize all validation rules
   */
  private initializeValidationRules(): ValidationRule[] {
    return [
      this.createUndefinedViewReferenceRule(),
      this.createInvalidJoinRule(),
      this.createDuplicateFieldNameRule(),
      this.createInvalidMeasureTypeRule(),
      this.createMissingSqlRule(),
      this.createInvalidDimensionTypeRule(),
      this.createUnusedViewRule(),
      this.createCyclicJoinRule(),
      this.createDeprecatedParameterRule(),
      this.createNamingConventionRule(),
    ];
  }

  /**
   * Rule: Check for references to undefined views
   */
  private createUndefinedViewReferenceRule(): ValidationRule {
    return {
      name: "undefined-view-reference",
      description: "Detect references to undefined views",
      severity: DiagnosticSeverity.Error,
      validate: (
        document: WorkspaceDocument,
        workspace: LookMLWorkspace
      ): Diagnostic[] => {
        const diagnostics: Diagnostic[] = [];

        if (!document.ast) return diagnostics;

        // Check joins in explores
        for (const explore of Object.values(document.ast.explores)) {
          for (const join of Object.values(explore.joins)) {
            if (join.view && !workspace.findView(join.view)) {
              diagnostics.push(
                this.createDiagnostic(
                  DiagnosticSeverity.Error,
                  join.position,
                  `View '${join.view}' not found`,
                  "undefined-view"
                )
              );
            }
          }
        }

        return diagnostics;
      },
    };
  }

  /**
   * Rule: Check for invalid join configurations
   */
  private createInvalidJoinRule(): ValidationRule {
    return {
      name: "invalid-join",
      description: "Validate join configurations",
      severity: DiagnosticSeverity.Error,
      validate: (
        document: WorkspaceDocument,
        workspace: LookMLWorkspace
      ): Diagnostic[] => {
        const diagnostics: Diagnostic[] = [];

        if (!document.ast) return diagnostics;

        for (const explore of Object.values(document.ast.explores)) {
          for (const join of Object.values(explore.joins)) {
            // Check for missing sql_on
            if (!join.sqlOn) {
              diagnostics.push(
                this.createDiagnostic(
                  DiagnosticSeverity.Error,
                  join.position,
                  `Join '${join.name}' is missing sql_on condition`,
                  "missing-sql-on"
                )
              );
            }

            // Check for invalid relationship values
            if (join.relationship) {
              const validRelationships = [
                "one_to_one",
                "one_to_many",
                "many_to_one",
                "many_to_many",
              ];
              if (!validRelationships.includes(join.relationship)) {
                diagnostics.push(
                  this.createDiagnostic(
                    DiagnosticSeverity.Error,
                    join.position,
                    `Invalid relationship '${
                      join.relationship
                    }'. Must be one of: ${validRelationships.join(", ")}`,
                    "invalid-relationship"
                  )
                );
              }
            }
          }
        }

        return diagnostics;
      },
    };
  }

  /**
   * Rule: Check for duplicate field names within a view
   */
  private createDuplicateFieldNameRule(): ValidationRule {
    return {
      name: "duplicate-field-names",
      description: "Detect duplicate field names within views",
      severity: DiagnosticSeverity.Error,
      validate: (
        document: WorkspaceDocument,
        workspace: LookMLWorkspace
      ): Diagnostic[] => {
        const diagnostics: Diagnostic[] = [];

        if (!document.ast) return diagnostics;

        for (const view of Object.values(document.ast.views)) {
          const fieldNames = new Set<string>();
          const fieldNodes: AnyASTNode[] = [
            ...Object.values(view.dimensions),
            ...Object.values(view.measures),
            ...Object.values(view.filters),
            ...Object.values(view.parameterNodes),
            ...Object.values(view.dimensionGroups),
          ];

          for (const field of fieldNodes) {
            if (fieldNames.has(field.name)) {
              diagnostics.push(
                this.createDiagnostic(
                  DiagnosticSeverity.Error,
                  field.position,
                  `Duplicate field name '${field.name}' in view '${view.name}'`,
                  "duplicate-field"
                )
              );
            } else {
              fieldNames.add(field.name);
            }
          }
        }

        return diagnostics;
      },
    };
  }

  /**
   * Rule: Check for invalid measure types
   */
  private createInvalidMeasureTypeRule(): ValidationRule {
    return {
      name: "invalid-measure-type",
      description: "Validate measure type values",
      severity: DiagnosticSeverity.Error,
      validate: (
        document: WorkspaceDocument,
        workspace: LookMLWorkspace
      ): Diagnostic[] => {
        const diagnostics: Diagnostic[] = [];

        if (!document.ast) return diagnostics;

        const validMeasureTypes = [
          "count",
          "count_distinct",
          "sum",
          "average",
          "min",
          "max",
          "median",
          "percentile",
          "number",
          "yesno",
          "list",
        ];

        for (const view of Object.values(document.ast.views)) {
          for (const measure of Object.values(view.measures)) {
            if (
              measure.measureType &&
              !validMeasureTypes.includes(measure.measureType)
            ) {
              diagnostics.push(
                this.createDiagnostic(
                  DiagnosticSeverity.Error,
                  measure.position,
                  `Invalid measure type '${
                    measure.measureType
                  }'. Must be one of: ${validMeasureTypes.join(", ")}`,
                  "invalid-measure-type"
                )
              );
            }
          }
        }

        return diagnostics;
      },
    };
  }

  /**
   * Rule: Check for missing SQL in dimensions that require it
   */
  private createMissingSqlRule(): ValidationRule {
    return {
      name: "missing-sql",
      description: "Check for missing SQL in dimensions",
      severity: DiagnosticSeverity.Warning,
      validate: (
        document: WorkspaceDocument,
        workspace: LookMLWorkspace
      ): Diagnostic[] => {
        const diagnostics: Diagnostic[] = [];

        if (!document.ast) return diagnostics;

        for (const view of Object.values(document.ast.views)) {
          for (const dimension of Object.values(view.dimensions)) {
            // Skip primary key dimensions as they might not need SQL
            if (!dimension.sql && !dimension.primaryKey) {
              diagnostics.push(
                this.createDiagnostic(
                  DiagnosticSeverity.Warning,
                  dimension.position,
                  `Dimension '${dimension.name}' is missing sql parameter`,
                  "missing-sql"
                )
              );
            }
          }
        }

        return diagnostics;
      },
    };
  }

  /**
   * Rule: Check for invalid dimension types
   */
  private createInvalidDimensionTypeRule(): ValidationRule {
    return {
      name: "invalid-dimension-type",
      description: "Validate dimension type values",
      severity: DiagnosticSeverity.Error,
      validate: (
        document: WorkspaceDocument,
        workspace: LookMLWorkspace
      ): Diagnostic[] => {
        const diagnostics: Diagnostic[] = [];

        if (!document.ast) return diagnostics;

        const validDimensionTypes = [
          "string",
          "number",
          "int",
          "yesno",
          "tier",
          "date",
          "date_time",
          "time",
          "duration",
          "location",
          "zipcode",
        ];

        for (const view of Object.values(document.ast.views)) {
          for (const dimension of Object.values(view.dimensions)) {
            if (
              dimension.dataType &&
              !validDimensionTypes.includes(dimension.dataType)
            ) {
              diagnostics.push(
                this.createDiagnostic(
                  DiagnosticSeverity.Error,
                  dimension.position,
                  `Invalid dimension type '${
                    dimension.dataType
                  }'. Must be one of: ${validDimensionTypes.join(", ")}`,
                  "invalid-dimension-type"
                )
              );
            }
          }
        }

        return diagnostics;
      },
    };
  }

  /**
   * Rule: Check for unused views
   */
  private createUnusedViewRule(): ValidationRule {
    return {
      name: "unused-view",
      description: "Detect views that are never used",
      severity: DiagnosticSeverity.Information,
      validate: (
        document: WorkspaceDocument,
        workspace: LookMLWorkspace
      ): Diagnostic[] => {
        const diagnostics: Diagnostic[] = [];

        if (!document.ast) return diagnostics;

        // Get all view references from explores and joins
        const usedViews = new Set<string>();

        for (const doc of workspace.getAllDocuments()) {
          if (!doc.ast) continue;

          for (const explore of Object.values(doc.ast.explores)) {
            // Base view is used
            if (explore.baseView) {
              usedViews.add(explore.baseView);
            }

            // Joined views are used
            for (const join of Object.values(explore.joins)) {
              if (join.view) {
                usedViews.add(join.view);
              }
            }
          }
        }

        // Check views in current document
        for (const view of Object.values(document.ast.views)) {
          if (!usedViews.has(view.name)) {
            diagnostics.push(
              this.createDiagnostic(
                DiagnosticSeverity.Information,
                view.position,
                `View '${view.name}' is not used in any explore`,
                "unused-view"
              )
            );
          }
        }

        return diagnostics;
      },
    };
  }

  /**
   * Rule: Check for cyclic join dependencies
   */
  private createCyclicJoinRule(): ValidationRule {
    return {
      name: "cyclic-join",
      description: "Detect cyclic dependencies in joins",
      severity: DiagnosticSeverity.Warning,
      validate: (
        document: WorkspaceDocument,
        workspace: LookMLWorkspace
      ): Diagnostic[] => {
        const diagnostics: Diagnostic[] = [];

        if (!document.ast) return diagnostics;

        for (const explore of Object.values(document.ast.explores)) {
          const visited = new Set<string>();
          const recursionStack = new Set<string>();

          const checkCycle = (viewName: string): boolean => {
            if (recursionStack.has(viewName)) {
              return true; // Cycle detected
            }
            if (visited.has(viewName)) {
              return false; // Already processed
            }

            visited.add(viewName);
            recursionStack.add(viewName);

            // Check all joins from this view
            for (const join of Object.values(explore.joins)) {
              if (join.view && checkCycle(join.view)) {
                return true;
              }
            }

            recursionStack.delete(viewName);
            return false;
          };

          if (explore.baseView && checkCycle(explore.baseView)) {
            diagnostics.push(
              this.createDiagnostic(
                DiagnosticSeverity.Warning,
                explore.position,
                `Cyclic dependency detected in explore '${explore.name}'`,
                "cyclic-join"
              )
            );
          }
        }

        return diagnostics;
      },
    };
  }

  /**
   * Rule: Check for deprecated parameters
   */
  private createDeprecatedParameterRule(): ValidationRule {
    return {
      name: "deprecated-parameter",
      description: "Warn about deprecated parameters",
      severity: DiagnosticSeverity.Warning,
      validate: (
        document: WorkspaceDocument,
        workspace: LookMLWorkspace
      ): Diagnostic[] => {
        const diagnostics: Diagnostic[] = [];

        if (!document.ast) return diagnostics;

        const deprecatedParams = new Set(["fanout_on", "case_sensitive"]);

        // Check all nodes for deprecated parameters
        for (const view of Object.values(document.ast.views)) {
          this.checkDeprecatedParams(view, deprecatedParams, diagnostics);

          for (const field of [
            ...Object.values(view.dimensions),
            ...Object.values(view.measures),
            ...Object.values(view.filters),
            ...Object.values(view.parameterNodes),
            ...Object.values(view.dimensionGroups),
          ]) {
            this.checkDeprecatedParams(field, deprecatedParams, diagnostics);
          }
        }

        return diagnostics;
      },
    };
  }

  /**
   * Rule: Check naming conventions
   */
  private createNamingConventionRule(): ValidationRule {
    return {
      name: "naming-convention",
      description: "Enforce naming conventions",
      severity: DiagnosticSeverity.Information,
      validate: (
        document: WorkspaceDocument,
        workspace: LookMLWorkspace
      ): Diagnostic[] => {
        const diagnostics: Diagnostic[] = [];

        if (!document.ast) return diagnostics;

        for (const view of Object.values(document.ast.views)) {
          // Views should use snake_case
          if (!this.isSnakeCase(view.name)) {
            diagnostics.push(
              this.createDiagnostic(
                DiagnosticSeverity.Information,
                view.position,
                `View name '${view.name}' should use snake_case`,
                "naming-convention"
              )
            );
          }

          // Check field names
          for (const field of [
            ...Object.values(view.dimensions),
            ...Object.values(view.measures),
            ...Object.values(view.filters),
            ...Object.values(view.parameterNodes),
            ...Object.values(view.dimensionGroups),
          ]) {
            if (!this.isSnakeCase(field.name)) {
              diagnostics.push(
                this.createDiagnostic(
                  DiagnosticSeverity.Information,
                  field.position,
                  `Field name '${field.name}' should use snake_case`,
                  "naming-convention"
                )
              );
            }
          }
        }

        return diagnostics;
      },
    };
  }

  /**
   * Helper method to check for deprecated parameters
   */
  private checkDeprecatedParams(
    node: AnyASTNode,
    deprecatedParams: Set<string>,
    diagnostics: Diagnostic[]
  ): void {
    if ("parameters" in node) {
      for (const paramName of Object.keys(node.parameters)) {
        if (deprecatedParams.has(paramName)) {
          diagnostics.push(
            this.createDiagnostic(
              DiagnosticSeverity.Warning,
              node.position,
              `Parameter '${paramName}' is deprecated`,
              "deprecated-parameter"
            )
          );
        }
      }
    }
  }

  /**
   * Check if a name follows snake_case convention
   */
  private isSnakeCase(name: string): boolean {
    return /^[a-z][a-z0-9_]*$/.test(name);
  }

  /**
   * Create a diagnostic from position information
   */
  private createDiagnostic(
    severity: DiagnosticSeverity,
    position: {
      startLine: number;
      startChar: number;
      endLine: number;
      endChar: number;
    },
    message: string,
    code: string
  ): Diagnostic {
    return {
      severity,
      range: {
        start: { line: position.startLine, character: position.startChar },
        end: { line: position.endLine, character: position.endChar },
      },
      message,
      code,
      source: "lookml",
    };
  }
}
