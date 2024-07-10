"use client";

// Hooks
import { useEffect, useState } from "react";
import { useContainer } from "@/lib/context/ContainerProvider";

// Components
import SelectFile from "./components/selectFile";

// Types
import { ContainerT, FileT, NodeT } from "@/lib/types";
import { SelectChangeEvent, Typography } from "@mui/material";

// MUI
import {
    Box,
    Button,
    Divider,
    Container,
    Input,
    Tab,
    Tabs,
} from "@mui/material";

// Translations
import translations from "@/lib/translations";

const ModelViewer = () => {
    // Store
    const container: ContainerT = useContainer();

    // Hooks
    const [nodes, setNodes] = useState<NodeT[]>([]);
    const [files, setFiles] = useState<FileT[]>([]);
    const [tab, setTab] = useState<string>("upload");

    // Handlers
    const handleTab = (event: React.SyntheticEvent, tab: string) => {
        setTab(tab);
    };
    function handleFile(event: SelectChangeEvent) {}

    useEffect(() => {
        async function fetchNodes() {
            let nodes = await fetch(
                `/api/containers/${container.id}/graphs/nodes`
            ).then((response) => {
                return response.json();
            });

            setNodes(nodes);
        }

        fetchNodes();
    }, []);

    return (
        <>
            <Container>
                <Tabs value={tab} onChange={handleTab}>
                    <Tab label="Upload File" value={"upload"}></Tab>
                    <Tab label="Select File" value={"select"}></Tab>
                </Tabs>
                <Divider />
                <br />
                <Box sx={{ width: "50%" }}>
                    {tab === "upload" ? (
                        <>
                            <Typography variant="body2">
                                {
                                    translations.en.modelExplorer.instructions
                                        .upload
                                }
                                <br />
                                <br />
                                {
                                    translations.en.modelExplorer.instructions
                                        .explainer
                                }
                                <br />
                                <br />
                                <Typography variant="caption">
                                    {
                                        translations.en.modelExplorer
                                            .instructions.fileExtensions
                                    }
                                </Typography>
                            </Typography>
                            <br />
                            <Input
                                type="file"
                                inputProps={{
                                    accept: translations.en.modelExplorer
                                        .instructions.fileExtensions,
                                }}
                            ></Input>
                        </>
                    ) : null}
                    {tab === "select" ? (
                        nodes ? (
                            <SelectFile
                                nodes={nodes}
                                files={files}
                                setFiles={setFiles}
                            />
                        ) : null
                    ) : null}
                </Box>
            </Container>
        </>
    );
};

export default ModelViewer;
