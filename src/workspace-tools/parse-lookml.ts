import * as fs from "fs";
import { glob } from "glob";
import { LookMLParser, ParseResult } from "./lookml-parser";

export interface LookmlField {
  name: String;
  type: String;
  viewName: String;
  fileName: String;
  lineNumber: Number;
  startLine: Number;
  startChar: Number;
  endLine: Number;
  endChar: Number;
}

export interface LookmlView {
  name: String;
  fields: LookmlField[];
  fileName: String;
  lineNumber: Number;
  startLine: Number;
  startChar: Number;
  endLine: Number;
  endChar: Number;
}

export interface LookmlExplore {
  name: String;
  fields: LookmlField[];
  fileName: String;
  lineNumber: Number;
  startLine: Number;
  startChar: Number;
  endLine: Number;
  endChar: Number;
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
  ): ParseResult<{ views: LookmlView[]; explores: LookmlExplore[] }> {
    return LookMLParser.parseContent(content, fileName);
  }

  /**
   * Parse LookML content and update instance state
   * Throws an error if parsing fails
   */
  public parseAndMergeContent(
    content: string,
    fileName: string = "test.lkml"
  ): void {
    const result = LookMLParser.parseContent(content, fileName);
    if (!result.success) {
      throw new Error(
        `Failed to parse LookML file ${fileName}: ${
          result.error?.message || "Unknown error"
        }`
      );
    }
    if (result.data) {
      this.views.push(...result.data.views);
      this.explores.push(...result.data.explores);
    }
  }

  public parseWorkspaceLookmlFiles(workspacePath: String) {
    return new Promise<{
      filesProcessed: number;
      viewsFound: number;
      exploresFound: number;
    }>((resolve, reject) => {
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
            resolve({
              filesProcessed: files.length,
              viewsFound: this.views.length,
              exploresFound: this.explores.length,
            });
          });
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  private async findAllFieldNamesInWorkspace(filePaths: string[]) {
    return new Promise<void>((resolve, reject) => {
      (async () => {
        try {
          for (const filePath of filePaths) {
            await this.readFile(filePath);
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      })();
    });
  }

  private readFile(filePath: string) {
    return new Promise<void>((resolve, reject) => {
      fs.readFile(filePath, "utf-8", async (err, data) => {
        if (err) {
          reject(new Error(`Failed to read file ${filePath}: ${err.message}`));
          return;
        }

        try {
          // Use the new parsing method for consistency
          var filename = filePath.replace(/^.*[\\/]/, "");
          this.parseAndMergeContent(data, filename);
          resolve();
        } catch (parseError) {
          reject(
            new Error(
              `Failed to parse file ${filePath}: ${
                parseError instanceof Error
                  ? parseError.message
                  : String(parseError)
              }`
            )
          );
        }
      });
    });
  }
}
