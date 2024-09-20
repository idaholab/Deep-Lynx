"use client";

// Hooks
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Types
import { ContainerT } from "@/lib/types/deeplynx";
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

// Store
import { useAppDispatch } from "@/lib/store/hooks";
import { containerActions } from "@/lib/store/features/container/containerSlice";

const ContainerSelect = () => {
  // Store
  const storeDispatch = useAppDispatch();

  // Hooks
  const [containers, setContainers] = useState<Array<ContainerT>>([]);
  const [selectedContainer, setSelectedContainer] = useState<string>("");

  const router = useRouter();

  useEffect(() => {
    async function fetchContainers() {
      let containers = await fetch("/api/containers").then((response) => {
        return response.json();
      });

      setContainers(containers);
    }

    fetchContainers();
  }, []);

  useEffect(() => {
    // When the user selects a container, dispatch that container's metadata to the Redux store, and navigate to the dashboard
    if (selectedContainer) {
      const selection: ContainerT = containers.find(
        (item: ContainerT) => item.name === selectedContainer
      )!;
      storeDispatch(containerActions.setContainer(selection));
      router.push(`/containers/${selection.id}`);
    }
  }, [containers, selectedContainer, router, storeDispatch]);

  // Handlers
  const handleContainer = (event: SelectChangeEvent) => {
    setSelectedContainer(event.target.value);
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
            <InputLabel id="Container Select">Containers</InputLabel>
            <Select
              labelId="Container Select"
              id="/containers/ContainerSelect"
              label="Containers"
              value={selectedContainer}
              onChange={handleContainer}
            >
              {containers.length
                ? containers.map((container: ContainerT) => {
                    return (
                      <MenuItem key={container.id} value={container.name}>
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
