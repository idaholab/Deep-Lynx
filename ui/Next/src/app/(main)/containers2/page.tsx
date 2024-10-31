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
} from '@headlessui/react'
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
} from '@heroicons/react/24/outline'
import { ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { classes } from "@/app/styles";

// Store
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { containerActions } from "@/lib/store/features/container/containerSlice";
import { uxActions } from "@/lib/store/features/ux/uxSlice";

// Hooks
import { usePathname } from "next/navigation";

import Sidebar from "@/app/_wireframe/sidebar";
import Wireframe from "@/app/_wireframe/wireframe";


const navigation = [
  { name: 'Dashboard', href: '#', icon: HomeIcon, current: true },
  { name: 'Team', href: '#', icon: UsersIcon, current: false },
  { name: 'Projects', href: '#', icon: FolderIcon, current: false },
  { name: 'Calendar', href: '#', icon: CalendarIcon, current: false },
  { name: 'Documents', href: '#', icon: DocumentDuplicateIcon, current: false },
  { name: 'Reports', href: '#', icon: ChartPieIcon, current: false },
]
const teams = [
  { id: 1, name: 'Heroicons', href: '#', initial: 'H', current: false },
  { id: 2, name: 'Tailwind Labs', href: '#', initial: 'T', current: false },
  { id: 3, name: 'Workcation', href: '#', initial: 'W', current: false },
]
const userNavigation = [
  { name: 'Your profile', href: '#' },
  { name: 'Sign out', href: '#' },
]

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}


const ContainerSelect = (props: any) => {
  // Store
  const storeDispatch = useAppDispatch();

  // Hooks
  const [containers, setContainers] = useState<Array<ContainerT>>([]);
  const [selectedContainer, setSelectedContainer] = useState<string>("");
  const theme = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
  const container = useAppSelector((state) => state.container.container);
  const drawer: boolean = useAppSelector((state) => state.ux.drawer);
  const path = usePathname();

  // Handlers
  const handleDrawer = () => {
    storeDispatch(uxActions.drawer(!drawer));
  };
  return (
  <>
    <Wireframe>

    </Wireframe>
  </>
  )
  
};

export default ContainerSelect;
