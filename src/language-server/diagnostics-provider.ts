import { Diagnostic } from "vscode-languageserver/node";
import { LookMLWorkspace } from "./workspace";

export class LookMLDiagnosticsProvider {
  private workspace: LookMLWorkspace;

  constructor(workspace: LookMLWorkspace) {
    this.workspace = workspace;
  }

  async getDiagnostics(uri: string): Promise<Diagnostic[]> {
    const model = this.workspace.semanticModel;
    if (!model) return [];
    const byUri = model.diagnosticsByUri?.get(uri);
    if (byUri) return byUri;
    return model.diagnostics;
  }
}
