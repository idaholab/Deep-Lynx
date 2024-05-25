"use client";

// Hooks
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useState } from "react";

// Types
import { ContainerT } from "@/lib/types";
import { SelectChangeEvent } from "@mui/material";

// MUI
import {
    Card,
    Container,
    InputLabel,
    FormControl,
    MenuItem,
    Select,
} from "@mui/material";

// Axios
import axios from "axios";

// Store
import { useAppDispatch } from "@/lib/store/hooks";
import { containerActions } from "@/lib/store/features/container/containerSlice";

const fetcher = (url: string): Promise<ContainerT[]> =>
    axios.get(url).then((res) => res.data.value);

const ContainerSelect = () => {
    // Store
    const storeDispatch = useAppDispatch();

    // Hooks
    const [container, setContainer] = useState<string>("");
    const { data, error, isLoading } = useSWR("/api/containers", fetcher);
    const router = useRouter();
    useEffect(() => {
        // When the user selects a container, dispatch that container's metadata to the Redux store, and navigate to the dashboard
        if (data) {
            const selection: ContainerT = data.find(
                (item: ContainerT) => item.name === container
            )!;
            storeDispatch(containerActions.setContainer(selection));
            router.push(`/containers/${selection.id}`);
        }
    }, [container]);

    // Handlers
    const handleContainer = (event: SelectChangeEvent) => {
        setContainer(event.target.value);
    };

    return (
        <>
            <Container
                sx={{
                    height: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Card
                    elevation={21}
                    sx={{
                        height: "50%",
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <FormControl sx={{ width: "50%" }}>
                        <InputLabel id="Container Select">
                            Containers
                        </InputLabel>
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
                </Card>
            </Container>
        </>
    );
};

export default ContainerSelect;
