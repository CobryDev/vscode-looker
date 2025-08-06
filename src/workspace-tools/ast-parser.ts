/**
 * Enhanced LookML parser that builds a complete Abstract Syntax Tree (AST)
 *
 * This parser takes the output from the external lookml-parser library
 * and transforms it into a rich, typed AST that preserves all information
 * needed for language server operations.
 */

import {
  LookMLFile,
  ViewNode,
  ExploreNode,
  ModelNode,
  DashboardNode,
  DimensionNode,
  MeasureNode,
  FilterNode,
  ParameterNode,
  DimensionGroupNode,
  JoinNode,
  DerivedTableNode,
  Position,
  ParameterValue,
  ParameterObject,
  ASTNode,
} from "./ast-types";

const lookmlParser = require("lookml-parser");

/**
 * Result type for AST parsing operations
 */
export interface ASTParseResult {
  success: boolean;
  ast?: LookMLFile;
  error?: Error;
}

/**
 * Enhanced parser that builds a complete AST from LookML content
 */
export class LookMLASTParser {
  /**
   * Parse LookML content and return a complete AST
   */
  public static parseContent(
    content: string,
    fileName: string = "test.lkml"
  ): ASTParseResult {
    try {
      // Parse using the external lookml-parser
      const parsed = lookmlParser.parse(content);
      const positions = lookmlParser.getPositions(parsed);

      // Transform to our AST
      const ast = LookMLASTParser.transformToAST(parsed, positions, fileName);

      return {
        success: true,
        ast,
      };
    } catch (error) {
      const parseError =
        error instanceof Error ? error : new Error(String(error));
      return {
        success: false,
        error: parseError,
      };
    }
  }

  /**
   * Transform the external parser output to our AST format
   */
  private static transformToAST(
    parsed: any,
    positions: any,
    fileName: string
  ): LookMLFile {
    const filePosition = LookMLASTParser.extractPosition(positions);

    const ast: LookMLFile = {
      fileName,
      position: filePosition,
      rawTokens: parsed.$strings,
      views: {},
      explores: {},
      models: {},
      dashboards: {},
    };

    // Process views
    if (parsed.view) {
      for (const [viewName, viewData] of Object.entries(parsed.view)) {
        ast.views[viewName] = LookMLASTParser.transformView(
          viewName,
          viewData as any,
          positions?.view?.[viewName]
        );
      }
    }

    // Process explores
    if (parsed.explore) {
      for (const [exploreName, exploreData] of Object.entries(parsed.explore)) {
        ast.explores[exploreName] = LookMLASTParser.transformExplore(
          exploreName,
          exploreData as any,
          positions?.explore?.[exploreName]
        );
      }
    }

    // Process models
    if (parsed.model) {
      for (const [modelName, modelData] of Object.entries(parsed.model)) {
        ast.models[modelName] = LookMLASTParser.transformModel(
          modelName,
          modelData as any,
          positions?.model?.[modelName]
        );
      }
    }

    // Process dashboards
    if (parsed.dashboard) {
      for (const [dashboardName, dashboardData] of Object.entries(
        parsed.dashboard
      )) {
        ast.dashboards[dashboardName] = LookMLASTParser.transformDashboard(
          dashboardName,
          dashboardData as any,
          positions?.dashboard?.[dashboardName]
        );
      }
    }

    return ast;
  }

  /**
   * Transform a view object to ViewNode
   */
  private static transformView(
    name: string,
    viewData: any,
    positionData?: any
  ): ViewNode {
    const position = LookMLASTParser.extractPosition(positionData);
    const parameters = LookMLASTParser.extractParameters(viewData);

    const view: ViewNode = {
      name,
      type: "view",
      position,
      rawTokens: viewData.$strings,
      parameters,
      dimensions: {},
      measures: {},
      filters: {},
      parameterNodes: {},
      dimensionGroups: {},
    };

    // Process dimensions
    if (viewData.dimension) {
      for (const [dimName, dimData] of Object.entries(viewData.dimension)) {
        view.dimensions[dimName] = LookMLASTParser.transformDimension(
          dimName,
          dimData as any,
          positionData?.dimension?.[dimName]
        );
      }
    }

    // Process measures
    if (viewData.measure) {
      for (const [measureName, measureData] of Object.entries(
        viewData.measure
      )) {
        view.measures[measureName] = LookMLASTParser.transformMeasure(
          measureName,
          measureData as any,
          positionData?.measure?.[measureName]
        );
      }
    }

    // Process filters
    if (viewData.filter) {
      for (const [filterName, filterData] of Object.entries(viewData.filter)) {
        view.filters[filterName] = LookMLASTParser.transformFilter(
          filterName,
          filterData as any,
          positionData?.filter?.[filterName]
        );
      }
    }

    // Process parameters
    if (viewData.parameter) {
      for (const [paramName, paramData] of Object.entries(viewData.parameter)) {
        view.parameterNodes[paramName] = LookMLASTParser.transformParameter(
          paramName,
          paramData as any,
          positionData?.parameter?.[paramName]
        );
      }
    }

    // Process dimension groups
    if (viewData.dimension_group) {
      for (const [groupName, groupData] of Object.entries(
        viewData.dimension_group
      )) {
        view.dimensionGroups[groupName] =
          LookMLASTParser.transformDimensionGroup(
            groupName,
            groupData as any,
            positionData?.dimension_group?.[groupName]
          );
      }
    }

    // Process derived table if present
    if (viewData.derived_table) {
      view.derivedTable = LookMLASTParser.transformDerivedTable(
        viewData.derived_table,
        positionData?.derived_table
      );
    }

    return view;
  }

  /**
   * Transform an explore object to ExploreNode
   */
  private static transformExplore(
    name: string,
    exploreData: any,
    positionData?: any
  ): ExploreNode {
    const position = LookMLASTParser.extractPosition(positionData);
    const parameters = LookMLASTParser.extractParameters(exploreData);

    const explore: ExploreNode = {
      name,
      type: "explore",
      position,
      rawTokens: exploreData.$strings,
      parameters,
      joins: {},
    };

    // Process joins
    if (exploreData.join) {
      for (const [joinName, joinData] of Object.entries(exploreData.join)) {
        explore.joins[joinName] = LookMLASTParser.transformJoin(
          joinName,
          joinData as any,
          positionData?.join?.[joinName]
        );
      }
    }

    // Extract base view if specified
    if (exploreData.view_name) {
      explore.baseView = exploreData.view_name;
    }

    return explore;
  }

  /**
   * Transform a model object to ModelNode
   */
  private static transformModel(
    name: string,
    modelData: any,
    positionData?: any
  ): ModelNode {
    const position = LookMLASTParser.extractPosition(positionData);
    const parameters = LookMLASTParser.extractParameters(modelData);

    const model: ModelNode = {
      name,
      type: "model",
      position,
      rawTokens: modelData.$strings,
      parameters,
      explores: {},
    };

    // Extract connection
    if (modelData.connection) {
      model.connection = modelData.connection;
    }

    // Extract includes
    if (modelData.include) {
      model.includes = Array.isArray(modelData.include)
        ? modelData.include
        : [modelData.include];
    }

    // Process explores within the model
    if (modelData.explore) {
      for (const [exploreName, exploreData] of Object.entries(
        modelData.explore
      )) {
        model.explores[exploreName] = LookMLASTParser.transformExplore(
          exploreName,
          exploreData as any,
          positionData?.explore?.[exploreName]
        );
      }
    }

    return model;
  }

  /**
   * Transform a dashboard object to DashboardNode
   */
  private static transformDashboard(
    name: string,
    dashboardData: any,
    positionData?: any
  ): DashboardNode {
    const position = LookMLASTParser.extractPosition(positionData);
    const parameters = LookMLASTParser.extractParameters(dashboardData);

    return {
      name,
      type: "dashboard",
      position,
      rawTokens: dashboardData.$strings,
      parameters,
      elements: {}, // TODO: Implement dashboard element transformation
      filters: {}, // TODO: Implement dashboard filter transformation
    };
  }

  /**
   * Transform a dimension object to DimensionNode
   */
  private static transformDimension(
    name: string,
    dimData: any,
    positionData?: any
  ): DimensionNode {
    const position = LookMLASTParser.extractPosition(positionData);
    const parameters = LookMLASTParser.extractParameters(dimData);

    return {
      name,
      type: "dimension",
      position,
      rawTokens: dimData.$strings,
      parameters,
      dataType: dimData.type,
      sql: dimData.sql,
      hidden: dimData.hidden === "yes",
      primaryKey: dimData.primary_key === "yes",
    };
  }

  /**
   * Transform a measure object to MeasureNode
   */
  private static transformMeasure(
    name: string,
    measureData: any,
    positionData?: any
  ): MeasureNode {
    const position = LookMLASTParser.extractPosition(positionData);
    const parameters = LookMLASTParser.extractParameters(measureData);

    return {
      name,
      type: "measure",
      position,
      rawTokens: measureData.$strings,
      parameters,
      measureType: measureData.type,
      sql: measureData.sql,
      hidden: measureData.hidden === "yes",
      drillFields: measureData.drill_fields,
    };
  }

  /**
   * Transform a filter object to FilterNode
   */
  private static transformFilter(
    name: string,
    filterData: any,
    positionData?: any
  ): FilterNode {
    const position = LookMLASTParser.extractPosition(positionData);
    const parameters = LookMLASTParser.extractParameters(filterData);

    return {
      name,
      type: "filter",
      position,
      rawTokens: filterData.$strings,
      parameters,
      filterType: filterData.type,
      defaultValue: filterData.default_value,
    };
  }

  /**
   * Transform a parameter object to ParameterNode
   */
  private static transformParameter(
    name: string,
    paramData: any,
    positionData?: any
  ): ParameterNode {
    const position = LookMLASTParser.extractPosition(positionData);
    const parameters = LookMLASTParser.extractParameters(paramData);

    const parameter: ParameterNode = {
      name,
      type: "parameter",
      position,
      rawTokens: paramData.$strings,
      parameters,
      parameterType: paramData.type,
      defaultValue: paramData.default_value,
    };

    // Handle allowed_values as a special case
    if (paramData.allowed_values) {
      parameter.allowedValues = {
        type: "allowed_values",
        position: LookMLASTParser.extractPosition(positionData?.allowed_values),
        rawTokens: paramData.allowed_values.$strings,
        properties: LookMLASTParser.extractParameters(paramData.allowed_values),
      };
    }

    return parameter;
  }

  /**
   * Transform a dimension group object to DimensionGroupNode
   */
  private static transformDimensionGroup(
    name: string,
    groupData: any,
    positionData?: any
  ): DimensionGroupNode {
    const position = LookMLASTParser.extractPosition(positionData);
    const parameters = LookMLASTParser.extractParameters(groupData);

    return {
      name,
      type: "dimension_group",
      position,
      rawTokens: groupData.$strings,
      parameters,
      groupType: groupData.type,
      sql: groupData.sql,
      timeframes: groupData.timeframes,
    };
  }

  /**
   * Transform a join object to JoinNode
   */
  private static transformJoin(
    name: string,
    joinData: any,
    positionData?: any
  ): JoinNode {
    const position = LookMLASTParser.extractPosition(positionData);
    const parameters = LookMLASTParser.extractParameters(joinData);

    return {
      name,
      type: "join",
      position,
      rawTokens: joinData.$strings,
      parameters,
      sqlOn: joinData.sql_on,
      joinType: joinData.type,
      relationship: joinData.relationship,
      view: joinData.view,
    };
  }

  /**
   * Transform a derived table object to DerivedTableNode
   */
  private static transformDerivedTable(
    derivedData: any,
    positionData?: any
  ): DerivedTableNode {
    const position = LookMLASTParser.extractPosition(positionData);
    const parameters = LookMLASTParser.extractParameters(derivedData);

    return {
      name: "derived_table",
      type: "derived_table",
      position,
      rawTokens: derivedData.$strings,
      parameters,
      sql: derivedData.sql,
      exploreSource: derivedData.explore_source,
      datagroup: derivedData.datagroup_trigger,
    };
  }

  /**
   * Extract position information from position data
   */
  private static extractPosition(positionData?: any): Position {
    if (positionData?.$p) {
      const [startLine, startChar, endLine, endChar] = positionData.$p;
      return { startLine, startChar, endLine, endChar };
    }
    return { startLine: 0, startChar: 0, endLine: 0, endChar: 0 };
  }

  /**
   * Extract parameters from a data object, excluding special properties
   */
  private static extractParameters(data: any): Record<string, ParameterValue> {
    const parameters: Record<string, ParameterValue> = {};

    if (!data || typeof data !== "object") {
      return parameters;
    }

    // List of special properties to exclude from parameters
    const specialProperties = new Set([
      "$strings",
      "$type",
      "$name",
      "$p",
      "dimension",
      "measure",
      "filter",
      "parameter",
      "dimension_group",
      "join",
      "explore",
      "view",
      "model",
      "dashboard",
      "derived_table",
    ]);

    for (const [key, value] of Object.entries(data)) {
      if (!specialProperties.has(key)) {
        parameters[key] = LookMLASTParser.convertParameterValue(value);
      }
    }

    return parameters;
  }

  /**
   * Convert a raw parameter value to our ParameterValue type
   */
  private static convertParameterValue(value: any): ParameterValue {
    if (Array.isArray(value)) {
      return value.map((v) => LookMLASTParser.convertParameterValue(v));
    }

    if (value && typeof value === "object" && value.$type) {
      // This is a complex object
      return {
        type: value.$type,
        position: LookMLASTParser.extractPosition(value),
        rawTokens: value.$strings,
        properties: LookMLASTParser.extractParameters(value),
      };
    }

    // Simple value
    return value;
  }
}
