//
// Note: This example test is now using Jest instead of Mocha.
// Integration tests for VSCode should still use the VSCode test runner.
//

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
// import * as vscode from 'vscode';
// import * as myExtension from '../extension';

// Basic Jest test to verify the test framework works
describe("Extension Tests", () => {
  it("should run basic tests", () => {
    expect([1, 2, 3].indexOf(5)).toBe(-1);
    expect([1, 2, 3].indexOf(0)).toBe(-1);
  });
});
