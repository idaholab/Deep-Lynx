"use client";

// Hooks
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useContainer } from "../layout";

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
    const [nodes, setNodes] = useState<NodeT[]>();
    const [file, setFile] = useState();
    const [tab, setTab] = useState<string>("upload");
    const { data, error, isLoading } = useSWR(
        ["/api/containers/graphs/nodes", container.id],
        fetcher
    );

    // Handlers
    const handleTab = (event: React.SyntheticEvent, tab: string) => {
        setTab(tab);
    };
    function handleFile(event: SelectChangeEvent) {}

    useEffect(() => {
        if (data) {
            setNodes(data);
        }
    }, [data]);

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
                                Upload a file to DeepLynx, and transform it into
                                an interactive model.
                                <br />
                                <br />
                                Behind the scenes, a DeepLynx module extracts
                                metadata from the geometry in your model, and
                                transforms the geometry into a .glb.
                                <br />
                                <br />
                                <Typography variant="caption">
                                    Supported file extensions are:{" "}
                                    <b>{supportedFileTypes}</b>
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
                            <SelectFile nodes={nodes} />
                        ) : null
                    ) : null}
                </Box>
            </Container>
        </>
    );
};

export default ModelViewer;
