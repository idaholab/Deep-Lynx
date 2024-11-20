// React
import React, { createContext, useState } from "react";

// Hooks
import { useContainer } from "@/lib/context/ContainerProvider";

// Store
import { useAppSelector } from "@/lib/store/hooks";

// Types
import { PayloadT } from "@/lib/types/modules/modelViewer";
import { ContainerT, FileT } from "@/lib/types/deeplynx";

type PayloadContextT = {
  payload: PayloadT;
  setPayload: React.Dispatch<React.SetStateAction<PayloadT>>;
};

export const PayloadContext = createContext<PayloadContextT>({
  payload: {} as PayloadT,
  setPayload: () => {},
});

export default function PayloadProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Context
  const container: ContainerT = useContainer();

  // Store
  const file: FileT = useAppSelector((state) => state.modelViewer.file!);

  // Hooks
  const [payload, setPayload] = useState<PayloadT>({
    ConfigType: "Remote",
    FileName: file.file_name,
    GraphType: "cad",
    GraphRootDlId: "2", // Must come from Pixyz; now using Pixyz' NodeId instead of DeepLynxID; the root Pixyz' NodeId should always be "2" (at least according to all the CAD models I've tested); however, we can make this more robust, and the best way might be for React to receive info back from Airflow https://github.inl.gov/Digital-Engineering/Pythagoras/issues/17
    AssetMetatypeName: "MeshGameObject",
    DefaultInteractions: ["CadNodeDataToReact", "SelectAndFadeOthers"],
    BaseUrl: "https://deeplynx.dev.inl.gov",
    Token: process.env.NEXT_PUBLIC_TOKEN!,
    ContainerId: container.id,
    FileId: file.id,
  } as PayloadT);

  return (
    <PayloadContext.Provider value={{ payload, setPayload }}>
      {children}
    </PayloadContext.Provider>
  );
}
