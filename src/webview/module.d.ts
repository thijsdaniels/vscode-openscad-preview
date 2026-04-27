declare module "*.stl" {
  const value: Uint8Array;
  export default value;
}

declare module "*.glsl" {
  const value: string;
  export default value;
}
