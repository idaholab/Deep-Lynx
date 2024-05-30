"use client";

// Hooks
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

// Translations
import translations from "@/lib/translations";

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
