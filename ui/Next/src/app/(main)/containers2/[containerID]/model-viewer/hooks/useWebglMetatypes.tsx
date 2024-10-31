// Hooks
import { useState, useEffect } from "react";
import { useContainer, useMetatypes } from "@/lib/context/ContainerProvider";

// Types
import { MetatypeT, NodeT } from "@/lib/types/deeplynx";

// Axios
import axios from "axios";

export const useWebglMetatypes = () => {
  const [webglMetatypes, setNodeMetatypes] = useState<
    Array<MetatypeT> | undefined
  >();
  const container = useContainer();
  const metatypes = useMetatypes();

  useEffect(() => {
    async function fetchMetatypes() {
      let nodes = await axios
        .get(`/api/containers/${container.id}/graphs/nodes`)
        .then((response) => {
          return response.data;
        });

      let nodeMetatypes = metatypes.filter((metatype: MetatypeT) => {
        return nodes.some((node: NodeT) => {
          return node.metatype_name === metatype.name;
        });
      });

      setNodeMetatypes(nodeMetatypes);
    }

    if (metatypes && !webglMetatypes) fetchMetatypes();
  }, [container, metatypes, webglMetatypes]);

  return webglMetatypes;
};
