import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { Box, FormControl, InputLabel, Link, MenuItem, Select, SelectChangeEvent, styled, Tooltip } from '@mui/material';
import { classes } from '../styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InfoIcon from '@mui/icons-material/Info';


const VisuallyHiddenInput = styled('input')({
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    height: 1,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
    whiteSpace: 'nowrap',
    width: 1,
});

const dataSourceTypes = [
    { key: 'Standard', value: 'Standard' },
    { key: 'Timeseries', value: 'Timeseries' },
    { key: 'Custom', value: 'Custom' },
];

export default function FormDialog({ open, onClose }: any) {
    const [dataSource, setDataSource] = React.useState('');

    const handleChange = (event: SelectChangeEvent) => {
        setDataSource(event.target.value as string);
    };

    return (
        <Box >
            <Dialog
                open={open}
                onClose={onClose}
                PaperProps={{
                    component: 'form',
                    onSubmit: (event: React.FormEvent<HTMLFormElement>) => {
                        event.preventDefault();
                        const formData = new FormData(event.currentTarget);
                        const formJson = Object.fromEntries((formData as any).entries());
                        const email = formJson.email;
                    },
                    style: { minWidth: '500px', padding: '40px' }
                }}

            >
                <DialogTitle className={classes.containers.dialog.header}>Create New Container</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Name
                    </DialogContentText>
                    <TextField
                        required
                        id="outlined-required"
                        fullWidth
                        margin="dense"
                    />
                </DialogContent>
                <DialogContent>
                    <DialogContentText>
                        Description
                    </DialogContentText>
                    <TextField
                        required
                        id="outlined-required"
                        fullWidth
                        margin="dense"
                    />
                </DialogContent>
                <Box sx={{
                    flex: 10,
                    backgroundColor: ['#E9EDF0'], borderRadius: '16px',  // Adjust the value as needed
                    border: '1px solid #ccc',  // Optional: Add a border to make the rounded corners more visible
                    padding: '16px',
                }}>
                    <DialogContent>
                        <DialogContentText>
                            Upload .owl file (optional)
                            <Tooltip title="You know why">
                                <InfoIcon sx={{ scale: '70%' }} />
                            </Tooltip>
                        </DialogContentText>
                        <Button
                            component="label"
                            role={undefined}
                            variant="contained"
                            tabIndex={-1}
                            startIcon={<CloudUploadIcon />}
                        >
                            Choose file
                            <VisuallyHiddenInput
                                type="file"
                                onChange={(event) => console.log(event.target.files)}
                                multiple
                            />
                        </Button>
                    </DialogContent>
                    <DialogContent><DialogContentText>Or</DialogContentText></DialogContent>
                    <DialogContent>
                        <DialogContentText>
                            URL to .owl file (optional)
                            <Tooltip title="You know why">
                                <InfoIcon sx={{ scale: '70%' }} />
                            </Tooltip>
                        </DialogContentText>
                        <TextField
                            id="outlined-required"
                            fullWidth
                        />
                    </DialogContent>
                    <DialogContent>
                        <DialogContentText>
                            Select enabled data source types
                        </DialogContentText>
                        <FormControl fullWidth>
                            <Select
                                labelId="demo-simple-select-label"
                                id="demo-simple-select"
                                value={dataSource}
                                onChange={handleChange}>
                                {dataSourceTypes.map((item) => (
                                    <MenuItem key={item.key} value={item.key}>
                                        {item.value}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </DialogContent>
                    <DialogContent>
                        <DialogContentText>Need Help? Details on creating or updating a container via an ontology file can be found on our <Link href="https://github.com/idaholab/Deep-Lynx/wiki">Wiki</Link></DialogContentText>
                    </DialogContent>
                </Box>
                <DialogActions sx={{ justifyContent: 'space-between', padding: '20px' }}>
                    <Button sx={{ backgroundColor: "white" }} variant="outlined" onClick={onClose}>Cancel</Button>
                    <Button sx={{ color: "white" }} variant="contained" type="submit">Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}