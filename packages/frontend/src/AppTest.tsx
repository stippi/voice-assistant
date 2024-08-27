import { useState } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { motion } from "framer-motion";
import { Button, Paper, Typography } from "@mui/material";

const lightTheme = createTheme({
  palette: {
    mode: "light",
    background: {
      paper: "#ffffff",
    },
    text: {
      primary: "#000000",
    },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      paper: "#424242",
    },
    text: {
      primary: "#ffffff",
    },
  },
});

const MotionPaper = motion(Paper);
const MotionTypography = motion(Typography);

const AppTest = () => {
  const [theme, setTheme] = useState(lightTheme);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === lightTheme ? darkTheme : lightTheme));
  };

  return (
    <ThemeProvider theme={theme}>
      <MotionPaper
        animate={{
          backgroundColor: theme.palette.background.paper,
        }}
        transition={{ duration: 0.5 }}
        style={{ padding: "20px" }}
      >
        <MotionTypography
          variant="h4"
          animate={{
            color: theme.palette.text.primary,
          }}
          transition={{ duration: 0.5 }}
        >
          Willkommen zu meiner App
        </MotionTypography>
        <Button onClick={toggleTheme} style={{ marginTop: "20px" }}>
          Wechsle zu {theme === lightTheme ? "Dark" : "Light"} Theme
        </Button>
      </MotionPaper>
    </ThemeProvider>
  );
};

export default AppTest;
