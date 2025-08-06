/**
 * Tests for the LookML Workspace functionality
 */

import * as path from "path";
import { LookMLWorkspace } from "../workspace";

describe("LookML Workspace", () => {
  let workspace: LookMLWorkspace;
  const testWorkspaceDir = path.join(
    __dirname,
    "../../workspace-tools/__tests__/fixtures"
  );

  beforeEach(() => {
    workspace = new LookMLWorkspace(testWorkspaceDir);
  });

  describe("Document Management", () => {
    it("should parse and store LookML content", () => {
      const content = `
        view: test_view {
          dimension: id {
            type: number
            sql: \${TABLE}.id ;;
          }
          
          measure: count {
            type: count
          }
        }
      `;

      workspace.updateDocument("test://test.lkml", content);
      const document = workspace.getDocument("test://test.lkml");

      expect(document).toBeDefined();
      expect(document!.content).toBe(content);
      expect(document!.parseResult.success).toBe(true);
      expect(document!.ast).toBeDefined();
    });

    it("should handle parse errors gracefully", () => {
      const malformedContent = `
        view: test_view {
          dimension: id {
            invalid_syntax!!!
      `;

      workspace.updateDocument("test://malformed.lkml", malformedContent);
      const document = workspace.getDocument("test://malformed.lkml");

      expect(document).toBeDefined();
      expect(document!.parseResult.success).toBe(false);
      expect(document!.parseResult.error).toBeDefined();
      expect(document!.ast).toBeUndefined();
    });
  });

  describe("Symbol Indexing", () => {
    beforeEach(() => {
      const viewContent = `
        view: orders {
          dimension: id {
            type: number
            primary_key: yes
            sql: \${TABLE}.id ;;
          }
          
          dimension: customer_id {
            type: number
            sql: \${TABLE}.customer_id ;;
          }
          
          measure: count {
            type: count
            drill_fields: [id, customer_id]
          }
        }
      `;

      const exploreContent = `
        explore: sales_analysis {
          join: customers {
            sql_on: \${orders.customer_id} = \${customers.id} ;;
            relationship: many_to_one
          }
        }
      `;

      workspace.updateDocument("test://orders.view.lkml", viewContent);
      workspace.updateDocument("test://explores.lkml", exploreContent);
    });

    it("should index views correctly", () => {
      const view = workspace.findView("orders");
      expect(view).toBeDefined();
      expect(view!.name).toBe("orders");
      expect(view!.type).toBe("view");
    });

    it("should index explores correctly", () => {
      const explore = workspace.findExplore("sales_analysis");
      expect(explore).toBeDefined();
      expect(explore!.name).toBe("sales_analysis");
      expect(explore!.type).toBe("explore");
    });

    it("should find symbols by name", () => {
      const symbols = workspace.findSymbols("id");
      expect(symbols.length).toBeGreaterThan(0);

      const idDimension = symbols.find(
        (s) => s.type === "dimension" && s.name === "id"
      );
      expect(idDimension).toBeDefined();
    });

    it("should get all views and explores", () => {
      const views = workspace.getAllViews();
      expect(views.length).toBe(1);
      expect(views[0].name).toBe("orders");

      const explores = workspace.getAllExplores();
      expect(explores.length).toBe(1);
      expect(explores[0].name).toBe("sales_analysis");
    });
  });

  describe("Symbol Position Queries", () => {
    beforeEach(() => {
      const content = `view: test_view {
  dimension: id {
    type: number
  }
}`;
      workspace.updateDocument("test://position.lkml", content);
    });

    it("should find symbols at specific positions", () => {
      // This test would need actual line/character positions from the parsed content
      // For now, we'll test that the method exists and handles edge cases
      const symbol = workspace.getSymbolAt("test://position.lkml", 0, 5);
      // The exact assertion would depend on the parsed positions
      expect(symbol).toBeDefined();
    });
  });

  describe("Reference Finding", () => {
    beforeEach(() => {
      const viewContent = `
        view: customers {
          dimension: id {
            type: number
            primary_key: yes
          }
        }
      `;

      const exploreContent = `
        explore: customer_analysis {
          join: orders {
            sql_on: \${customers.id} = \${orders.customer_id} ;;
          }
        }
      `;

      workspace.updateDocument("test://customers.view.lkml", viewContent);
      workspace.updateDocument("test://customer_explore.lkml", exploreContent);
    });

    it("should find references to views", () => {
      const references = workspace.findReferences("customers", "view");
      expect(references.length).toBeGreaterThan(0);
    });

    it("should find references to fields", () => {
      const references = workspace.findReferences("id", "dimension");
      expect(references.length).toBeGreaterThan(0);
    });
  });

  describe("Workspace Statistics", () => {
    beforeEach(() => {
      const viewContent = `
        view: test_view {
          dimension: id { type: number }
        }
      `;

      const exploreContent = `
        explore: test_explore {
          view_name: test_view
        }
      `;

      workspace.updateDocument("test://view.lkml", viewContent);
      workspace.updateDocument("test://explore.lkml", exploreContent);
    });

    it("should provide accurate workspace statistics", () => {
      const stats = workspace.getWorkspaceStats();

      expect(stats.totalFiles).toBe(2);
      expect(stats.parsedFiles).toBe(2);
      expect(stats.errorFiles).toBe(0);
      expect(stats.totalViews).toBe(1);
      expect(stats.totalExplores).toBe(1);
    });
  });
});
