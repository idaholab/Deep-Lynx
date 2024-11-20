"use client";

// // Hooks
import * as React from 'react';


import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { Collapse, Link, Paper, styled } from "@mui/material";
import Grid from "@mui/material/Grid2"


import { translations } from '@/lib/translations';
import { classes } from "../styles";
import { ReactNode } from 'react';

const drawerWidth = 440;
const appBarHeight = 64;

const faq = [
  {
      "question": "How does DeepLynx integrate with other systems?",
      "answer": "DeepLynx integrates with other systems through APIs, data connectors, and custom integration scripts, enabling seamless data flow between different platforms and databases."
  },
  {
      "question": "What types of data can DeepLynx handle?",
      "answer": "DeepLynx can handle structured, semi-structured, and unstructured data from multiple sources, including databases, IoT devices, spreadsheets, and cloud services."
  },
  {
      "question": "Can DeepLynx visualize data?",
      "answer": "Yes, DeepLynx offers powerful data visualization tools that allow users to create graphs to better understand and analyze their data."
  },
  {
      "question": "Is DeepLynx scalable?",
      "answer": "Yes, DeepLynx is designed to be scalable, accommodating growing data volumes and increasing user demands without compromising performance."
  },
  {
      "question": "What are the main benefits of using DeepLynx?",
      "answer": "The main benefits include improved data integration, enhanced data visualization, increased operational efficiency, better decision-making, and robust data security."
  },
  {
      "question": "Do I need technical expertise to use DeepLynx?",
      "answer": "While some technical knowledge can be helpful, DeepLynx is designed with user-friendly interfaces and comprehensive support resources to assist users with varying levels of technical expertise."
  }
]

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: '#fff',
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: 'center',
  color: theme.palette.text.secondary,
  ...theme.applyStyles('dark', {
    backgroundColor: '#1A2027',
  }),
}));

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })<{
  open?: boolean;
}>(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: `-${drawerWidth}px`,
  variants: [
    {
      props: ({ open }) => open,
      style: {
        transition: theme.transitions.create('margin', {
          easing: theme.transitions.easing.easeOut,
          duration: theme.transitions.duration.enteringScreen,
        }),
        marginLeft: 0,
      },
    },
  ],
}));

interface Props {
  children: ReactNode;
}

export default function BasicSidebar({ children }: Props) {
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
      <Box sx={{ display: 'flex' }}>
        <Drawer
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              top: appBarHeight,
              backgroundColor: '#EEF1F6',
              boxSizing: 'border-box',
            }
          }}
          className={classes.basicDrawer}
          variant="persistent"
          anchor="left"
          open={open}
        >
          <div className={classes.sidenav.header}>{translations.en.containers.welcome}</div>
          <div className={classes.sidenav.div}>DeepLynx is a unique data warehouse designed to provide easy collaboration on large projects. DeepLynx allows users to define an ontology and then store data under it. Find more information on our wiki by clicking <Link href="https://github.com/idaholab/Deep-Lynx/wiki">here</Link>.</div>
          <div className={classes.sidenav.header2}>FAQ's</div>
          <Divider />
          <List sx={{ listStyleType: 'disc' }}>
            {faq.map((bullets, index) => ( 
              <div key={index}>
                <ListItem disablePadding sx={{ paddingLeft: 3 }}>
                  <ListItemButton onClick={() => handleCollapse(index)}>
                    <ListItemText sx={{ display: 'list-item', fontSize: 14 }} primary={bullets.question} />
                  </ListItemButton>
                </ListItem>
                <Collapse in={openIndex === index} timeout="auto" unmountOnExit>
                  <div className={classes.sidenav.answer}>
                    {bullets.answer}
                  </div>
                </Collapse>
              </div>
            ))}
          </List>
          <Divider />
          <div className={classes.sidenav.div}>Have more questions? Get in touch at <Link href="mailto: deeplynx@admin.com" >deeplynx@admin.com</Link></div>
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
        <Main open={open}>
          <Box sx={{ flexGrow: 1 }}>
            {children}
          </Box>
        </Main>
      </Box>
    </>
  );
}
