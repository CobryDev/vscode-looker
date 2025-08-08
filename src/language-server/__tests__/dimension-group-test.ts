/**
 * Specific test for dimension_group highlighting
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
    this.updateDocument(uri, content);
  }
}

describe("Dimension Group Highlighting", () => {
  let provider: LookMLSemanticTokensProvider;
  let mockWorkspace: MockWorkspace;

  beforeEach(() => {
    mockWorkspace = new MockWorkspace();
    provider = new LookMLSemanticTokensProvider(mockWorkspace);
  });

  it("should highlight dimension_group keyword", async () => {
    const lookmlContent = `view: test_view {
  dimension_group: created {
    type: time
    timeframes: [raw, date, week, month]
  }
}`;

    mockWorkspace.addMockDocument("test://dimension-group.lkml", lookmlContent);

    const tokens = await provider.getSemanticTokens(
      "test://dimension-group.lkml"
    );

    expect(tokens.data.length).toBeGreaterThan(0);

    // Convert to readable format
    const legend = createSemanticTokensLegend();
    const readableTokens = [];
    const lines = lookmlContent.split("\n");

    for (let i = 0; i < tokens.data.length; i += 5) {
      const line = tokens.data[i];
      const char = tokens.data[i + 1];
      const length = tokens.data[i + 2];
      const tokenTypeIndex = tokens.data[i + 3];
      const tokenType = legend.tokenTypes[tokenTypeIndex];

      const lineText = lines[line] || "";
      const tokenText = lineText.substring(char, char + length);

      readableTokens.push({
        text: tokenText,
        type: tokenType,
        line,
        char,
        length,
      });
    }

    console.log("Generated tokens:");
    readableTokens.forEach((token, i) => {
      console.log(
        `Token ${i}: "${token.text}" | Type: ${token.type} | Line: ${token.line} | Char: ${token.char}`
      );
    });

    // Should have keyword tokens for dimension_group
    const keywordTokens = readableTokens.filter((t) => t.type === "keyword");
    const dimensionGroupToken = keywordTokens.find(
      (t) => t.text === "dimension_group"
    );

    expect(dimensionGroupToken).toBeDefined();
    expect(dimensionGroupToken?.type).toBe("keyword");
  });
});
