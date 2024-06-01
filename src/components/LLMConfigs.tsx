import React, { useState } from "react";
import {
  Box,
  Container,
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
  Switch,
  Typography,
} from "@mui/material";
import useConfigs from "../hooks/useConfigs";
import { LLMConfig } from "../model/llmConfig";

export const LLMConfigs: React.FC = () => {
  const { llmConfigs, setLLMConfigs } = useConfigs();
  const [selectedConfigIndex, setSelectedConfigIndex] = useState<number | null>(
    null,
  );
  const [activeConfigIndex, setActiveConfigIndex] = useState<number | null>(
    null,
  );

  const handleSelectConfig = (index: number) => {
    setSelectedConfigIndex(index);
  };

  const handleToggleActiveConfig = (index: number) => {
    setActiveConfigIndex(index);
  };

  const handleAddConfig = () => {
    const newConfig: LLMConfig = {
      name: "",
      apiEndPoint: "",
      apiKey: "",
      apiCompatibility: "OpenAI",
      modelID: "",
      useTools: true,
      useStreaming: true,
    };
    setLLMConfigs([...llmConfigs, newConfig]);
    setSelectedConfigIndex(llmConfigs.length);
  };

  const handleConfigChange = <K extends keyof LLMConfig>(
    field: K,
    value: LLMConfig[K],
  ) => {
    if (selectedConfigIndex === null) return;
    const updatedConfigs = llmConfigs.map((config, index) =>
      index === selectedConfigIndex ? { ...config, [field]: value } : config,
    );
    setLLMConfigs(updatedConfigs);
  };

  const disabled = selectedConfigIndex === null;
  const config = !disabled
    ? llmConfigs[selectedConfigIndex]
    : {
        name: "",
        apiEndPoint: "",
        apiKey: "",
        apiCompatibility: "OpenAI",
        modelID: "",
        useTools: true,
        useStreaming: true,
      };

  return (
    <Container>
      <Box style={{ display: "flex", flexDirection: "row", gap: "0.5rem" }}>
        <Box>
          <Typography variant="h6">Configurations</Typography>
          <List>
            {llmConfigs.map((config, index) => (
              <ListItemButton
                key={index}
                selected={selectedConfigIndex === index}
                onClick={() => handleSelectConfig(index)}
              >
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={activeConfigIndex === index}
                    tabIndex={-1}
                    disableRipple
                    onChange={() => handleToggleActiveConfig(index)}
                  />
                </ListItemIcon>
                <ListItemText primary={config.name || "<unknown LLM config>"} />
              </ListItemButton>
            ))}
          </List>
          <Button variant="contained" color="primary" onClick={handleAddConfig}>
            Add
          </Button>
        </Box>

        <Box
          style={{
            display: "flex",
            flexDirection: "column",
            minWidth: "20rem",
          }}
        >
          <TextField
            label="Name"
            fullWidth
            margin="normal"
            disabled={disabled}
            value={config.name}
            onChange={(e) => handleConfigChange("name", e.target.value)}
          />
          <TextField
            label="API endpoint"
            fullWidth
            margin="normal"
            disabled={disabled}
            value={config.apiEndPoint}
            onChange={(e) => handleConfigChange("apiEndPoint", e.target.value)}
          />
          <TextField
            label="API key"
            fullWidth
            margin="normal"
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
            fullWidth
            margin="normal"
            disabled={disabled}
            value={config.modelID}
            onChange={(e) => handleConfigChange("modelID", e.target.value)}
          />
          <FormControl>
            <FormControlLabel
              disabled={disabled}
              checked={config.useTools}
              control={<Switch color="primary" />}
              label="Tools"
              labelPlacement="end"
              onChange={() => handleConfigChange("useTools", !config.useTools)}
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
        </Box>
      </Box>
    </Container>
  );
};
