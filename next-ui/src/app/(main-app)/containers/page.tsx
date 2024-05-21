"use client";

// Hooks
import useSWR from "swr";
import { useEffect, useState } from "react";

// Types
import { ContainerT } from "@/app/_lib/types";
import { SelectChangeEvent } from "@mui/material";

// MUI
import {
    Container,
    InputLabel,
    FormControl,
    MenuItem,
    Select,
} from "@mui/material";

// Axios
import axios from "axios";

const fetcher = (url: string) => axios.get(url).then((res) => res.data.value);

const ContainerSelect = () => {
    const [container, setContainer] = useState<string>("");
    const { data, error, isLoading } = useSWR("/api/containers", fetcher);

    // Handlers
    const handleContainer = (event: SelectChangeEvent) => {
        setContainer(event.target.value as string);
    };

    return (
        <>
            <Container>
                <FormControl fullWidth>
                    <InputLabel id="Container Select">Containers</InputLabel>
                    <Select
                        labelId="Container Select"
                        id="/containers/ContainerSelect"
                        label="Containers"
                        value={container ? container : ""}
                        onChange={handleContainer}
                    >
                        {data
                            ? data.map((container: ContainerT) => {
                                  return (
                                      <MenuItem key={container.id}>
                                          {container.name}
                                      </MenuItem>
                                  );
                              })
                            : null}
                    </Select>
                </FormControl>
            </Container>
        </>
    );
};

export default ContainerSelect;
