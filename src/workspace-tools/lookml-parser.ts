import { LookmlField, LookmlView, LookmlExplore } from "./parse-lookml";

const lookmlParser = require("lookml-parser");

/**
 * Pure utility class for parsing LookML content
 * Contains no state and provides only static methods for parsing
 */
export class LookMLParser {
  /**
   * Parse LookML content from a string and return the parsed structure
   * This method is pure and doesn't modify any state
   */
  public static parseContent(
    content: string,
    fileName: string = "test.lkml"
  ): { views: LookmlView[]; explores: LookmlExplore[] } {
    const filename = fileName.replace(/^.*[\\/]/, "");

    try {
      // Parse using the new lookml-parser
      const parsed = lookmlParser.parse(content);

      // Extract positional information
      const positions = lookmlParser.getPositions(parsed);

      // Transform the parsed output to our existing interfaces with position data
      return LookMLParser.mapParsedToInterfaces(parsed, filename, positions);
    } catch (error) {
      console.error(`Error parsing LookML file ${filename}:`, error);
      // Return empty arrays on parse error
      return { views: [], explores: [] };
    }
  }

  /**
   * Maps the output from lookml-parser to our existing LookmlView and LookmlExplore interfaces
   */
  private static mapParsedToInterfaces(
    parsed: any,
    fileName: string,
    positions?: any
  ): { views: LookmlView[]; explores: LookmlExplore[] } {
    const views: LookmlView[] = [];
    const explores: LookmlExplore[] = [];

    // Helper function to extract position data
    const getPositionData = (target: any) => {
      if (target && target.$p) {
        const pos = target.$p;
        return {
          startLine: pos[0] || 0,
          startChar: pos[1] || 0,
          endLine: pos[2] || 0,
          endChar: pos[3] || 0,
        };
      }
      return {
        startLine: 0,
        startChar: 0,
        endLine: 0,
        endChar: 0,
      };
    };

    // Process views
    if (parsed.view) {
      for (const [viewName, viewData] of Object.entries(parsed.view)) {
        const viewPositionData = positions?.view?.[viewName];
        const viewPosition = getPositionData(viewPositionData);

        const fields = LookMLParser.extractFieldsFromViewData(
          viewData as any,
          viewName,
          fileName,
          positions
        );

        views.push({
          name: viewName,
          fields,
          fileName,
          lineNumber: viewPosition.startLine,
          startLine: viewPosition.startLine,
          startChar: viewPosition.startChar,
          endLine: viewPosition.endLine,
          endChar: viewPosition.endChar,
        });
      }
    }

    // Process explores
    if (parsed.explore) {
      for (const [exploreName, exploreData] of Object.entries(parsed.explore)) {
        const explorePositionData = positions?.explore?.[exploreName];
        const explorePosition = getPositionData(explorePositionData);

        const fields = LookMLParser.extractFieldsFromExploreData(
          exploreData as any,
          exploreName,
          fileName,
          positions
        );

        explores.push({
          name: exploreName,
          fields,
          fileName,
          lineNumber: explorePosition.startLine,
          startLine: explorePosition.startLine,
          startChar: explorePosition.startChar,
          endLine: explorePosition.endLine,
          endChar: explorePosition.endChar,
        });
      }
    }

    return { views, explores };
  }

  /**
   * Extracts fields from view data in the parsed structure
   */
  private static extractFieldsFromViewData(
    viewData: any,
    viewName: string,
    fileName: string,
    positions?: any
  ): LookmlField[] {
    const fields: LookmlField[] = [];

    // Helper function to extract field position data
    const getFieldPositionData = (fieldType: string, fieldName: string) => {
      if (positions?.view?.[viewName]?.[fieldType]?.[fieldName]) {
        const fieldPositionData =
          positions.view[viewName][fieldType][fieldName];
        if (fieldPositionData && fieldPositionData.$p) {
          const pos = fieldPositionData.$p;
          return {
            startLine: pos[0] || 0,
            startChar: pos[1] || 0,
            endLine: pos[2] || 0,
            endChar: pos[3] || 0,
          };
        }
      }
      return {
        startLine: 0,
        startChar: 0,
        endLine: 0,
        endChar: 0,
      };
    };

    // Process dimensions
    if (viewData.dimension) {
      for (const [fieldName] of Object.entries(viewData.dimension)) {
        const position = getFieldPositionData("dimension", fieldName);
        fields.push({
          name: fieldName,
          type: "dimension",
          viewName,
          fileName,
          lineNumber: position.startLine,
          startLine: position.startLine,
          startChar: position.startChar,
          endLine: position.endLine,
          endChar: position.endChar,
        });
      }
    }

    // Process measures
    if (viewData.measure) {
      for (const [fieldName] of Object.entries(viewData.measure)) {
        const position = getFieldPositionData("measure", fieldName);
        fields.push({
          name: fieldName,
          type: "measure",
          viewName,
          fileName,
          lineNumber: position.startLine,
          startLine: position.startLine,
          startChar: position.startChar,
          endLine: position.endLine,
          endChar: position.endChar,
        });
      }
    }

    // Process filters
    if (viewData.filter) {
      for (const [fieldName] of Object.entries(viewData.filter)) {
        const position = getFieldPositionData("filter", fieldName);
        fields.push({
          name: fieldName,
          type: "filter",
          viewName,
          fileName,
          lineNumber: position.startLine,
          startLine: position.startLine,
          startChar: position.startChar,
          endLine: position.endLine,
          endChar: position.endChar,
        });
      }
    }

    // Process parameters
    if (viewData.parameter) {
      for (const [fieldName] of Object.entries(viewData.parameter)) {
        const position = getFieldPositionData("parameter", fieldName);
        fields.push({
          name: fieldName,
          type: "parameter",
          viewName,
          fileName,
          lineNumber: position.startLine,
          startLine: position.startLine,
          startChar: position.startChar,
          endLine: position.endLine,
          endChar: position.endChar,
        });
      }
    }

    // Process dimension groups
    if (viewData.dimension_group) {
      for (const [fieldName] of Object.entries(viewData.dimension_group)) {
        const position = getFieldPositionData("dimension_group", fieldName);
        fields.push({
          name: fieldName,
          type: "dimension_group",
          viewName,
          fileName,
          lineNumber: position.startLine,
          startLine: position.startLine,
          startChar: position.startChar,
          endLine: position.endLine,
          endChar: position.endChar,
        });
      }
    }

    return fields;
  }

  /**
   * Extracts fields from explore data in the parsed structure
   */
  private static extractFieldsFromExploreData(
    exploreData: any,
    exploreName: string,
    fileName: string,
    positions?: any
  ): LookmlField[] {
    const fields: LookmlField[] = [];

    // Helper function to extract join position data
    const getJoinPositionData = (joinName: string) => {
      if (positions?.explore?.[exploreName]?.join?.[joinName]) {
        const joinPositionData = positions.explore[exploreName].join[joinName];
        if (joinPositionData && joinPositionData.$p) {
          const pos = joinPositionData.$p;
          return {
            startLine: pos[0] || 0,
            startChar: pos[1] || 0,
            endLine: pos[2] || 0,
            endChar: pos[3] || 0,
          };
        }
      }
      return {
        startLine: 0,
        startChar: 0,
        endLine: 0,
        endChar: 0,
      };
    };

    // Process joins
    if (exploreData.join) {
      for (const [joinName] of Object.entries(exploreData.join)) {
        const position = getJoinPositionData(joinName);
        fields.push({
          name: joinName,
          type: "join",
          viewName: exploreName, // For explores, we use the explore name as the viewName
          fileName,
          lineNumber: position.startLine,
          startLine: position.startLine,
          startChar: position.startChar,
          endLine: position.endLine,
          endChar: position.endChar,
        });
      }
    }

    return fields;
  }
}
