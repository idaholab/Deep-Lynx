// Hooks
import { useState, useEffect } from "react";
import { useContainer } from "@/lib/context/ContainerProvider";

// Types
import { DataSourceT, NodeT } from "@/lib/types/deeplynx";

// Axios
import axios from "axios";
import { useAppSelector } from "@/lib/store/hooks";

export const useNodes = () => {
  const [nodes, setNodes] = useState<Array<NodeT> | undefined>(undefined);
  const dataSource = useAppSelector((state) => state.container.dataSource);
  const container = useContainer();

  useEffect(() => {
    async function fetchNodes() {
      let nodes = await axios
        .get(`/api/containers/${container.id}/graphs/nodes`, {
          params: {
            dataSourceId: dataSource!.id,
          },
        })
        .then((response) => {
          return response.data;
        });

      setNodes(nodes);
    }

    if (dataSource) {
      fetchNodes();
    }
  }, [container, dataSource]);

  return nodes;
};
