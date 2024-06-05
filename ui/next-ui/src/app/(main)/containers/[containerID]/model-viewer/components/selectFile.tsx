"use client";

// Hooks
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Types
import { NodeT, FileT } from "@/lib/types";
import { SelectChangeEvent } from "@mui/material";

// MUI
import {
    InputLabel,
    FormControl,
    ListItem,
    MenuItem,
    Select,
    Typography,
} from "@mui/material";

// Axios
import axios from "axios";

// Store
import { useAppSelector } from "@/lib/store/hooks";

// Translations
import translations from "@/lib/translations";
import { useContainer } from "@/lib/context/ContainerProvider";

type Props = {
    nodes: NodeT[];
    files: FileT[];
    setFiles: Function;
};

const fetcher = (
    params: [url: string, containerId: string, nodeId: string]
) => {
    const [url, containerId, nodeId] = params;

    const res = axios
        .get(url, { params: { containerId: containerId, nodeId: nodeId } })
        .then((res) => {
            return res.data.value;
        });

    return res;
};

const SelectFile = (props: Props) => {
    // Hooks
    const [node, setNode] = useState<NodeT>({ id: "" } as NodeT);
    const [file, setFile] = useState<FileT>({ id: "" } as FileT);
    const container = useContainer();

    useEffect(() => {
        async function fetchFiles() {
            let files = await fetch(
                `/api/containers/${container.id}/graphs/nodes/${node.id}/files`
            ).then((response) => {
                return response.json();
            });
            props.setFiles(files.value);
        }

        if (node.id) {
            fetchFiles();
        }
    }, [node]);

    // Handlers
    const handleNode = (event: SelectChangeEvent) => {
        setNode(props.nodes.find((node) => node.id === event.target.value)!);
    };
    const handleFile = (event: SelectChangeEvent) => {
        setFile(props.files.find((file) => file.id === event.target.value)!);
    };

    return (
        <>
            <Typography variant="body2">
                {translations.en.modelExplorer.instructions.select}
                <br />
                <br />
                {translations.en.modelExplorer.instructions.explainer}
                <br />
                <br />
                <Typography variant="caption">
                    {translations.en.modelExplorer.instructions.fileExtensions}
                </Typography>
            </Typography>
            <br />
            <FormControl fullWidth>
                <InputLabel id="Node Select">Nodes</InputLabel>
                <Select
                    labelId="Node Select"
                    id="/model-viewer/components/SelectFile/node"
                    label="Nodes"
                    value={node.id}
                    onChange={handleNode}
                >
                    {props.nodes
                        ? props.nodes.map((node: NodeT) => {
                              return (
                                  <MenuItem key={node.id} value={node.id}>
                                      {JSON.stringify(node.properties)}
                                  </MenuItem>
                              );
                          })
                        : null}
                </Select>
            </FormControl>
            <br />
            <br />
            {node.id ? (
                props.files.filter(
                    (file) => (file.metadata as any).processed === "false"
                ).length ? (
                    <FormControl fullWidth>
                        <InputLabel id="File Select">Files</InputLabel>
                        <Select
                            labelId="File Select"
                            id="/model-viewer/components/SelectFile/file"
                            label="Files"
                            value={file.id}
                            onChange={handleFile}
                        >
                            {props.files.find(
                                (file) =>
                                    (file.metadata as any).processed === "false"
                            ) ? (
                                props.files.map((file: FileT) => {
                                    const processed =
                                        (file.metadata as any).processed ===
                                        "true";
                                    if (!processed) {
                                        return (
                                            <MenuItem
                                                key={file.id}
                                                value={file.id}
                                            >
                                                {JSON.stringify(file)}
                                            </MenuItem>
                                        );
                                    }
                                })
                            ) : (
                                <Typography variant="body1">
                                    There are no unprocessed files. You may need
                                    to upload a file, and attach it to a node.
                                </Typography>
                            )}
                        </Select>
                    </FormControl>
                ) : (
                    <Typography variant="body1">
                        There are no unprocessed files attached to this node.
                        You can select another node, or proceed to the model
                        viewer with these files:
                        {props.files.map((file: FileT) => {
                            const processed =
                                (file.metadata as any).processed === "true";
                            if (processed) {
                                return (
                                    <ListItem key={file.id} value={file.id}>
                                        {JSON.stringify(file)}
                                    </ListItem>
                                );
                            }
                        })}
                    </Typography>
                )
            ) : null}
        </>
    );
};

export default SelectFile;
