// Hooks
import { useState, useEffect } from "react";
import { useContainer } from "@/lib/context/ContainerProvider";

// Types
import { DataSourceT, NodeT } from "@/lib/types";

// Axios
import axios from "axios";

export const useNodes = (datasource: DataSourceT | null = null) => {
  const [nodes, setNodes] = useState<Array<NodeT> | null>(null);
  const container = useContainer();

  useEffect(() => {
    async function fetchNodes() {
      let nodes = await axios
        .get(`/api/containers/${container.id}/graphs/nodes`, {
          params: {
            dataSourceId: datasource ? datasource.id : null,
          },
        })
        .then((response) => {
          return response.data;
        });

      setNodes(nodes);
    }

    if (!datasource) return;
    fetchNodes();
  }, [container, datasource]);

  return nodes;
};
