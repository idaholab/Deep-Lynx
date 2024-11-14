"use client";

// Hooks
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// MUI
import {
  Box,
  Button,
  Container,
  Drawer,
  Typography,
} from "@mui/material";


// Icons
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import HomeIcon from "@mui/icons-material/Home";
import AppsIcon from '@mui/icons-material/Apps';
import ViewInArIcon from "@mui/icons-material/ViewInAr";
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import TimelineIcon from '@mui/icons-material/Timeline';
import LanIcon from '@mui/icons-material/Lan';
import InboxIcon from '@mui/icons-material/Inbox';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SettingsIcon from '@mui/icons-material/Settings';

// Store
import { useAppSelector } from "@/lib/store/hooks";


// Styles
import { classes } from "@/app/styles";

export default function Sidebar() {
  // Hooks
  const router = useRouter();
  const container = useAppSelector((state) => state.container.container!);

  return (
    <>
      <Drawer
        sx={{
          '& .MuiDrawer-paper': {
            width: 350,
            top: 64,
          }
        }}
        open={true}
        variant="persistent"
        anchor="left"
        classes={{
          paper: classes.drawer.paper,
        }}
      >
        <Container className={classes.drawer.sidebar}>
          <Box sx={{ width: "100%" }}>
            <Box>
              <Button
                startIcon={<HomeIcon className={classes.icon} />}
                className={classes.drawer.button}
                onClick={() => router.push(`/containers/`)}>
                <Typography
                  variant="button"
                  className={classes.drawer.typography}
                >
                  All Containers
                </Typography>
              </Button>
              <Button
                startIcon={<AppsIcon className={classes.icon} />}
                className={classes.drawer.button}
                onClick={() => router.push(`/containers/${container.id}`)}>
                <Typography
                  variant="button"
                  className={classes.drawer.typography}
                >
                 Current Container Dashboard
                </Typography>
              </Button>
            </Box>
            <br />
            <Typography variant="overline" className={classes.drawer.header}>Your Data</Typography>
            <Box>
              <Button
                startIcon={<ManageSearchIcon className={classes.icon} />}
                className={classes.drawer.button}
                onClick={() =>
                  router.push(`/containers/${container.id}/data-query`)}>
                <Typography variant="button" className={classes.drawer.typography}>
                  Data Viewer
                </Typography>
              </Button>
            </Box>
            <Box>
              <Button
                startIcon={<TimelineIcon className={classes.icon} />}
                className={classes.drawer.button}
                // Times series end point changing maybe?
                onClick={() =>
                  router.push(`/containers/${container.id}/timeseries-viewer`)}>
                <Typography variant="button" className={classes.drawer.typography}>
                  Timeseries Viewer
                </Typography>
              </Button>
            </Box>
            <Box>
              <Button
                startIcon={<InsertDriveFileIcon className={classes.icon} />}
                className={classes.drawer.button}
                onClick={() =>
                  router.push(`/containers/${container.id}/files`)}>
                <Typography variant="button" className={classes.drawer.typography}>
                  File Viewer
                </Typography>
              </Button>
            </Box>

            <br />
            <Typography variant="overline" className={classes.drawer.header}>Data Management</Typography>
            <Box>
              <Button
                startIcon={<LanIcon className={classes.icon} />}
                className={classes.drawer.button}
                onClick={() =>
                  router.push(`/containers/${container.id}/metatypes`)}>
                <Typography variant="button" className={classes.drawer.typography}>
                  Ontology
                </Typography>
              </Button>
            </Box>
            <Box>
              <Button
                startIcon={<InboxIcon className={classes.icon} />}
                className={classes.drawer.button}
                onClick={() =>
                  router.push(`/containers/${container.id}/data-sources`)}>
                <Typography variant="button" className={classes.drawer.typography}>
                  Data Sources
                </Typography>
              </Button>
            </Box>
            <Box>
              <Button
                startIcon={<LocalOfferIcon className={classes.icon} />}
                className={classes.drawer.button}
                onClick={() =>
                  router.push(`/containers/${container.id}/tags`)}>
                <Typography variant="button" className={classes.drawer.typography}>
                  Tags
                </Typography>
              </Button>
            </Box>

            <br />
            <Typography variant="overline" className={classes.drawer.header}>Widgets</Typography>
            <Box>
              <Button
                startIcon={<ViewInArIcon className={classes.icon} />}
                className={classes.drawer.button}
                onClick={() =>
                  router.push(`/containers/${container.id}/model-viewer`)
                }>
                <Typography variant="button" className={classes.drawer.typography}>
                  Model Viewer
                </Typography>
              </Button>
            </Box>
            <Box>
              <Button
                startIcon={<CalendarMonthIcon className={classes.icon} />}
                className={classes.drawer.button}
                onClick={() =>
                  router.push(`/containers/${container.id}/events`)}>
                <Typography variant="button" className={classes.drawer.typography}>
                  Events
                </Typography>
              </Button>
            </Box>
          </Box>
          <Box sx={{ marginTop: 30 }}>
            <Button
              startIcon={<SettingsIcon className={classes.icon} />}
              className={classes.drawer.button}
              onClick={() =>
                router.push(`/containers/${container.id}/settings`)}>
              <Typography variant="button" className={classes.drawer.typography}>
                Container Settings
              </Typography>
            </Button>
          </Box>
        </Container>
      </Drawer>
    </>
  );
}
