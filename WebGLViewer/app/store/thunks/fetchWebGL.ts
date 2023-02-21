import { createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const fetchWebGL = createAsyncThunk('webgl/fetch', async () => {
  const response = await axios.get('http://localhost:8090/containers/2/files/5/download');

  // DEV ONLY!!!
  await pause(1000);

  return response.data;
});

// DEV ONLY!!!
const pause = (duration: any) => {
  return new Promise((resolve) => {
    setTimeout(resolve, duration);
  });
};

export { fetchWebGL };
