import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

export default function FormDialog({ open, onClose }: any) {

    return (
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
            }}
            sx={{
                minWidth: '600px'
            }}
        >
            <DialogTitle>Create New Container</DialogTitle>
            <DialogContent>
                <DialogContentText>
                   Name
                </DialogContentText>
                <TextField
                    autoFocus
                    required
                    margin="dense"
                    id="name"
                    name="Name"
                    label="Required"
                    fullWidth
                    variant="standard"
                />
            </DialogContent>
            <DialogContent>
                <DialogContentText>
                   Description
                </DialogContentText>
                <TextField
                    autoFocus
                    required
                    margin="dense"
                    id="description"
                    name="Description"
                    label="Required"
                    fullWidth
                    variant="standard"
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button type="submit">Subscribe</Button>
            </DialogActions>
        </Dialog>
    );
}