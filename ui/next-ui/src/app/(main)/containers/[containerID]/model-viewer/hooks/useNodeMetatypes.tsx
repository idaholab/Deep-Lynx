// Hooks
import { useState, useEffect } from "react";
import { useContainer, useMetatypes } from "@/lib/context/ContainerProvider";
import { useNodes } from "./useNodes";

// Types
import { MetatypeT, NodeT } from "@/lib/types";

// Axios
import axios from "axios";

export const useNodeMetatypes = () => {
  const [nodeMetatypes, setNodeMetatypes] = useState<
    Array<MetatypeT> | undefined
  >();
  const nodes = useNodes();
  const container = useContainer();
  const metatypes = useMetatypes();

  useEffect(() => {
    async function fetchNodes() {
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

    if (nodes && metatypes) fetchNodes();
  }, [container, nodes, metatypes]);

  return nodeMetatypes;
};
