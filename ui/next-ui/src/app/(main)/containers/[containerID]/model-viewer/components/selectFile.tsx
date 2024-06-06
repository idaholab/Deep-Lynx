"use client";

// Hooks
import { useEffect, useState } from "react";

// Types
import { NodeT, FileT } from "@/lib/types";
import { SelectChangeEvent } from "@mui/material";

// MUI
import {
    Box,
    Button,
    InputLabel,
    FormControl,
    Grid,
    MenuItem,
    Select,
    Typography,
} from "@mui/material";

// Icons
import CloudSyncIcon from "@mui/icons-material/CloudSync";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import StartIcon from "@mui/icons-material/Start";

// Translations
import translations from "@/lib/translations";
import { useContainer } from "@/lib/context/ContainerProvider";

type Props = {
    nodes: NodeT[];
    files: FileT[];
    setFiles: Function;
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
                // If there are any unprocessed files, select one to start processing
                props.files.filter((file) => !/\.glb$/.test(file.file_name))
                    .length ? (
                    <FormControl fullWidth>
                        <InputLabel id="File Select">Files</InputLabel>
                        <Select
                            labelId="File Select"
                            id="/model-viewer/components/SelectFile/file"
                            label="Files"
                            value={file.id}
                            onChange={handleFile}
                        >
                            {props.files.map((file: FileT) => {
                                const processed = !/\.glb$/.test(
                                    file.file_name
                                );
                                if (!processed) {
                                    return (
                                        <MenuItem key={file.id} value={file.id}>
                                            {JSON.stringify(file)}
                                        </MenuItem>
                                    );
                                }
                            })}
                        </Select>
                    </FormControl>
                ) : (
                    <>
                        <Grid container>
                            <Grid item xs={1}>
                                <DoneAllIcon />
                            </Grid>
                            <Grid item xs={11}>
                                <Typography variant="body2">
                                    There are no unprocessed files attached to
                                    this node. You can select another node, or
                                    proceed to the model viewer with these
                                    files:
                                    <br />
                                    <br />
                                    {props.files.map((file: FileT) => {
                                        const processed =
                                            (file.metadata as any).processed ===
                                            "true";
                                        if (processed) {
                                            return (
                                                <Typography
                                                    key={file.id}
                                                    variant="body1"
                                                >
                                                    {file.file_name}
                                                </Typography>
                                            );
                                        }
                                    })}
                                </Typography>
                            </Grid>
                        </Grid>
                        <br />
                        <Box
                            sx={{
                                width: "100%",
                                display: "flex",
                                justifyContent: "end",
                            }}
                        >
                            <Button startIcon={<StartIcon />}>Start</Button>
                        </Box>
                    </>
                )
            ) : null}
            <br />
            <br />
            <br />
            {file.id ? (
                <>
                    <Typography variant="body1">
                        File Selected: {file.file_name}
                    </Typography>
                    <br />
                    <Button startIcon={<CloudSyncIcon />}>
                        Start Processing
                    </Button>
                </>
            ) : null}
        </>
    );
};

export default SelectFile;
