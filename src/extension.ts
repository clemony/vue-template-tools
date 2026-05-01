import * as vscode from "vscode";
import { convertClassSelection } from "./class-cn";
import { convertSelection } from "./converter";

export function activate(context: vscode.ExtensionContext) {
  console.log("[vue-template-tools] activate");

  if (context.extensionMode === vscode.ExtensionMode.Development) {
    void vscode.window.showInformationMessage("Vue Template Tools loaded in Extension Development Host.");
  }

  context.subscriptions.push(
    vscode.commands.registerCommand("vueTemplateTools.convertSelection", () => {
      convertActiveSelection(convertSelection, "Select some HTML/Vue attributes first.", "No convertible Vue attributes or object properties were found in the current selection.");
    }),
    vscode.commands.registerCommand("vueTemplateTools.convertClassToCn", () => {
      convertActiveSelection(convertClassSelection, "Select a class or :class attribute first.", "No convertible class attribute was found in the current selection.");
    })
  );
}

export function deactivate() {}

function convertActiveSelection(convert: (input: string) => string | null, emptySelectionMessage: string, failedConversionMessage: string) {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    return;
  }

  const { selection } = editor;
  const selected = editor.document.getText(selection);

  if (!selected.trim()) {
    vscode.window.showInformationMessage(emptySelectionMessage);
    return;
  }

  const convertedSelection = convert(selected);

  if (!convertedSelection) {
    vscode.window.showInformationMessage(failedConversionMessage);
    return;
  }

  editor.edit((edit) => {
    edit.replace(selection, convertedSelection);
  });
}
