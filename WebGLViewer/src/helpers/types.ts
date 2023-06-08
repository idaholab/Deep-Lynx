export type WebGLFile = {
  file_id: string;
  container_id: string;
  file_name: string;
  tag_name: string;
};

export type WebGLFileset = {
  data: WebGLFile;
  loader: WebGLFile;
  framework: WebGLFile;
  wasm: WebGLFile;
};
