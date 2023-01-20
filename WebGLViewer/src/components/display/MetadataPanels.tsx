import * as React from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Divider from '@mui/material/Divider';

export default function ControlledAccordions() {
  // type panels = any[] | any;
  type panelsDefault = Object[];
  const [expanded, setExpanded] = React.useState<string | false>(false);

  const panelsDefault = [
    {
      title: 'General Settings',
      data: 'Nulla facilisi. Phasellus sollicitudin nulla et quam mattis feugiat. Aliquam eget maximus est, id dignissim quam.'
    },
    {
      title: 'Users',
      data: 'Nulla facilisi. Phasellus sollicitudin nulla et quam mattis feugiat. Aliquam eget maximus est, id dignissim quam.'
    },
    {
      title: 'Advanced Settings',
      data: 'Nulla facilisi. Phasellus sollicitudin nulla et quam mattis feugiat. Aliquam eget maximus est, id dignissim quam.'
    },
    {
      title: 'Personal Data',
      data: 'Nulla facilisi. Phasellus sollicitudin nulla et quam mattis feugiat. Aliquam eget maximus est, id dignissim quam.'
    }
  ];
  // const [panels, setPanels] = (panelsDefault)

  const handleChange =
    (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded(isExpanded ? panel : false);
    };

  return (
    <div>
      {panelsDefault.map((object: any, index) => (
        <Accordion
          key={index}
          expanded={expanded === `panel${index+1}`}
          onChange={handleChange(`panel${index+1}`)}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls={'panel' + (index+1) + 'bh-content'}
            id={'panel' + (index+1) + 'bh-header'}
            sx={{ minHeight: '48px !important', '& .MuiAccordionSummary-content.Mui-expanded': { margin: '8px 0 !important' } }}
          >
            <Typography sx={{ flexShrink: 0 }}>
              { object.title }
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ paddingTop: '0px' }}>
            <Divider sx={{ margin: '0 -16px' }} />
            <Typography sx={{ paddingTop: '12px' }}>
              { object.data }
            </Typography>
          </AccordionDetails>
        </Accordion>
      ))}
    </div>
  );
}