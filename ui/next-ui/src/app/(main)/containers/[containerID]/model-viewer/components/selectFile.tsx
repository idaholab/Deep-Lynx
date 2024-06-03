"use client";

// Hooks
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Types
import { NodeT, FileT } from "@/lib/types";
import { SelectChangeEvent, Typography } from "@mui/material";

// MUI
import {
    Box,
    Button,
    Divider,
    Container,
    Input,
    InputLabel,
    FormControl,
    MenuItem,
    Select,
    Tab,
    Tabs,
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

// These are file types that Pythagoras presently knows how to transform into .glb
const supportedFileTypes =
    ".ipt, .rvt, .stp, .step, .stpz, .stepz, .stpx, .stpxz";

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
            console.log(props.files);
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
                <FormControl fullWidth>
                    <InputLabel id="Node Select">Files</InputLabel>
                    <Select
                        labelId="Node Select"
                        id="/model-viewer/components/SelectFile/file"
                        label="Nodes"
                        value={file.id}
                        onChange={handleFile}
                    >
                        {props.files
                            ? props.files.map((file: FileT) => {
                                  return (
                                      <MenuItem key={file.id} value={file.id}>
                                          {JSON.stringify(file)}
                                      </MenuItem>
                                  );
                              })
                            : null}
                    </Select>
                </FormControl>
            ) : null}
        </>
    );
};

export default SelectFile;
