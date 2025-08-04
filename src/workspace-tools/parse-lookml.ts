import * as fs from "fs";
import { glob } from "glob";
import { LookMLParser } from "./lookml-parser";

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
  ): { views: LookmlView[]; explores: LookmlExplore[] } {
    return LookMLParser.parseContent(content, fileName);
  }

  /**
   * Parse LookML content and update instance state
   */
  public parseAndMergeContent(
    content: string,
    fileName: string = "test.lkml"
  ): void {
    const result = LookMLParser.parseContent(content, fileName);
    this.views.push(...result.views);
    this.explores.push(...result.explores);
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
    return new Promise<void>((resolve) => {
      (async () => {
        for (const filePath of filePaths) {
          await this.readFile(filePath);
        }
        resolve();
      })();
    });
  }

  private readFile(filePath: string) {
    return new Promise<void>((resolve) => {
      fs.readFile(filePath, "utf-8", async (err, data) => {
        if (err) {
          throw err;
        }

        // Use the new parsing method for consistency
        var filename = filePath.replace(/^.*[\\/]/, "");
        this.parseAndMergeContent(data, filename);
        resolve();
      });
    });
  }
}
