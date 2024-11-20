// React
import React, { createContext, useState } from "react";

type TypeMappingContextT = {
  mapping: any;
  setMapping: React.Dispatch<React.SetStateAction<any>>;
};

export const TypeMappingContext = createContext<TypeMappingContextT>({
  mapping: {} as any,
  setMapping: () => {},
});

export default function PayloadProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Hooks
  const [mapping, setMapping] = useState<TypeMappingContextT>(
    {} as TypeMappingContextT
  );

  return (
    <TypeMappingContext.Provider value={{ mapping, setMapping }}>
      {children}
    </TypeMappingContext.Provider>
  );
}
