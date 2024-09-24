"use client";

// Hooks
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "@mui/material";

// Types
import { ContainerT } from "@/lib/types/deeplynx";
import { SelectChangeEvent, Typography } from "@mui/material";

// MUI
import {
  Box,
  Card,
  Container,
  Grid,
  InputLabel,
  FormControl,
  MenuItem,
  Select,
} from "@mui/material";
import { classes } from "@/app/styles";

// Store
import { useAppDispatch } from "@/lib/store/hooks";
import { containerActions } from "@/lib/store/features/container/containerSlice";

const ContainerSelect = () => {
  // Store
  const storeDispatch = useAppDispatch();

  // Hooks
  const [containers, setContainers] = useState<Array<ContainerT>>([]);
  const [selectedContainer, setSelectedContainer] = useState<string>("");
  const theme = useTheme();

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
        (item: ContainerT) => item.id === selectedContainer
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
      <Container className={classes.container}>
        <Card
          elevation={10}
          sx={{
            height: "50%",
            width: "50%",
          }}
        >
          <Grid
            container
            direction={"column"}
            sx={{ height: "100%", padding: "2.5rem" }}
            spacing={2}
          >
            <Grid
              item
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FormControl sx={{ width: "100%" }}>
                <InputLabel id="/containers/ContainerSelect">
                  Containers
                </InputLabel>
                <Select
                  autoFocus
                  label="Containers"
                  id="/containers/ContainerSelect"
                  value={selectedContainer}
                  onChange={handleContainer}
                >
                  {containers.length
                    ? containers.map((container: ContainerT) => {
                        return (
                          <MenuItem
                            key={container.id}
                            value={container.id}
                            dense
                          >
                            {container.name}
                          </MenuItem>
                        );
                      })
                    : null}
                </Select>
              </FormControl>
            </Grid>
            <Grid
              item
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Box
                component={"img"}
                sx={{ width: "50%", paddingTop: "3rem" }}
                src={
                  theme.palette.mode === "dark"
                    ? "lynx-white.png"
                    : "lynx-blue.png"
                }
              />
            </Grid>
            <Grid
              item
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography variant="caption">
                Developed by Digital Engineering
              </Typography>
            </Grid>
          </Grid>
        </Card>
      </Container>
    </>
  );
};

export default ContainerSelect;
