"use client";

// Hooks
import * as React from 'react';


import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import CssBaseline from '@mui/material/CssBaseline';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { Collapse, Link } from "@mui/material";

import { translations } from '@/lib/translations';
import { classes } from "../styles";



const drawerWidth = 440;
const appBarHeight = 64;

const faq = [
  {
    question: translations.en.containers.faq1,
    answer: translations.en.containers.answer1
  }
]

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

export default function BasicSidebar() {
  // Hooks
  const [open, setOpen] = React.useState(true);
  const [openIndex, setOpenIndex] = React.useState(null);


  const handleDrawerMovement = () => {
    let result = !open
    setOpen(result)
  }

  const handleCollapse = (index: any) => {
    setOpenIndex((prevIndex) => (prevIndex === index ? null : index));
  }
  return (
    <>
      <Box sx={{ display: 'flex'}}>
        <CssBaseline />
        <Drawer
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth, 
              top: appBarHeight, 
            }
          }}
          className={classes.basicdrawer}
          variant="persistent"
          anchor="left"
          open={open}
        >
          <DrawerHeader>
            <Typography variant='h6' style={{ flex: 1, textAlign: "left", padding: 16 }}>{translations.en.containers.welcome}</Typography>
          </DrawerHeader>
          <Divider />
          <Typography sx={{ padding: 3, fontSize: 14 }}>DeepLynx is a unique data warehouse designed to provide easy collaboration on large projects. DeepLynx allows users to define an ontology and then store data under it. Find more information on our wiki by clicking <Link href="https://github.com/idaholab/Deep-Lynx/wiki">here</Link>.</Typography>
          <Typography sx={{ paddingLeft: 3, paddingBottom: 1 }}>FAQ's</Typography>
          <Divider />
          <List sx={{ listStyleType: 'disc' }}>
            {faq.map((bullets, index) => (
              <div>
                <ListItem key={bullets.question} disablePadding sx={{ paddingLeft: 3 }}>
                  <ListItemButton onClick={() => handleCollapse(index)}>
                    <ListItemText sx={{ display: 'list-item', fontSize: 14 }} primary={bullets.question} />
                  </ListItemButton>
                </ListItem>
                <Collapse in={openIndex === index} timeout="auto" unmountOnExit>
                  <Typography sx={{ paddingLeft: 3, paddingBottom: 2 }}>
                    {bullets.answer}
                  </Typography>
                </Collapse>
              </div>
            ))}
          </List>
          <Divider />
          <Typography sx={{ padding: 3, fontSize: 14 }}>Have more questions? Get in touch at <Link href="mailto: deeplynx@admin.com" >deeplynx@admin.com</Link></Typography>
        </Drawer>
        <Box
          sx={{
            position: 'fixed',
            left: open ? drawerWidth : 0,
            top: appBarHeight + 16,
            width: 24,
            height: 50,
            backgroundColor: '#083769',
            borderRadius: '0 4px 4px 0',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            zIndex: 1300 
          }}
          onClick={handleDrawerMovement}
        >
          <IconButton sx={{ color: "white" }}>
            {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </Box>
      </Box>
    </>
  );
}
