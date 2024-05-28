"use client";

// Hooks
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useContainer } from "../../layout";

// Types
import { NodeT } from "@/lib/types";
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

type Props = {
    nodes: NodeT[];
};

// These are file types that Pythagoras presently knows how to transform into .glb
const supportedFileTypes =
    ".ipt, .rvt, .stp, .step, .stpz, .stepz, .stpx, .stpxz";

const SelectFile = (props: Props) => {
    // Hooks
    const [node, setNode] = useState<string>("");
    useEffect(() => {}, [node]);

    // Handlers
    const handleNode = (event: SelectChangeEvent) => {
        setNode(event.target.value);
    };

    return (
        <>
            <Typography variant="body2">
                Select a file attached to a node in DeepLynx, and transform it
                into an interactive model.
                <br />
                <br />
                Behind the scenes, a DeepLynx module extracts metadata from the
                geometry in your model, and transforms the geometry into a .glb.
                <br />
                <br />
                <Typography variant="caption">
                    Supported file extensions are: <b>{supportedFileTypes}</b>
                </Typography>
            </Typography>
            <br />
            <FormControl fullWidth>
                <InputLabel id="Node Select">Nodes</InputLabel>
                <Select
                    labelId="Node Select"
                    id="/model-viewer/components/SelectFile"
                    label="Nodes"
                    value={node}
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
        </>
    );
};

export default SelectFile;
