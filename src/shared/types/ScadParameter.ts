import { StringEditor } from "./StringEditor";

interface ParameterMetadata {
  name: string;
  description?: string;
  group?: string;
}

export interface ParameterOption<T> {
  label?: string;
  value: T;
}

export interface NumericParameter extends ParameterMetadata {
  type: "number";
  value: number;
  min?: number;
  max?: number;
  step?: number;
  options?: ParameterOption<number>[];
}

export interface BooleanParameter extends ParameterMetadata {
  type: "boolean";
  value: boolean;
}

export interface StringParameter extends ParameterMetadata {
  type: "string";
  value: string;
  options?: ParameterOption<string>[];
  editor?: StringEditor;
  /** File editor only: accepted extensions, without dot. Empty = any file. */
  extensions?: string[];
}

export type ScadParameter =
  | NumericParameter
  | BooleanParameter
  | StringParameter;
