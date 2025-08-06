import * as fs from "fs";
import * as path from "path";
import { LookMLASTParser } from "../ast-parser";
import {
  LookMLFile,
  ViewNode,
  ExploreNode,
  DimensionNode,
  MeasureNode,
  FilterNode,
  ParameterNode,
  JoinNode,
  isNodeOfType,
} from "../ast-types";

// Helper function to read fixture files
const readFixture = (filename: string): string => {
  return fs.readFileSync(path.join(__dirname, "fixtures", filename), "utf-8");
};

describe("LookML AST Parser", () => {
  describe("Simple View AST Parsing", () => {
    it("should correctly parse a simple view into a complete AST", () => {
      // Arrange
      const lookmlContent = readFixture("01-simple-view.view.lkml");

      // Act
      const result = LookMLASTParser.parseContent(
        lookmlContent,
        "01-simple-view.view.lkml"
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.ast).toBeDefined();

      const ast = result.ast!;
      expect(ast.fileName).toBe("01-simple-view.view.lkml");
      expect(Object.keys(ast.views)).toHaveLength(1);
      expect(Object.keys(ast.explores)).toHaveLength(0);

      // Check view structure
      const view = ast.views.orders;
      expect(view).toBeDefined();
      expect(view.name).toBe("orders");
      expect(view.type).toBe("view");
      expect(view.position).toBeDefined();
      expect(view.position.startLine).toBeDefined();

      // Check dimensions
      expect(Object.keys(view.dimensions)).toHaveLength(1);
      const idDimension = view.dimensions.id;
      expect(idDimension).toBeDefined();
      expect(idDimension.name).toBe("id");
      expect(idDimension.type).toBe("dimension");
      expect(idDimension.dataType).toBe("number");
      expect(idDimension.sql).toBe(" ${TABLE}.id ");

      // Check measures
      expect(Object.keys(view.measures)).toHaveLength(1);
      const countMeasure = view.measures.count;
      expect(countMeasure).toBeDefined();
      expect(countMeasure.name).toBe("count");
      expect(countMeasure.type).toBe("measure");
      expect(countMeasure.measureType).toBe("count");
    });
  });

  describe("Comprehensive Field Type AST Parsing", () => {
    it("should parse all field types with complete information", () => {
      // Arrange
      const lookmlContent = readFixture(
        "02-view-with-all-field-types.view.lkml"
      );

      // Act
      const result = LookMLASTParser.parseContent(
        lookmlContent,
        "02-view-with-all-field-types.view.lkml"
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.ast).toBeDefined();

      const view = result.ast!.views.comprehensive_test;
      expect(view).toBeDefined();

      // Check dimensions
      expect(Object.keys(view.dimensions)).toHaveLength(3);
      expect(view.dimensions.id.dataType).toBe("number");
      expect(view.dimensions.name.dataType).toBe("string");
      expect(view.dimensions.status.dataType).toBe("string");

      // Check measures with detailed properties
      expect(Object.keys(view.measures)).toHaveLength(2);

      const totalCountMeasure = view.measures.total_count;
      expect(totalCountMeasure.measureType).toBe("count");
      expect(totalCountMeasure.drillFields).toEqual(["id", "name"]);

      const avgMeasure = view.measures.average_amount;
      expect(avgMeasure.measureType).toBe("average");
      expect(avgMeasure.sql).toBe(" ${TABLE}.amount ");

      // Check filters
      expect(Object.keys(view.filters)).toHaveLength(1);
      const dateFilter = view.filters.date_filter;
      expect(dateFilter.filterType).toBe("date_time");

      // Check parameters with complex allowed_values
      expect(Object.keys(view.parameterNodes)).toHaveLength(1);
      const timePeriodParam = view.parameterNodes.time_period;
      expect(timePeriodParam.parameterType).toBe("unquoted");
      expect(timePeriodParam.allowedValues).toBeDefined();
      expect(timePeriodParam.allowedValues!.type).toBe("allowed_values");
      expect(timePeriodParam.allowedValues!.properties.label).toBe(
        "Last 7 Days"
      );
      expect(timePeriodParam.allowedValues!.properties.value).toBe("7");
    });
  });

  describe("Explore AST Parsing", () => {
    it("should parse explores with joins correctly", () => {
      // Arrange
      const lookmlContent = readFixture("05-explore-with-joins.view.lkml");

      // Act
      const result = LookMLASTParser.parseContent(
        lookmlContent,
        "05-explore-with-joins.view.lkml"
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.ast).toBeDefined();

      const explore = result.ast!.explores.sales_analysis;
      expect(explore).toBeDefined();
      expect(explore.name).toBe("sales_analysis");
      expect(explore.type).toBe("explore");

      // Check joins
      expect(Object.keys(explore.joins)).toHaveLength(2);

      const customersJoin = explore.joins.customers;
      expect(customersJoin).toBeDefined();
      expect(customersJoin.name).toBe("customers");
      expect(customersJoin.type).toBe("join");
      expect(customersJoin.sqlOn).toBe(
        " ${orders.customer_id} = ${customers.id} "
      );
      expect(customersJoin.relationship).toBe("many_to_one");

      const productsJoin = explore.joins.products;
      expect(productsJoin).toBeDefined();
      expect(productsJoin.name).toBe("products");
      expect(productsJoin.sqlOn).toBe(
        " ${order_items.product_id} = ${products.id} "
      );
      expect(productsJoin.relationship).toBe("many_to_one");
    });
  });

  describe("Dimension Groups AST Parsing", () => {
    it("should handle dimension_group parsing with full details", () => {
      // Arrange
      const lookmlContent = readFixture("06-dimension-groups.view.lkml");

      // Act
      const result = LookMLASTParser.parseContent(
        lookmlContent,
        "06-dimension-groups.view.lkml"
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.ast).toBeDefined();

      const view = result.ast!.views.events;
      expect(view).toBeDefined();

      // Check dimension groups
      expect(Object.keys(view.dimensionGroups)).toHaveLength(1);
      const createdGroup = view.dimensionGroups.created;
      expect(createdGroup).toBeDefined();
      expect(createdGroup.name).toBe("created");
      expect(createdGroup.type).toBe("dimension_group");
    });
  });

  describe("Position Information", () => {
    it("should preserve accurate position information for all nodes", () => {
      // Arrange
      const lookmlContent = readFixture("01-simple-view.view.lkml");

      // Act
      const result = LookMLASTParser.parseContent(
        lookmlContent,
        "01-simple-view.view.lkml"
      );

      // Assert
      expect(result.success).toBe(true);
      const ast = result.ast!;

      // Check that all nodes have position information
      const view = ast.views.orders;
      expect(view.position.startLine).toBeGreaterThanOrEqual(0);
      expect(view.position.startChar).toBeGreaterThanOrEqual(0);
      expect(view.position.endLine).toBeGreaterThanOrEqual(
        view.position.startLine
      );

      const idDimension = view.dimensions.id;
      expect(idDimension.position.startLine).toBeGreaterThanOrEqual(0);
      expect(idDimension.position.startChar).toBeGreaterThanOrEqual(0);

      const countMeasure = view.measures.count;
      expect(countMeasure.position.startLine).toBeGreaterThanOrEqual(0);
      expect(countMeasure.position.startChar).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Parameter Extraction", () => {
    it("should extract all parameters correctly", () => {
      // Arrange
      const lookmlContent = readFixture(
        "02-view-with-all-field-types.view.lkml"
      );

      // Act
      const result = LookMLASTParser.parseContent(
        lookmlContent,
        "02-view-with-all-field-types.view.lkml"
      );

      // Assert
      expect(result.success).toBe(true);
      const view = result.ast!.views.comprehensive_test;

      // Check that parameters are extracted for dimensions
      const idDimension = view.dimensions.id;
      expect(idDimension.parameters).toBeDefined();
      expect(Object.keys(idDimension.parameters).length).toBeGreaterThan(0);

      // Check that SQL parameters are preserved
      expect(idDimension.sql).toBe(" ${TABLE}.id ");
    });
  });

  describe("Type Guards", () => {
    it("should correctly identify node types", () => {
      // Arrange
      const lookmlContent = readFixture("01-simple-view.view.lkml");
      const result = LookMLASTParser.parseContent(lookmlContent);
      const view = result.ast!.views.orders;

      // Act & Assert
      expect(isNodeOfType(view, "view")).toBe(true);
      expect(isNodeOfType(view, "explore")).toBe(false);

      const dimension = view.dimensions.id;
      expect(isNodeOfType(dimension, "dimension")).toBe(true);
      expect(isNodeOfType(dimension, "measure")).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should handle malformed content gracefully", () => {
      // Arrange
      const malformedContent = `
        view: test {
          dimension: id {
            invalid_syntax!!!
      `;

      // Act
      const result = LookMLASTParser.parseContent(malformedContent);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.ast).toBeUndefined();
    });

    it("should handle empty content", () => {
      // Act
      const result = LookMLASTParser.parseContent("");

      // Assert
      expect(result.success).toBe(true);
      expect(result.ast).toBeDefined();
      expect(Object.keys(result.ast!.views)).toHaveLength(0);
      expect(Object.keys(result.ast!.explores)).toHaveLength(0);
    });
  });

  describe("Raw Token Preservation", () => {
    it("should preserve raw tokens for reconstruction", () => {
      // Arrange
      const lookmlContent = readFixture("01-simple-view.view.lkml");

      // Act
      const result = LookMLASTParser.parseContent(lookmlContent);

      // Assert
      expect(result.success).toBe(true);
      const view = result.ast!.views.orders;

      // Check that raw tokens are preserved
      expect(view.rawTokens).toBeDefined();
      expect(Array.isArray(view.rawTokens)).toBe(true);

      const dimension = view.dimensions.id;
      expect(dimension.rawTokens).toBeDefined();
      expect(Array.isArray(dimension.rawTokens)).toBe(true);
    });
  });

  describe("Complex Nested Structures", () => {
    it("should handle multiple views in one file", () => {
      // Arrange
      const multiViewContent = `
        view: first_view {
          dimension: id {
            type: number
            sql: \${TABLE}.id ;;
          }
        }
        
        view: second_view {
          measure: count {
            type: count
            drill_fields: [id, name]
          }
        }
      `;

      // Act
      const result = LookMLASTParser.parseContent(multiViewContent);

      // Assert
      expect(result.success).toBe(true);
      expect(Object.keys(result.ast!.views)).toHaveLength(2);

      const firstView = result.ast!.views.first_view;
      expect(firstView.name).toBe("first_view");
      expect(Object.keys(firstView.dimensions)).toHaveLength(1);

      const secondView = result.ast!.views.second_view;
      expect(secondView.name).toBe("second_view");
      expect(Object.keys(secondView.measures)).toHaveLength(1);
      expect(secondView.measures.count.drillFields).toEqual(["id", "name"]);
    });
  });
});
