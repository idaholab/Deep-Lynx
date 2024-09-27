import { createTheme } from "@mui/material/styles";
import config from "../../../tailwind.config";
import colors from "tailwindcss/colors";

/**
 * The MUI theme is the global theme applied to the user interface
 *
 * There are some MUI internals which may require an override because they are not accesible by Tailwind
 * https://mui.com/material-ui/customization/theme-components/
 *
 * There are other MUI components which read their colors in based on the MUI theme ("primary"|"secondary"), in which case you must use the imported Tailwind configuration to style them
 *
 */

export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: config.theme.extend.colors.electricity,
    },
    secondary: {
      main: colors.gray[800],
    },
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
    primary: {
      main: config.theme.extend.colors.cherenkov,
    },
    secondary: {
      main: colors.gray[500],
    },
  },
  components: {
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
  },
});
