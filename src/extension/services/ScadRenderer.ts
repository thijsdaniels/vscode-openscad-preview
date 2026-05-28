import { workspace } from "vscode";
import { ModelFormat } from "../../shared/types/ModelFormat";
import { ScadClient } from "./ScadClient";

type OnStartCallback = () => void;

type OnCompleteCallback = (data: {
  buffer: Buffer;
  format: ModelFormat;
}) => void;

type OnErrorCallback = (error: Error) => void;

export class ScadRenderer {
  private onStart?: OnStartCallback;
  private onComplete: OnCompleteCallback;
  private onError?: OnErrorCallback;
  private onLog?: (chunk: string) => void;

  constructor({
    onStart,
    onComplete,
    onError,
    onLog,
  }: {
    onStart?: OnStartCallback;
    onComplete: OnCompleteCallback;
    onError?: OnErrorCallback;
    onLog?: (chunk: string) => void;
  }) {
    this.onStart = onStart;
    this.onComplete = onComplete;
    this.onError = onError;
    this.onLog = onLog;
  }

  public async render(
    path: string,
    parameters: Record<string, string | number | boolean>,
  ) {
    if (!path) return;

    if (this.onStart) {
      this.onStart();
    }

    const format = workspace
      .getConfiguration("openscad")
      .get<ModelFormat>("previewFormat", ModelFormat.ThreeMF);

    try {
      const modelBuffer = await ScadClient.render(
        path,
        parameters,
        format,
        this.onLog,
      );
      this.onComplete({ buffer: modelBuffer, format });
    } catch (err) {
      // Don't surface cancellations — they are intentional (a newer render
      // superseded this one) and should not be shown as errors to the user.
      if (err instanceof Error && err.message === "Render cancelled") {
        return;
      }

      if (this.onError) {
        this.onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }
}
