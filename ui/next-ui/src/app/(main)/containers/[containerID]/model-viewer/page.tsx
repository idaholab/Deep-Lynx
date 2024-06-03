"use client";

// Hooks
import useSWR from "swr";
import { useRouter } from "next/navigation";
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
    InputLabel,
    FormControl,
    MenuItem,
    Select,
    Tab,
    Tabs,
} from "@mui/material";

// Axios
import axios from "axios";

// Translations
import translations from "@/lib/translations";

// Development only
const files = [
    {
        title: "Rubber duck",
        url: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Duck/glTF-Binary/Duck.glb",
        extension: ".glb",
    },
    {
        title: "Flowers",
        url: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/GlassVaseFlowers/glTF-Binary/GlassVaseFlowers.glb",
        extension: ".glb",
    },
    {
        title: "Chair",
        url: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/SheenChair/glTF-Binary/SheenChair.glb",
        extension: ".glb",
    },
    {
        title: "Lantern",
        url: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Lantern/glTF-Binary/Lantern.glb",
        extension: ".glb",
    },
];

const fetcher = (params: [url: string, containerId: string]) => {
    const [url, containerId] = params;

    const res = axios
        .get(url, { params: { containerId: containerId } })
        .then((res) => {
            return res.data.value;
        });

    return res;
};

// These are file types that Pythagoras presently knows how to transform into .glb
const supportedFileTypes =
    ".ipt, .rvt, .stp, .step, .stpz, .stepz, .stpx, .stpxz";

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
                                    accept: supportedFileTypes,
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
