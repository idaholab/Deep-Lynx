// Hooks
import { useState, useEffect } from "react";
import { useContainer } from "@/lib/context/ContainerProvider";

// Types
import { DataSourceT, NodeT } from "@/lib/types/deeplynx";

// Axios
import axios from "axios";

export const useNodes = (datasource: DataSourceT) => {
  const [nodes, setNodes] = useState<Array<NodeT> | undefined>(undefined);
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

    if (datasource) {
      fetchNodes();
    }
  }, [container, datasource]);

  return nodes;
};
