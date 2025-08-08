import type { LookMLWorkspace, WorkspaceDocument } from "./workspace";
import { SemanticModel, type Symbol as SemanticSymbol } from "./semantic-model";
import { AnyASTNode } from "../workspace-tools/ast-types";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/node";

export class SemanticAnalyzer {
  public analyze(workspace: LookMLWorkspace): SemanticModel {
    const symbols = new Map<string, SemanticSymbol>();
    const symbolsByUri = new Map<string, SemanticSymbol[]>();
    const nodeToSymbol = new WeakMap<AnyASTNode, SemanticSymbol>();
    const diagnostics: Diagnostic[] = [];
    const diagnosticsByUri = new Map<string, Diagnostic[]>();

    const viewNameToKey = new Map<string, string>();
    const dimensionQualifiedNameToKey = new Map<string, string>();
    const measureQualifiedNameToKey = new Map<string, string>();

    for (const doc of workspace.getAllDocuments()) {
      if (!doc.parseResult.success && doc.parseResult.error) {
        const diag: Diagnostic = {
          severity: DiagnosticSeverity.Error,
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 0 },
          },
          message: `Parse error: ${doc.parseResult.error.message}`,
          source: "lookml",
        };
        diagnostics.push(diag);
        this.addDiagnosticForUri(doc.uri, diag, diagnosticsByUri);
      }
    }

    for (const doc of workspace.getParsedDocuments()) {
      const uri = doc.uri;
      const fileSymbols: SemanticSymbol[] = [];
      const ast = doc.ast!;

      for (const model of Object.values(ast.models)) {
        const key = this.createSymbolKey("model", model.name);
        const sym = this.createSymbol(uri, model.name, "model", model);
        symbols.set(key, sym);
        nodeToSymbol.set(model as any, sym);
        fileSymbols.push(sym);
      }

      for (const view of Object.values(ast.views)) {
        const viewKey = this.createSymbolKey("view", view.name);
        const viewSym = this.createSymbol(uri, view.name, "view", view);
        symbols.set(viewKey, viewSym);
        nodeToSymbol.set(view as any, viewSym);
        fileSymbols.push(viewSym);
        viewNameToKey.set(view.name, viewKey);

        for (const dimension of Object.values(view.dimensions)) {
          const qualified = `${view.name}.${dimension.name}`;
          const key = this.createSymbolKey("dimension", qualified);
          const sym = this.createSymbol(uri, qualified, "dimension", dimension);
          // Link child to parent view
          sym.parent = viewSym;
          symbols.set(key, sym);
          nodeToSymbol.set(dimension as any, sym);
          fileSymbols.push(sym);
          dimensionQualifiedNameToKey.set(qualified, key);
        }

        for (const measure of Object.values(view.measures)) {
          const qualified = `${view.name}.${measure.name}`;
          const key = this.createSymbolKey("measure", qualified);
          const sym = this.createSymbol(uri, qualified, "measure", measure);
          // Link child to parent view
          sym.parent = viewSym;
          symbols.set(key, sym);
          nodeToSymbol.set(measure as any, sym);
          fileSymbols.push(sym);
          measureQualifiedNameToKey.set(qualified, key);
        }

        for (const filter of Object.values(view.filters)) {
          const qualified = `${view.name}.${filter.name}`;
          const key = this.createSymbolKey("filter", qualified);
          const sym = this.createSymbol(uri, qualified, "filter", filter);
          // Link child to parent view
          sym.parent = viewSym;
          symbols.set(key, sym);
          nodeToSymbol.set(filter as any, sym);
          fileSymbols.push(sym);
        }

        for (const param of Object.values(view.parameterNodes)) {
          const qualified = `${view.name}.${param.name}`;
          const key = this.createSymbolKey("parameter", qualified);
          const sym = this.createSymbol(uri, qualified, "parameter", param);
          // Link child to parent view
          sym.parent = viewSym;
          symbols.set(key, sym);
          nodeToSymbol.set(param as any, sym);
          fileSymbols.push(sym);
        }

        for (const group of Object.values(view.dimensionGroups)) {
          const qualified = `${view.name}.${group.name}`;
          const key = this.createSymbolKey("dimension_group", qualified);
          const sym = this.createSymbol(
            uri,
            qualified,
            "dimension_group",
            group
          );
          // Link child to parent view
          sym.parent = viewSym;
          symbols.set(key, sym);
          nodeToSymbol.set(group as any, sym);
          fileSymbols.push(sym);
        }
      }

      for (const explore of Object.values(ast.explores)) {
        const key = this.createSymbolKey("explore", explore.name);
        const exploreSym = this.createSymbol(
          uri,
          explore.name,
          "explore",
          explore
        );
        symbols.set(key, exploreSym);
        nodeToSymbol.set(explore as any, exploreSym);
        fileSymbols.push(exploreSym);

        // Create join symbols under this explore to enable parent scoping
        for (const join of Object.values(explore.joins)) {
          const qualified = `${explore.name}.${join.name}`;
          const joinKey = this.createSymbolKey("join", qualified);
          const joinSym = this.createSymbol(uri, qualified, "join", join);
          joinSym.parent = exploreSym;
          symbols.set(joinKey, joinSym);
          nodeToSymbol.set(join as any, joinSym);
          fileSymbols.push(joinSym);
        }
      }

      if (fileSymbols.length > 0) {
        symbolsByUri.set(uri, fileSymbols);
      }
    }

    for (const doc of workspace.getParsedDocuments()) {
      const ast = doc.ast!;
      for (const explore of Object.values(ast.explores)) {
        if (explore.baseView) {
          const refKey = viewNameToKey.get(explore.baseView);
          if (refKey) {
            this.addReference(symbols, refKey, doc, explore.position);
          } else {
            const diag = this.createDiagnostic(
              DiagnosticSeverity.Error,
              explore.position,
              `View '${explore.baseView}' not found`,
              "undefined-view"
            );
            diagnostics.push(diag);
            this.addDiagnosticForUri(doc.uri, diag, diagnosticsByUri);
          }
        }

        for (const join of Object.values(explore.joins)) {
          if (join.view) {
            const viewKey = viewNameToKey.get(join.view);
            if (viewKey) {
              this.addReference(symbols, viewKey, doc, join.position);
            } else {
              const diag = this.createDiagnostic(
                DiagnosticSeverity.Error,
                join.position,
                `View '${join.view}' not found`,
                "undefined-view"
              );
              diagnostics.push(diag);
              this.addDiagnosticForUri(doc.uri, diag, diagnosticsByUri);
            }
          }

          if (!join.sqlOn) {
            const diag = this.createDiagnostic(
              DiagnosticSeverity.Error,
              join.position,
              `Join '${join.name}' is missing sql_on condition`,
              "missing-sql-on"
            );
            diagnostics.push(diag);
            this.addDiagnosticForUri(doc.uri, diag, diagnosticsByUri);
          }

          if (join.relationship) {
            const valid = [
              "one_to_one",
              "one_to_many",
              "many_to_one",
              "many_to_many",
            ];
            if (!valid.includes(join.relationship)) {
              const diag = this.createDiagnostic(
                DiagnosticSeverity.Error,
                join.position,
                `Invalid relationship '${
                  join.relationship
                }'. Must be one of: ${valid.join(", ")}`,
                "invalid-relationship"
              );
              diagnostics.push(diag);
              this.addDiagnosticForUri(doc.uri, diag, diagnosticsByUri);
            }
          }

          if (join.sqlOn) {
            this.extractAndRecordReferences(
              join.sqlOn,
              doc,
              join.position,
              viewNameToKey,
              dimensionQualifiedNameToKey,
              measureQualifiedNameToKey,
              symbols
            );
          }
        }
      }

      for (const view of Object.values(ast.views)) {
        const nameSet = new Set<string>();
        const fields: AnyASTNode[] = [
          ...Object.values(view.dimensions),
          ...Object.values(view.measures),
          ...Object.values(view.filters),
          ...Object.values(view.parameterNodes),
          ...Object.values(view.dimensionGroups),
        ];
        for (const field of fields) {
          if (nameSet.has((field as any).name)) {
            const diag = this.createDiagnostic(
              DiagnosticSeverity.Error,
              (field as any).position,
              `Duplicate field name '${(field as any).name}' in view '${
                view.name
              }'`,
              "duplicate-field"
            );
            diagnostics.push(diag);
            this.addDiagnosticForUri(doc.uri, diag, diagnosticsByUri);
          } else {
            nameSet.add((field as any).name);
          }
        }

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
        for (const measure of Object.values(view.measures)) {
          if (
            (measure as any).measureType &&
            !validMeasureTypes.includes((measure as any).measureType)
          ) {
            const diag = this.createDiagnostic(
              DiagnosticSeverity.Error,
              (measure as any).position,
              `Invalid measure type '${
                (measure as any).measureType
              }'. Must be one of: ${validMeasureTypes.join(", ")}`,
              "invalid-measure-type"
            );
            diagnostics.push(diag);
            this.addDiagnosticForUri(doc.uri, diag, diagnosticsByUri);
          }
          if ((measure as any).sql) {
            this.extractAndRecordReferences(
              (measure as any).sql,
              doc,
              (measure as any).position,
              viewNameToKey,
              dimensionQualifiedNameToKey,
              measureQualifiedNameToKey,
              symbols
            );
          }
        }

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
        for (const dimension of Object.values(view.dimensions)) {
          if (!(dimension as any).sql && !(dimension as any).primaryKey) {
            const diag = this.createDiagnostic(
              DiagnosticSeverity.Warning,
              (dimension as any).position,
              `Dimension '${(dimension as any).name}' is missing sql parameter`,
              "missing-sql"
            );
            diagnostics.push(diag);
            this.addDiagnosticForUri(doc.uri, diag, diagnosticsByUri);
          }
          if (
            (dimension as any).dataType &&
            !validDimensionTypes.includes((dimension as any).dataType)
          ) {
            const diag = this.createDiagnostic(
              DiagnosticSeverity.Error,
              (dimension as any).position,
              `Invalid dimension type '${
                (dimension as any).dataType
              }'. Must be one of: ${validDimensionTypes.join(", ")}`,
              "invalid-dimension-type"
            );
            diagnostics.push(diag);
            this.addDiagnosticForUri(doc.uri, diag, diagnosticsByUri);
          }
          if ((dimension as any).sql) {
            this.extractAndRecordReferences(
              (dimension as any).sql,
              doc,
              (dimension as any).position,
              viewNameToKey,
              dimensionQualifiedNameToKey,
              measureQualifiedNameToKey,
              symbols
            );
          }
        }

        const deprecatedParams = new Set(["fanout_on", "case_sensitive"]);
        this.checkDeprecatedParams(
          view as unknown as AnyASTNode,
          deprecatedParams,
          diagnostics
        );
        for (const field of fields) {
          this.checkDeprecatedParams(field, deprecatedParams, diagnostics);
        }

        if (!this.isSnakeCase(view.name)) {
          const diag = this.createDiagnostic(
            DiagnosticSeverity.Information,
            view.position,
            `View name '${view.name}' should use snake_case`,
            "naming-convention"
          );
          diagnostics.push(diag);
          this.addDiagnosticForUri(doc.uri, diag, diagnosticsByUri);
        }
        for (const field of fields) {
          const name = (field as any).name as string;
          if (!this.isSnakeCase(name)) {
            const diag = this.createDiagnostic(
              DiagnosticSeverity.Information,
              (field as any).position,
              `Field name '${name}' should use snake_case`,
              "naming-convention"
            );
            diagnostics.push(diag);
            this.addDiagnosticForUri(doc.uri, diag, diagnosticsByUri);
          }
        }
      }
    }

    const usedViews = new Set<string>();
    for (const doc of workspace.getParsedDocuments()) {
      const ast = doc.ast!;
      for (const explore of Object.values(ast.explores)) {
        if (explore.baseView) usedViews.add(explore.baseView);
        for (const join of Object.values(explore.joins)) {
          if (join.view) usedViews.add(join.view);
        }
      }
    }
    for (const doc of workspace.getParsedDocuments()) {
      const ast = doc.ast!;
      for (const view of Object.values(ast.views)) {
        if (!usedViews.has(view.name)) {
          const diag = this.createDiagnostic(
            DiagnosticSeverity.Information,
            view.position,
            `View '${view.name}' is not used in any explore`,
            "unused-view"
          );
          diagnostics.push(diag);
          this.addDiagnosticForUri(doc.uri, diag, diagnosticsByUri);
        }
      }
    }

    for (const doc of workspace.getParsedDocuments()) {
      const ast = doc.ast!;
      for (const explore of Object.values(ast.explores)) {
        const visited = new Set<string>();
        const stack = new Set<string>();
        const checkCycle = (viewName: string): boolean => {
          if (stack.has(viewName)) return true;
          if (visited.has(viewName)) return false;
          visited.add(viewName);
          stack.add(viewName);
          for (const join of Object.values(explore.joins)) {
            if (join.view && checkCycle(join.view)) return true;
          }
          stack.delete(viewName);
          return false;
        };
        if (explore.baseView && checkCycle(explore.baseView)) {
          const diag = this.createDiagnostic(
            DiagnosticSeverity.Warning,
            explore.position,
            `Cyclic dependency detected in explore '${explore.name}'`,
            "cyclic-join"
          );
          diagnostics.push(diag);
          this.addDiagnosticForUri(doc.uri, diag, diagnosticsByUri);
        }
      }
    }

    const model: SemanticModel = {
      symbols,
      nodeToSymbol,
      diagnostics,
      diagnosticsByUri,
      symbolsByUri,
    };
    return model;
  }

  private createSymbol(
    uri: string,
    name: string,
    type: string,
    node: AnyASTNode
  ): SemanticSymbol {
    return {
      name,
      type,
      declaration: { uri, position: (node as any).position, node },
      references: [],
    };
  }

  private createSymbolKey(type: string, qualifiedName: string): string {
    return `${type}:${qualifiedName}`;
  }

  private addReference(
    symbols: Map<string, SemanticSymbol>,
    key: string,
    doc: WorkspaceDocument,
    position: AnyASTNode["position"]
  ): void {
    const sym = symbols.get(key);
    if (sym) {
      sym.references.push({ uri: doc.uri, position });
    }
  }

  private extractAndRecordReferences(
    text: string,
    doc: WorkspaceDocument,
    position: AnyASTNode["position"],
    viewNameToKey: Map<string, string>,
    dimensionQualifiedNameToKey: Map<string, string>,
    measureQualifiedNameToKey: Map<string, string>,
    symbols: Map<string, SemanticSymbol>
  ): void {
    const regex = /\$\{([a-zA-Z0-9_]+)(?:\.([a-zA-Z0-9_]+))?\}/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const view = match[1];
      const field = match[2];
      if (field) {
        const dimKey = dimensionQualifiedNameToKey.get(`${view}.${field}`);
        const meaKey = measureQualifiedNameToKey.get(`${view}.${field}`);
        if (dimKey) this.addReference(symbols, dimKey, doc, position);
        if (meaKey) this.addReference(symbols, meaKey, doc, position);
      } else {
        const viewKey = viewNameToKey.get(view);
        if (viewKey) this.addReference(symbols, viewKey, doc, position);
      }
    }
  }

  private checkDeprecatedParams(
    node: AnyASTNode,
    deprecatedParams: Set<string>,
    diagnostics: Diagnostic[]
  ): void {
    if ("parameters" in (node as any)) {
      for (const paramName of Object.keys((node as any).parameters ?? {})) {
        if (deprecatedParams.has(paramName)) {
          diagnostics.push(
            this.createDiagnostic(
              DiagnosticSeverity.Warning,
              (node as any).position,
              `Parameter '${paramName}' is deprecated`,
              "deprecated-parameter"
            )
          );
        }
      }
    }
  }

  private isSnakeCase(name: string): boolean {
    return /^[a-z][a-z0-9_]*$/.test(name);
  }

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

  private addDiagnosticForUri(
    uri: string,
    diagnostic: Diagnostic,
    diagnosticsByUri: Map<string, Diagnostic[]>
  ): void {
    const list = diagnosticsByUri.get(uri) ?? [];
    list.push(diagnostic);
    diagnosticsByUri.set(uri, list);
  }
}
