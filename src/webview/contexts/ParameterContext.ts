import { createContext } from "@lit/context";
import { ParameterLabelMode } from "../../shared/types/ParameterLabelMode";
import { ScadParameter } from "../../shared/types/ScadParameter";

export type ParameterContext = {
  parameters: ScadParameter[];
  labelMode: ParameterLabelMode;
  setLabelMode: (mode: ParameterLabelMode) => void;
  parameterSets: Record<string, Record<string, string>>;
  activeSetName: string | undefined;
  overrides: Record<ScadParameter["name"], ScadParameter["value"]>;
  get: (name: ScadParameter["name"]) => ScadParameter | undefined;
  override: (
    name: ScadParameter["name"],
    value: ScadParameter["value"],
  ) => void;
  revert: (name: ScadParameter["name"]) => void;
  saveSet: (name: string) => void;
  saveAsNewSet: () => void;
  applySet: (name: string | undefined) => void;
  deleteSet: (name: string) => void;
};

export const parameterContext = createContext<ParameterContext>("parameters");
