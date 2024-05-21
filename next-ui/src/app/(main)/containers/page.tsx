"use client";

// Hooks
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Types
import { ContainerT } from "@/lib/types";
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
    // Hooks
    const [container, setContainer] = useState<string>("");
    const { data, error, isLoading } = useSWR("/api/containers", fetcher);
    const router = useRouter();
    useEffect(() => {
        if (data) {
            const selection = data.find(
                (item: ContainerT) => item.name === container
            );
            router.push(`/containers/${selection.id}`);
        }
    }, [container]);

    // Handlers
    const handleContainer = (event: SelectChangeEvent) => {
        setContainer(event.target.value);
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
                        value={container}
                        onChange={handleContainer}
                    >
                        {data
                            ? data.map((container: ContainerT) => {
                                  return (
                                      <MenuItem
                                          key={container.id}
                                          value={container.name}
                                      >
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
