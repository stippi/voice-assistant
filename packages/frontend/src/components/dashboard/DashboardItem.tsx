import React from "react";
import { styled, useTheme } from "@mui/material/styles";
import { KeyboardArrowDown } from "@mui/icons-material";
import {
  Box,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  SxProps,
  Paper,
} from "@mui/material";
import { Settings } from "../../contexts/SettingsContext";
import { useSettings } from "../../hooks";
import { Theme } from "@emotion/react";
import { gridConfig } from "./dashboardGridConfig";

const DashboardList = styled(List)<{ component?: React.ElementType }>({
  "& .MuiList-root": {
    overflow: "auto",
  },
  "& .MuiListItemButton-root": {
    ...gridConfig,
  },
  "& .MuiListItem-root": {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 2,
    paddingBottom: 2,
    display: "grid",
    gridTemplateColumns: "32px 1fr 32px",
    alignItems: "start",
    gap: "0 8px",
  },
  "& .MuiListItemIcon-root": {
    minWidth: 0,
    justifySelf: "center",
  },
});

export function ExpandButton({
  open,
  sx,
  id,
  color,
}: {
  open: boolean;
  sx?: SxProps<Theme>;
  id?: string;
  color?: string;
}) {
  return (
    <KeyboardArrowDown
      key={id}
      sx={{
        ...sx,
        mr: -1,
        color: `rgba(${color},1)`,
        transform: open ? "rotate(-180deg)" : "rotate(0)",
        transition: "0.2s",
        fontSize: 20,
        marginRight: 0,
        justifySelf: "center",
      }}
    />
  );
}

interface DashboardItemProps {
  icon?: React.ReactNode;
  header?: React.ReactNode;
  title: string | React.ReactNode;
  secondaryTitle: string;
  settingsKey: keyof Settings;
  children?: React.ReactNode;
  disableExpand?: boolean;
  hideList?: boolean;
  sx?: SxProps<Theme>;
  expandKey?: string;
  onMouseEnter?: (event: React.MouseEvent<HTMLElement>) => void;
  onMouseLeave?: (event: React.MouseEvent<HTMLElement>) => void;
}

export function CollapsibleList({
  header,
  title,
  icon,
  secondaryTitle,
  settingsKey,
  children,
  disableExpand,
  hideList,
  sx,
  expandKey,
  onMouseEnter,
  onMouseLeave,
}: DashboardItemProps) {
  const { settings, setSettings } = useSettings();
  const open = settings[settingsKey];
  const toggleExpand = () => setSettings({ ...settings, [settingsKey]: !open });

  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const textColor = isDarkMode ? "255,255,255" : "0,0,0";

  const iconContent = () => {
    if (icon) {
      return <ListItemIcon style={{ marginTop: 0 }}>{icon}</ListItemIcon>;
    } else {
      return <div />;
    }
  };
  const titleContent = () => {
    if (typeof title === "string") {
      return (
        <ListItemText
          primary={title}
          secondary={!header ? secondaryTitle : null}
          secondaryTypographyProps={{
            color: !disableExpand && open ? `rgba(${textColor},0)` : `rgba(${textColor},0.5)`,
          }}
          sx={{ my: 0 }}
        />
      );
    } else {
      return title;
    }
  };
  const expandContent = () => {
    if (!disableExpand) {
      return <ExpandButton open={!!open} id={expandKey} color={textColor} />;
    }
  };

  return (
    <Paper
      elevation={1}
      sx={{
        ...sx,
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {header}
      {!hideList && (
        <DashboardList style={{ paddingTop: 0, paddingBottom: 0, width: "100%" }}>
          <Box
            sx={{
              paddingTop: 0,
              paddingBottom: open && !disableExpand ? 1 : 0,
            }}
          >
            {disableExpand || typeof title !== "string" ? (
              <ListItem
                style={{
                  paddingTop: header ? 4 : 16,
                  paddingBottom: header ? 4 : 16,
                }}
              >
                {iconContent()}
                {titleContent()}
                {!disableExpand && (
                  <IconButton onClick={toggleExpand} style={{ height: 32, width: 32 }}>
                    {expandContent()}
                  </IconButton>
                )}
              </ListItem>
            ) : (
              <ListItemButton
                onMouseDown={(e) => e.preventDefault()}
                onClick={toggleExpand}
                sx={
                  {
                    //'&:hover, &:focus': { '& svg': { opacity: open ? 1 : 0 } },
                  }
                }
                style={{
                  paddingTop: header ? 4 : 16,
                  paddingBottom: open ? 0 : header ? 4 : 16,
                }}
              >
                {iconContent()}
                {titleContent()}
                {expandContent()}
              </ListItemButton>
            )}
            {open && children}
          </Box>
        </DashboardList>
      )}
    </Paper>
  );
}
