import * as fs from "fs";
import * as path from "path";
import { LookML } from "../parse-lookml";

// Helper function to read fixture files
const readFixture = (filename: string): string => {
  return fs.readFileSync(path.join(__dirname, "fixtures", filename), "utf-8");
};

describe("LookML Parser", () => {
  describe("Simple View Parsing", () => {
    it("should correctly parse a simple view with a dimension and a measure", () => {
      // Arrange
      const lookmlContent = readFixture("01-simple-view.view.lkml");

      // Act
      const result = LookML.parseContent(
        lookmlContent,
        "01-simple-view.view.lkml"
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toMatchSnapshot();
      expect(result.data?.views).toHaveLength(1);
      expect(result.data?.explores).toHaveLength(0);

      const view = result.data!.views[0];
      expect(view.name).toBe("orders");
      expect(view.fields).toHaveLength(2);

      // Verify specific fields
      const idField = view.fields.find((field) => field.name === "id");
      expect(idField?.type).toBe("dimension");

      const countField = view.fields.find((field) => field.name === "count");
      expect(countField?.type).toBe("measure");
    });
  });

  describe("Comprehensive Field Type Parsing", () => {
    it("should parse all different field types correctly", () => {
      // Arrange
      const lookmlContent = readFixture(
        "02-view-with-all-field-types.view.lkml"
      );

      // Act
      const result = LookML.parseContent(
        lookmlContent,
        "02-view-with-all-field-types.view.lkml"
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toMatchSnapshot();
      expect(result.data?.views).toHaveLength(1);

      const view = result.data!.views[0];
      expect(view.name).toBe("comprehensive_test");
      expect(view.fields.length).toBeGreaterThan(5);

      // Check for different field types
      const fieldTypes = view.fields.map((field) => field.type);
      expect(fieldTypes).toContain("dimension");
      expect(fieldTypes).toContain("measure");
      expect(fieldTypes).toContain("filter");
      expect(fieldTypes).toContain("parameter");
    });
  });

  describe("Comments and Mixed Content Parsing", () => {
    it("should handle views with comments and skip commented lines", () => {
      // Arrange
      const lookmlContent = readFixture("03-view-with-comments.view.lkml");

      // Act
      const result = LookML.parseContent(
        lookmlContent,
        "03-view-with-comments.view.lkml"
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toMatchSnapshot();
      expect(result.data?.views).toHaveLength(1);

      const view = result.data!.views[0];
      expect(view.name).toBe("orders_with_comments");

      // Should parse fields correctly despite comments
      const fieldNames = view.fields.map((field) => field.name);
      expect(fieldNames).toContain("id");
      expect(fieldNames).toContain("customer_id");
      expect(fieldNames).toContain("order_count");
      expect(fieldNames).toContain("total_revenue");
    });
  });

  describe("Malformed Content Handling", () => {
    it("should handle malformed LookML gracefully", () => {
      // Arrange
      const lookmlContent = readFixture("04-malformed-view.view.lkml");

      // Act
      const result = LookML.parseContent(
        lookmlContent,
        "04-malformed-view.view.lkml"
      );

      // Assert - should not throw errors, but may have incomplete parsing
      expect(result.success).toBe(true);
      expect(result.data).toMatchSnapshot();
      expect(result.data?.views).toHaveLength(1);

      const view = result.data!.views[0];
      expect(view.name).toBe("malformed_test");
      // Should still parse what it can
      expect(view.fields.length).toBeGreaterThan(0);
    });
  });

  describe("Explore Parsing", () => {
    it("should parse explores with joins correctly", () => {
      // Arrange
      const lookmlContent = readFixture("05-explore-with-joins.view.lkml");

      // Act
      const result = LookML.parseContent(
        lookmlContent,
        "05-explore-with-joins.view.lkml"
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toMatchSnapshot();
      expect(result.data?.explores).toHaveLength(1);
      expect(result.data?.views).toHaveLength(0);

      const explore = result.data!.explores[0];
      expect(explore.name).toBe("sales_analysis");

      // Check for joins
      const joinFields = explore.fields.filter(
        (field) => field.type === "join"
      );
      expect(joinFields.length).toBeGreaterThan(0);

      const joinNames = joinFields.map((field) => field.name);
      expect(joinNames).toContain("customers");
      expect(joinNames).toContain("products");
    });
  });

  describe("Dimension Groups", () => {
    it("should handle dimension_group parsing", () => {
      // Arrange
      const lookmlContent = readFixture("06-dimension-groups.view.lkml");

      // Act
      const result = LookML.parseContent(
        lookmlContent,
        "06-dimension-groups.view.lkml"
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toMatchSnapshot();
      expect(result.data?.views).toHaveLength(1);

      const view = result.data!.views[0];
      expect(view.name).toBe("events");
      expect(view.fields.length).toBeGreaterThan(0);

      // Verify dimension_group is parsed correctly with proper type recognition
      const dimensionGroupField = view.fields.find(
        (field) => field.type === "dimension_group"
      );
      expect(dimensionGroupField).toBeDefined();
      expect(dimensionGroupField!.name).toBe("created");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty content", () => {
      // Act
      const result = LookML.parseContent("", "empty.lkml");

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.views).toHaveLength(0);
      expect(result.data?.explores).toHaveLength(0);
    });

    it("should handle content with only comments", () => {
      // Arrange
      const commentOnlyContent = `
        # This is a comment
        # This is another comment
        # Another comment line
      `;

      // Act
      const result = LookML.parseContent(
        commentOnlyContent,
        "comments-only.lkml"
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.views).toHaveLength(0);
      expect(result.data?.explores).toHaveLength(0);
    });

    it("should handle multiple views in one file", () => {
      // Arrange
      const multiViewContent = `
        view: first_view {
          dimension: id {
            type: number
          }
        }
        
        view: second_view {
          measure: count {
            type: count
          }
        }
      `;

      // Act
      const result = LookML.parseContent(multiViewContent, "multi-view.lkml");

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.views).toHaveLength(2);
      expect(result.data!.views[0].name).toBe("first_view");
      expect(result.data!.views[1].name).toBe("second_view");
    });
  });

  describe("Instance Methods", () => {
    it("should allow merging content into existing parser instance", () => {
      // Arrange
      const parser = new LookML();
      const content1 = readFixture("01-simple-view.view.lkml");
      const content2 = readFixture("02-view-with-all-field-types.view.lkml");

      // Act
      parser.parseAndMergeContent(content1, "file1.lkml");
      parser.parseAndMergeContent(content2, "file2.lkml");

      // Assert
      expect(parser.views).toHaveLength(2);
      expect(parser.views[0].name).toBe("orders");
      expect(parser.views[1].name).toBe("comprehensive_test");
    });
  });

  describe("Field Properties Validation", () => {
    it("should correctly populate field properties", () => {
      // Arrange
      const lookmlContent = readFixture("01-simple-view.view.lkml");

      // Act
      const result = LookML.parseContent(
        lookmlContent,
        "01-simple-view.view.lkml"
      );

      // Assert
      expect(result.success).toBe(true);
      const view = result.data!.views[0];
      const idField = view.fields.find((field) => field.name === "id");

      expect(idField).toBeDefined();
      expect(idField!.name).toBe("id");
      expect(idField!.type).toBe("dimension");
      expect(idField!.viewName).toBe("orders");
      expect(idField!.fileName).toBe("01-simple-view.view.lkml");
      expect(typeof idField!.lineNumber).toBe("number");
    });
  });

  describe("Error Handling", () => {
    it("should return error result for truly malformed content", () => {
      // Arrange
      const malformedContent = `
        view: test {
          dimension: id {
            type: number
            invalid_syntax_here!!!
            [unclosed bracket
          }
        }
        invalid_top_level_syntax!!!
      `;

      // Act
      const result = LookML.parseContent(malformedContent, "malformed.lkml");

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBeDefined();
      expect(result.data).toBeUndefined();
    });

    it("should propagate errors when using parseAndMergeContent", () => {
      // Arrange
      const parser = new LookML();
      const malformedContent = `
        view: test {
          dimension: id {
            invalid_syntax!!!
      `;

      // Act & Assert
      expect(() => {
        parser.parseAndMergeContent(malformedContent, "malformed.lkml");
      }).toThrow();
    });
  });
});
