/**
 * Tests for the LookML Semantic Tokens Provider
 */

import {
  LookMLSemanticTokensProvider,
  createSemanticTokensLegend,
  SEMANTIC_TOKEN_TYPES,
} from "../semantic-tokens-provider";
import { LookMLWorkspace } from "../workspace";

// Mock workspace class for testing
class MockWorkspace extends LookMLWorkspace {
  constructor() {
    super("/mock/workspace");
  }

  addMockDocument(uri: string, content: string) {
    // Use the parent class's updateDocument method to properly store documents
    this.updateDocument(uri, content);
  }
}

describe("LookML Semantic Tokens Provider", () => {
  let provider: LookMLSemanticTokensProvider;
  let mockWorkspace: MockWorkspace;

  beforeEach(() => {
    mockWorkspace = new MockWorkspace();
    provider = new LookMLSemanticTokensProvider(mockWorkspace);
  });

  describe("Token Legend", () => {
    it("should create a proper semantic tokens legend", () => {
      const legend = createSemanticTokensLegend();

      // Check for standard VS Code semantic token types
      expect(legend.tokenTypes).toContain("class");
      expect(legend.tokenTypes).toContain("function");
      expect(legend.tokenTypes).toContain("variable");
      expect(legend.tokenTypes).toContain("keyword");
      expect(legend.tokenTypes).toContain("string");

      expect(legend.tokenModifiers).toContain("declaration");
      expect(legend.tokenModifiers).toContain("definition");
    });
  });

  describe("View Highlighting", () => {
    it("should generate semantic tokens for a simple view", async () => {
      const lookmlContent = `view: test_view {
  dimension: id {
    type: number
    sql: \${TABLE}.id ;;
  }
  
  measure: count {
    type: count
  }
}`;

      mockWorkspace.addMockDocument("test://view.lkml", lookmlContent);

      const tokens = await provider.getSemanticTokens("test://view.lkml");

      expect(tokens).toBeDefined();
      expect(tokens.data).toBeDefined();
      expect(tokens.data.length).toBeGreaterThan(0);

      // Tokens come in groups of 5: [line, char, length, tokenType, modifiers]
      expect(tokens.data.length % 5).toBe(0);
    });

    it("should highlight view keywords and names", async () => {
      const lookmlContent = `view: customer_view {
  dimension: customer_id {
    type: number
  }
}`;

      mockWorkspace.addMockDocument("test://customer.lkml", lookmlContent);

      const tokens = await provider.getSemanticTokens("test://customer.lkml");

      expect(tokens.data.length).toBeGreaterThan(0);

      // Convert token data to readable format for testing
      const legend = createSemanticTokensLegend();
      const readableTokens = [];
      for (let i = 0; i < tokens.data.length; i += 5) {
        readableTokens.push({
          line: tokens.data[i],
          char: tokens.data[i + 1],
          length: tokens.data[i + 2],
          type: legend.tokenTypes[tokens.data[i + 3]],
          modifiers: tokens.data[i + 4],
        });
      }

      // Should have tokens for keywords
      const keywordTokens = readableTokens.filter((t) => t.type === "keyword");
      expect(keywordTokens.length).toBeGreaterThan(0);

      // Should have tokens for view and dimension names (using standard types)
      const classTokens = readableTokens.filter((t) => t.type === "class");
      const variableTokens = readableTokens.filter(
        (t) => t.type === "variable"
      );

      expect(classTokens.length).toBeGreaterThan(0); // view names
      expect(variableTokens.length).toBeGreaterThan(0); // dimension names
    });
  });

  describe("Parameter Highlighting", () => {
    it("should highlight parameter keywords and values", async () => {
      const lookmlContent = `view: test_view {
  dimension: status {
    type: string
    label: "Order Status"
    sql: \${TABLE}.status ;;
  }
}`;

      mockWorkspace.addMockDocument("test://params.lkml", lookmlContent);

      const tokens = await provider.getSemanticTokens("test://params.lkml");

      expect(tokens.data.length).toBeGreaterThan(0);

      // Convert to readable format
      const legend = createSemanticTokensLegend();
      const readableTokens = [];
      for (let i = 0; i < tokens.data.length; i += 5) {
        readableTokens.push({
          line: tokens.data[i],
          char: tokens.data[i + 1],
          length: tokens.data[i + 2],
          type: legend.tokenTypes[tokens.data[i + 3]],
          modifiers: tokens.data[i + 4],
        });
      }

      // Should have keyword tokens for parameters and values
      const keywordTokens = readableTokens.filter((t) => t.type === "keyword");
      expect(keywordTokens.length).toBeGreaterThan(0);

      // All parameter keywords and values should be marked as keywords
      expect(keywordTokens.length).toBeGreaterThanOrEqual(3); // type:, label:, string
    });

    it("should handle quoted strings with spaces in parameter values", async () => {
      const lookmlContent = `view: customer_view {
  dimension: street_address {
    type: string
    label: "Customer Street Address"
    description: "The full street address with spaces"
    sql: \${TABLE}.street_address ;;
  }
}`;

      mockWorkspace.addMockDocument("test://quoted.lkml", lookmlContent);

      const tokens = await provider.getSemanticTokens("test://quoted.lkml");

      expect(tokens.data.length).toBeGreaterThan(0);

      // Convert to readable format
      const legend = createSemanticTokensLegend();
      const readableTokens = [];
      for (let i = 0; i < tokens.data.length; i += 5) {
        readableTokens.push({
          line: tokens.data[i],
          char: tokens.data[i + 1],
          length: tokens.data[i + 2],
          type: legend.tokenTypes[tokens.data[i + 3]],
          modifiers: tokens.data[i + 4],
        });
      }

      // Should have tokens for the dimension keyword
      const keywordTokens = readableTokens.filter((t) => t.type === "keyword");
      expect(keywordTokens.length).toBeGreaterThan(0);

      // Should have tokens for string parameters (quoted values)
      const stringTokens = readableTokens.filter((t) => t.type === "string");
      expect(stringTokens.length).toBeGreaterThan(0);
    });
  });

  describe("Multiple Constructs", () => {
    it("should handle files with multiple constructs", async () => {
      const lookmlContent = `view: orders {
  dimension: id {
    type: number
  }
  
  measure: total_count {
    type: count
  }
}

explore: order_analysis {
  join: customers {
    type: left_outer
    sql_on: \${orders.customer_id} = \${customers.id} ;;
  }
}`;

      mockWorkspace.addMockDocument("test://multiple.lkml", lookmlContent);

      const tokens = await provider.getSemanticTokens("test://multiple.lkml");

      expect(tokens.data.length).toBeGreaterThan(0);

      // Convert to readable format
      const legend = createSemanticTokensLegend();
      const readableTokens = [];
      for (let i = 0; i < tokens.data.length; i += 5) {
        readableTokens.push({
          line: tokens.data[i],
          char: tokens.data[i + 1],
          length: tokens.data[i + 2],
          type: legend.tokenTypes[tokens.data[i + 3]],
          modifiers: tokens.data[i + 4],
        });
      }

      // Should have tokens for both views and explores (using standard types)
      const classTokens = readableTokens.filter((t) => t.type === "class");
      const functionTokens = readableTokens.filter(
        (t) => t.type === "function"
      );
      const keywordTokens = readableTokens.filter((t) => t.type === "keyword");

      expect(classTokens.length).toBeGreaterThan(0); // view names, explore names, join names
      expect(functionTokens.length).toBeGreaterThan(0); // measure names
      expect(keywordTokens.length).toBeGreaterThan(0); // construct keywords
    });
  });

  describe("Error Handling", () => {
    it("should return empty tokens for non-existent documents", async () => {
      const tokens = await provider.getSemanticTokens(
        "test://nonexistent.lkml"
      );

      expect(tokens).toBeDefined();
      expect(tokens.data).toEqual([]);
    });

    it("should return empty tokens for documents without AST", async () => {
      // Add a document with invalid content that won't parse
      const invalidContent = "invalid lookml content {{{";
      mockWorkspace.addMockDocument("test://invalid.lkml", invalidContent);

      const tokens = await provider.getSemanticTokens("test://invalid.lkml");

      expect(tokens).toBeDefined();
      expect(tokens.data).toEqual([]);
    });
  });
});
