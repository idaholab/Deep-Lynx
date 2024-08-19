"use client";

// Hooks
import { createContext, useContext, useEffect } from "react";

// Store
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { ontologyActions } from "@/lib/store/features/ontology/ontologySlice";

// Types
import { ContainerT, MetatypeT } from "../types";

let ContainerContext = createContext<ContainerT>({} as ContainerT);
let MetatypeContext = createContext<Array<MetatypeT>>([]);

export default function ContainerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Store
  const container: ContainerT = useAppSelector(
    (state) => state.container.container!
  );
  const metatypes: Array<MetatypeT> = useAppSelector(
    (state) => state.ontology.metatypes!
  );
  const storeDispatch = useAppDispatch();

  // Hooks
  useEffect(() => {
    async function fetchMetatypes() {
      let metatypes = await fetch(
        `/api/containers/${container.id}/metatypes`
      ).then((response) => {
        return response.json();
      });

      MetatypeContext = createContext(metatypes);
      storeDispatch(ontologyActions.setMetatypes(metatypes));
    }

    if (container && !metatypes) {
      fetchMetatypes();
    }
  }, [container, metatypes, storeDispatch]);

  return (
    <ContainerContext.Provider value={container}>
      {children}
    </ContainerContext.Provider>
  );
}

// Custom hook to use the context
export const useContainer = () => useContext(ContainerContext);
export const useMetatypes = () => useContext(MetatypeContext);
