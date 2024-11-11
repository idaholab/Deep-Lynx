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
  LinearProgress,
  Select,
} from "@mui/material";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  TransitionChild,
} from "@headlessui/react";
import {
  Bars3Icon,
  BellIcon,
  CalendarIcon,
  ChartPieIcon,
  Cog6ToothIcon,
  DocumentDuplicateIcon,
  FolderIcon,
  HomeIcon,
  UsersIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  ChevronDownIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/20/solid";
import { classes } from "@/app/styles";

// Store
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { containerActions } from "@/lib/store/features/container/containerSlice";
import BasicSidebar from "@/app/_wireframe/basic-sidenav";
import { uxActions } from "@/lib/store/features/ux/uxSlice";
import Navbar from "@/app/_wireframe/navbar";
import {
  CalendarIcon,
  ChartPieIcon,
  DocumentDuplicateIcon,
  FolderIcon,
  HomeIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

const navigation = [
  { name: "Dashboard", href: "#", icon: HomeIcon, current: true },
  { name: "Team", href: "#", icon: UsersIcon, current: false },
  { name: "Projects", href: "#", icon: FolderIcon, current: false },
  { name: "Calendar", href: "#", icon: CalendarIcon, current: false },
  { name: "Documents", href: "#", icon: DocumentDuplicateIcon, current: false },
  { name: "Reports", href: "#", icon: ChartPieIcon, current: false },
];
const teams = [
  { id: 1, name: "Heroicons", href: "#", initial: "H", current: false },
  { id: 2, name: "Tailwind Labs", href: "#", initial: "T", current: false },
  { id: 3, name: "Workcation", href: "#", initial: "W", current: false },
];
const userNavigation = [
  { name: "Your profile", href: "#" },
  { name: "Sign out", href: "#" },
];

// function classNames(...classes) {
//   return classes.filter(Boolean).join(' ')
// }

const ContainerSelect = () => {
  // Store
  const storeDispatch = useAppDispatch();
  const drawer: boolean = useAppSelector((state) => state.ux.drawer);

  // Hooks
  const [containers, setContainers] = useState<Array<ContainerT>>([]);
  const [selectedContainer, setSelectedContainer] = useState<string>("");
  const theme = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const router = useRouter();

  // useEffect(() => {
  //   async function fetchContainers() {
  //     let containers = await fetch("/api/containers").then((response) => {
  //       return response.json();
  //     });

  //     setContainers(containers);
  //   }

  //   fetchContainers();
  // }, []);

  useEffect(() => {
    // When the user selects a container, dispatch that container's metadata to the Redux store, and navigate to the dashboard
    if (selectedContainer) {
      const selection: ContainerT = containers.find(
        (container: ContainerT) => container!.id === selectedContainer
      )!;

      storeDispatch(containerActions.setContainer(selection));
      router.push(`/containers/${selection.id}`);
    }
  }, [containers, selectedContainer, router, storeDispatch]);

  // Handlers
  const handleContainer = (event: SelectChangeEvent) => {
    setSelectedContainer(event.target.value);
  };

  // Handlers
  const handleDrawer = () => {
    storeDispatch(uxActions.drawer(!drawer));
  };

  return (
    <>
      <div>
        <div>
          <Navbar />
          <BasicSidebar />
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
                  xs
                >
                  <Box
                    component={"img"}
                    sx={{ width: "50%" }}
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
                  xs
                >
                  <Typography variant="caption">
                    Developed by Digital Engineering
                  </Typography>
                </Grid>
                <Grid
                  item
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  xs
                >
                  {containers.length ? (
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
                        {containers.map((container: ContainerT) => {
                          return (
                            // <MenuItem key={container.id} value={container.id} dense>
                            //   {container.name}
                            // </MenuItem>
                            <></>
                          );
                        })}
                      </Select>
                    </FormControl>
                  ) : (
                    <Box sx={{ width: "100%" }}>
                      <LinearProgress />
                    </Box>
                  )}
                </Grid>
              </Grid>
            </Card>
          </Container>
        </div>
      </div>
    </>
  );
};

export default ContainerSelect;
