import * as React from 'react';
import { useAppSelector, useAppDispatch } from '../../../app/hooks/hooks';

import Box from '@mui/material/Box';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Divider from '@mui/material/Divider';

// @ts-ignore
import COLORS from '../../styles/variables';

export default function ControlledAccordions() {
  const [expanded, setExpanded] = React.useState<string | false>(false);

  type selectedAssetObject = any;
  const selectedAssetObject: selectedAssetObject = useAppSelector((state: any) => state.appState.selectedAssetObject);

  const handleChange =
    (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded(isExpanded ? panel : false);
    };

  return (
    <>
      {selectedAssetObject.metadata.map((object: any, index: any) => (
        <Accordion
          key={index}
          expanded={expanded === `panel${index+1}`}
          onChange={handleChange(`panel${index+1}`)}
          sx={{
            '&.MuiAccordion-root': {
              border: `1px solid ${COLORS.colorDarkgray}`,
              '&:first-of-type': {
                marginTop: '0px !important'
              },
              '&:not(:first-of-type)': {
                marginTop: '-1px'
              },
            },
            '&.Mui-expanded': {
              borderTopLeftRadius: '4px',
              borderTopRightRadius: '4px',
              borderBottomLeftRadius: '4px',
              borderBottomRightRadius: '4px',
              marginTop: '16px!important'
            },
            '&.Mui-expanded + .MuiAccordion-root': {
              borderTopLeftRadius: '4px',
              borderTopRightRadius: '4px',
            },
            '&:has(+ .Mui-expanded)' : {
              borderBottomLeftRadius: '4px',
              borderBottomRightRadius: '4px',
            },
          }}
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
    </>
  );
}