// Hooks
import { useState, useEffect } from "react";
import { useContainer } from "@/lib/context/ContainerProvider";

// Types
import { NodeT, FileT } from "@/lib/types";

// Axios
import axios from "axios";

export const useFiles = (node: NodeT | undefined = undefined) => {
  const [files, setFiles] = useState<Array<FileT> | null>(null);
  const container = useContainer();

  useEffect(() => {
    async function fetchFiles() {
      let files = await axios
        .get(`/api/containers/${container!.id}/graphs/nodes/${node!.id}/files`)
        .then((response) => {
          return response.data;
        });
      setFiles(files);
    }

    if (!node) return;
    fetchFiles();
  }, [container, node]);

  return files;
};
