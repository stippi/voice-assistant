import React, { useState } from "react";
import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Button,
  TextField,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
} from "@mui/material";
import useConfigs from "../hooks/useConfigs";
import { LLMConfig } from "../model/llmConfig";
import AddCircleIcon from "@mui/icons-material/AddCircle";

export const LLMConfigs: React.FC = () => {
  const { llmConfigs, setLLMConfigs, activeLLMConfig, setActiveLLMConfig } =
    useConfigs();
  const [selectedConfig, setSelectedConfig] = useState("");

  const handleAddConfig = () => {
    const newConfig: LLMConfig = {
      id: crypto.randomUUID(),
      name: "",
      apiEndPoint: "",
      apiKey: "",
      apiCompatibility: "OpenAI",
      modelID: "",
      useTools: true,
      useStreaming: true,
    };
    setLLMConfigs([...llmConfigs, newConfig]);
    setSelectedConfig(newConfig.id);
  };

  const handleConfigChange = <K extends keyof LLMConfig>(
    field: K,
    value: LLMConfig[K],
  ) => {
    if (selectedConfig === "") return;
    const updatedConfigs = llmConfigs.map((config) =>
      config.id === selectedConfig ? { ...config, [field]: value } : config,
    );
    setLLMConfigs(updatedConfigs);
  };

  const disabled = llmConfigs.length === 0
      || !selectedConfig
      || llmConfigs.find((config) => config.id === selectedConfig) === null;
  const config = llmConfigs.find((config) => config.id === selectedConfig) || {
    name: "",
    apiEndPoint: "",
    apiKey: "",
    apiCompatibility: "OpenAI",
    modelID: "",
    useTools: true,
    useStreaming: true,
  };

  return (
    <Box style={{ display: "flex", flexDirection: "row", gap: "1rem" }}>
      <Box style={{ minWidth: "14rem", maxWidth: "14rem" }}>
        <List style={{ padding: 0 }}>
          {llmConfigs.map((config, index) => (
            <ListItemButton
              key={index}
              selected={selectedConfig === config.id}
              onClick={() => setSelectedConfig(config.id)}
            >
              <ListItemIcon>
                <Checkbox
                  edge="start"
                  checked={activeLLMConfig === config.id}
                  tabIndex={-1}
                  disableRipple
                  onChange={() => setActiveLLMConfig(config.id)}
                />
              </ListItemIcon>
              <ListItemText primary={config.name || "<unnamed>"} />
            </ListItemButton>
          ))}
        </List>
        <Box sx={{ display: "flex", justifyContent: "flex-end", p: 2 }}>
          <Button
              startIcon={<AddCircleIcon />}
              onClick={handleAddConfig}
              variant="contained"
          >
            Add
          </Button>
        </Box>
      </Box>

      <Box
        style={{
          display: "flex",
          flexDirection: "column",
          minWidth: "14rem",
          gap: "0.5rem",
        }}
      >
        <TextField
          label="Name"
          variant="filled"
          disabled={disabled}
          value={config.name}
          onChange={(e) => handleConfigChange("name", e.target.value)}
        />
        <TextField
          label="API endpoint"
          variant="filled"
          disabled={disabled}
          value={config.apiEndPoint}
          onChange={(e) => handleConfigChange("apiEndPoint", e.target.value)}
        />
        <TextField
          label="API key"
          variant="filled"
          disabled={disabled}
          value={config.apiKey}
          onChange={(e) => handleConfigChange("apiKey", e.target.value)}
        />
        <FormControl fullWidth margin="normal">
          <InputLabel>API compatibility</InputLabel>
          <Select
            disabled={disabled}
            label="API compatibility"
            value={config.apiCompatibility}
            onChange={(e) =>
              handleConfigChange(
                "apiCompatibility",
                e.target.value as LLMConfig["apiCompatibility"],
              )
            }
          >
            <MenuItem value="OpenAI">OpenAI</MenuItem>
            <MenuItem value="VertexAI">VertexAI</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Model ID"
          variant="filled"
          disabled={disabled}
          value={config.modelID}
          onChange={(e) => handleConfigChange("modelID", e.target.value)}
        />
        <Stack spacing={2} direction="row" alignItems="center">
          <FormControl>
            <FormControlLabel
              disabled={disabled}
              checked={config.useTools}
              control={<Switch color="primary" />}
              label="Tools"
              labelPlacement="end"
              onChange={() =>
                handleConfigChange("useTools", !config.useTools)
              }
            />
          </FormControl>
          <FormControl>
            <FormControlLabel
              disabled={disabled}
              checked={config.useStreaming}
              control={<Switch color="primary" />}
              label="Streaming"
              labelPlacement="end"
              onChange={() =>
                handleConfigChange("useStreaming", !config.useStreaming)
              }
            />
          </FormControl>
        </Stack>
      </Box>
    </Box>
  );
};
