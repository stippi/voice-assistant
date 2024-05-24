import React, { useState } from "react";
import {
  Container,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Button,
  TextField,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Grid,
  Paper,
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
      useTools: false,
      useStreaming: false,
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

  return (
    <Container>
      <Grid container spacing={2}>
        <Grid item xs={4}>
          <Paper elevation={2} style={{ padding: "10px" }}>
            <Typography variant="h6">Konfigurationen</Typography>
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
                  <ListItemText
                    primary={config.name || "<unknown LLM config>"}
                  />
                </ListItemButton>
              ))}
            </List>
            <Button
              variant="contained"
              color="primary"
              onClick={handleAddConfig}
            >
              Add
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={8}>
          {selectedConfigIndex !== null && (
            <Paper elevation={2} style={{ padding: "10px" }}>
              <Typography variant="h6">Edit LLM Config</Typography>
              <TextField
                label="Name"
                fullWidth
                margin="normal"
                value={llmConfigs[selectedConfigIndex].name}
                onChange={(e) => handleConfigChange("name", e.target.value)}
              />
              <TextField
                label="API Endpunkt"
                fullWidth
                margin="normal"
                value={llmConfigs[selectedConfigIndex].apiEndPoint}
                onChange={(e) =>
                  handleConfigChange("apiEndPoint", e.target.value)
                }
              />
              <TextField
                label="API Key"
                fullWidth
                margin="normal"
                value={llmConfigs[selectedConfigIndex].apiKey}
                onChange={(e) => handleConfigChange("apiKey", e.target.value)}
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>API Kompatibilität</InputLabel>
                <Select
                  value={llmConfigs[selectedConfigIndex].apiCompatibility}
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
                value={llmConfigs[selectedConfigIndex].modelID}
                onChange={(e) => handleConfigChange("modelID", e.target.value)}
              />
              <FormControl fullWidth margin="normal">
                <Typography>Tools verwenden</Typography>
                <Switch
                  checked={llmConfigs[selectedConfigIndex].useTools}
                  onChange={(e) =>
                    handleConfigChange("useTools", e.target.checked)
                  }
                />
              </FormControl>
              <FormControl fullWidth margin="normal">
                <Typography>Streaming verwenden</Typography>
                <Switch
                  checked={llmConfigs[selectedConfigIndex].useStreaming}
                  onChange={(e) =>
                    handleConfigChange("useStreaming", e.target.checked)
                  }
                />
              </FormControl>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};
