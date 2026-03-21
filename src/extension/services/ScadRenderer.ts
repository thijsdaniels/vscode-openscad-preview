import { workspace } from "vscode";
import { ModelFormat } from "../../shared/types/ModelFormat";
import { ScadClient } from "./ScadClient";

type OnStartCallback = () => void;

type OnCompleteCallback = (data: {
  buffer: Buffer;
  format: ModelFormat;
}) => void;

export class ScadRenderer {
  private onStart?: OnStartCallback;
  private onComplete: OnCompleteCallback;
  private onLog?: (chunk: string) => void;

  constructor({
    onStart,
    onComplete,
    onLog,
  }: {
    onStart?: OnStartCallback;
    onComplete: OnCompleteCallback;
    onLog?: (chunk: string) => void;
  }) {
    this.onStart = onStart;
    this.onComplete = onComplete;
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

    const modelBuffer = await ScadClient.render(
      path,
      parameters,
      format,
      this.onLog,
    );

    this.onComplete({ buffer: modelBuffer, format });
  }
}
