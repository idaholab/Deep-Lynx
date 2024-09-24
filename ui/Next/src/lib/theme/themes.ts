import { createTheme } from "@mui/material/styles";

/**
 * The MUI theme is the global theme applied to the user interface
 *
 * There are some MUI internals which may require an override because they are not accesible by Tailwind
 * https://mui.com/material-ui/customization/theme-components/
 *
 * Place those here
 *
 */

export const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
  components: {
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
  },
});

export const lightTheme = createTheme({
  palette: {
    mode: "light",
  },
  components: {
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
  },
});
