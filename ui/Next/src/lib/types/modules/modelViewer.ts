export type Ancestor = {
  Name: string;
  Type: string;
  NodeId: string;
  ParentId: string;
};

export type RelatedNodeT = {
  MetatypeName: string;
  OwnerId: string;
  [key: string]: string;
};

export type PayloadT = {
  ConfigType: string;
  FileName: string;
  GraphType: string;
  GraphRootDlId: string;
  AssetMetatypeName: string;
  DefaultInteractions: Array<string>;
  BaseUrl: string;
  Token: string;
  ContainerId: string;
  FileId: string;
};

export type MetatypeMappingsT = Record<string, string> & {
  CADMetadata: string;
};

export type MeshObject = {
  Part: {
    [key: string]: any;
  };
  Assembly: {
    [key: string]: any;
  };
  AssemblyParents: Array<any>;
};

export type MeshBoolCallbackT = {
  selected: boolean;
};
