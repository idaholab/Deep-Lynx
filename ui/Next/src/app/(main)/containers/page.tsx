
'use client';
// Hooks
import { Box, Button, Divider, IconButton, InputAdornment, Paper, Stack, styled, TextField, useTheme } from "@mui/material";
import { classes } from "../../styles";
import AddCircleIcon from '@mui/icons-material/AddCircle';

// Types
import { ContainerT } from "@/lib/types/deeplynx";

// MUI
import Grid from '@mui/material/Grid2';

// Store
import { useAppSelector } from "@/lib/store/hooks";
import BasicSidebar from "@/app/_wireframe/basic-sidenav";
import Navbar from "@/app/_wireframe/navbar";
import SearchIcon from '@mui/icons-material/Search';
import AddContainerDialog from "@/app/_wireframe/add-container-dialog";

import Containers from './containers'
import { useState } from "react";
import Navbar2 from "@/app/_wireframe/navbar2";


let list = [
  { name: 'QuantumBox', description: 'Advanced quantum computing device' },
  { name: 'NanoChamber', description: 'Microscopic containment for nanomaterials' },
  { name: 'BioReactor', description: 'System for growing microbial cultures' },
  { name: 'PhotonContainer', description: 'Light-based data storage unit' },
  { name: 'GeoVault', description: 'Geological sample preservation unit' },
  { name: 'CryoBox', description: 'Cryogenic sample storage container' }
];




const ContainerSelect = () => {

  // useEffect(() => {
  //   // When the user selects a container, dispatch that container's metadata to the Redux store, and navigate to the dashboard
  //   if (selectedContainer) {
  //     const selection: ContainerT = containers.find(
  //       (container: ContainerT) => container!.id === selectedContainer
  //     )!;

  //     storeDispatch(containerActions.setContainer(selection));
  //     router.push(`/containers/${selection.id}`);
  //   }
  // }, [containers, selectedContainer, router, storeDispatch]);

  const [open, setOpen] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };


  return (
    <>
      <div>
        <div>
          <Navbar />
          <BasicSidebar>
            <Stack className={classes.containers.header} spacing={2} direction="row">
              <h1 className={classes.containers.header}>Your Containers</h1>
              <Box>
                <TextField
                  variant="outlined"
                  placeholder="Search..."
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }
                  }}
                />
              </Box>
            </Stack>
            <Divider sx={{ marginTop: '2px', marginBottom: '20px' }} />
            <Grid container spacing={3}>
              {list.map((item, index) => (
                index === 0 ? (
                  <Grid
                    className={classes.containers.gridItem}
                    key={index}
                  >
                    <Paper sx={{border: "1px solid grey"}}
                      className={classes.containers.addItem}>
                      <h1>
                        <div>
                          <IconButton onClick={handleClickOpen}>
                            <AddCircleIcon className={classes.containers.addIcon}/>
                          </IconButton>
                          <AddContainerDialog open={open} onClose={handleClose} />
                        </div>
                      </h1>
                      <h3>Create New Container</h3>
                    </Paper>
                  </Grid>
                ) : (
                  <Grid className={classes.containers.gridItem}
                    key={index}
                  >
                    <Paper sx={{border: "1px solid grey"}} className={classes.containers.paperItem}>
                      <h3>{item.name}</h3>
                      <p>{item.description}</p>
                      <Stack className={classes.containers.buttons} spacing={2} direction="row">
                        <Button sx={{ backgroundColor: "white" }} className={classes.containers.text} variant="outlined">More Info</Button>
                        <Button sx={{ color: "white" }} className={classes.containers.text} variant="contained">Enter Container</Button>
                      </Stack>
                    </Paper>
                  </Grid>
                )
              ))}
            </Grid>
          </BasicSidebar>

        </div>
      </div>
    </>
  );
};

export default ContainerSelect;
