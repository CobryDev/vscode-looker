import * as fs from "fs";
import { glob } from "glob";

const lookmlParser = require("lookml-parser");

export interface LookmlField {
  name: String;
  type: String;
  viewName: String;
  fileName: String;
  lineNumber: Number;
}

export interface LookmlView {
  name: String;
  fields: LookmlField[];
  fileName: String;
  lineNumber: Number;
}

export interface LookmlExplore {
  name: String;
  fields: LookmlField[];
  fileName: String;
  lineNumber: Number;
}

export enum LookmlParentType {
  unknown,
  view,
  explore,
}

// TODO: Add view: label parsing resulting in field names returned like "customer.id"
// rather than "id".

export class LookML {
  public views: LookmlView[] = [];
  public explores: LookmlExplore[] = [];

  public constructor() {}

  /**
   * Parse LookML content from a string and return the parsed structure
   * This method is pure and doesn't modify the instance state
   */
  public static parseContent(
    content: string,
    fileName: string = "test.lkml"
  ): { views: LookmlView[]; explores: LookmlExplore[] } {
    const parser = new LookML();
    const result = parser.parseContentInternal(content, fileName);
    return result;
  }

  /**
   * Parse LookML content and update instance state
   */
  public parseAndMergeContent(
    content: string,
    fileName: string = "test.lkml"
  ): void {
    const result = this.parseContentInternal(content, fileName);
    this.views.push(...result.views);
    this.explores.push(...result.explores);
  }

  /**
   * Internal method to parse LookML content from a string using node-lookml-parser
   */
  private parseContentInternal(
    content: string,
    fileName: string
  ): { views: LookmlView[]; explores: LookmlExplore[] } {
    const filename = fileName.replace(/^.*[\\\/]/, "");

    try {
      // Parse using the new lookml-parser
      const parsed = lookmlParser.parse(content);

      // Transform the parsed output to our existing interfaces
      return this.mapParsedToInterfaces(parsed, filename);
    } catch (error) {
      console.error(`Error parsing LookML file ${filename}:`, error);
      // Return empty arrays on parse error
      return { views: [], explores: [] };
    }
  }

  /**
   * Maps the output from lookml-parser to our existing LookmlView and LookmlExplore interfaces
   */
  private mapParsedToInterfaces(
    parsed: any,
    fileName: string
  ): { views: LookmlView[]; explores: LookmlExplore[] } {
    const views: LookmlView[] = [];
    const explores: LookmlExplore[] = [];

    // Process views
    if (parsed.view) {
      for (const [viewName, viewData] of Object.entries(parsed.view)) {
        const fields = this.extractFieldsFromViewData(
          viewData as any,
          viewName,
          fileName
        );

        views.push({
          name: viewName,
          fields,
          fileName,
          lineNumber: 0, // TODO: Extract line numbers if available in parser output
        });
      }
    }

    // Process explores
    if (parsed.explore) {
      for (const [exploreName, exploreData] of Object.entries(parsed.explore)) {
        const fields = this.extractFieldsFromExploreData(
          exploreData as any,
          exploreName,
          fileName
        );

        explores.push({
          name: exploreName,
          fields,
          fileName,
          lineNumber: 0, // TODO: Extract line numbers if available in parser output
        });
      }
    }

    return { views, explores };
  }

  /**
   * Extracts fields from view data in the parsed structure
   */
  private extractFieldsFromViewData(
    viewData: any,
    viewName: string,
    fileName: string
  ): LookmlField[] {
    const fields: LookmlField[] = [];

    // Process dimensions
    if (viewData.dimension) {
      for (const [fieldName, fieldData] of Object.entries(viewData.dimension)) {
        fields.push({
          name: fieldName,
          type: "dimension",
          viewName,
          fileName,
          lineNumber: 0, // TODO: Extract line numbers if available
        });
      }
    }

    // Process measures
    if (viewData.measure) {
      for (const [fieldName, fieldData] of Object.entries(viewData.measure)) {
        fields.push({
          name: fieldName,
          type: "measure",
          viewName,
          fileName,
          lineNumber: 0, // TODO: Extract line numbers if available
        });
      }
    }

    // Process filters
    if (viewData.filter) {
      for (const [fieldName, fieldData] of Object.entries(viewData.filter)) {
        fields.push({
          name: fieldName,
          type: "filter",
          viewName,
          fileName,
          lineNumber: 0, // TODO: Extract line numbers if available
        });
      }
    }

    // Process parameters
    if (viewData.parameter) {
      for (const [fieldName, fieldData] of Object.entries(viewData.parameter)) {
        fields.push({
          name: fieldName,
          type: "parameter",
          viewName,
          fileName,
          lineNumber: 0, // TODO: Extract line numbers if available
        });
      }
    }

    // Process dimension groups
    if (viewData.dimension_group) {
      for (const [fieldName, fieldData] of Object.entries(
        viewData.dimension_group
      )) {
        fields.push({
          name: fieldName,
          type: "dimension_group",
          viewName,
          fileName,
          lineNumber: 0, // TODO: Extract line numbers if available
        });
      }
    }

    return fields;
  }

  /**
   * Extracts fields from explore data in the parsed structure
   */
  private extractFieldsFromExploreData(
    exploreData: any,
    exploreName: string,
    fileName: string
  ): LookmlField[] {
    const fields: LookmlField[] = [];

    // Process joins
    if (exploreData.join) {
      for (const [joinName, joinData] of Object.entries(exploreData.join)) {
        fields.push({
          name: joinName,
          type: "join",
          viewName: exploreName, // For explores, we use the explore name as the viewName
          fileName,
          lineNumber: 0, // TODO: Extract line numbers if available
        });
      }
    }

    return fields;
  }

  public parseWorkspaceLookmlFiles(workspacePath: String) {
    return new Promise<void>((resolve, reject) => {
      glob(`${workspacePath}/**/*.view.lkml`)
        .then((files) => {
          this.findAllFieldNamesInWorkspace(files).then(() => {
            // Debugging output.
            // fs.writeFile("./view.json", JSON.stringify(this.views, undefined, 4), {mode: 0o777, flag: 'w+' }, (err) => {
            // 	if (err) {
            // 		console.error(err);
            // 		return;
            // 	}
            // 	console.log("File has been created");
            // });
            resolve(); // TODO: Return number found to let user know if succesful.
          });
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  private async findAllFieldNamesInWorkspace(filePaths: string[]) {
    return new Promise<void>(async (resolve, reject) => {
      for (const filePath of filePaths) {
        await this.readFile(filePath);
      }
      resolve();
    });
  }

  private readFile(filePath: string) {
    return new Promise<void>(async (resolve, reject) => {
      fs.readFile(
        filePath,
        "utf-8",
        await (async (err, data) => {
          if (err) {
            throw err;
          }

          // Use the new parsing method for consistency
          var filename = filePath.replace(/^.*[\\\/]/, "");
          this.parseAndMergeContent(data, filename);
          resolve();
        })
      );
    });
  }
}
