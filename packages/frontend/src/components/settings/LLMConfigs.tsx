import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
} from "@mui/material";
import { useConfigs } from "../../hooks";
import { LLMConfig } from "@shared/types";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import Paper from "@mui/material/Paper";
import EditableListItem from "../common/EditableListItem";
import { DraggableList } from "../common/DraggableList";

export const LLMConfigs: React.FC = () => {
  const { llmConfigs, setLLMConfigs, activeLLMConfig, setActiveLLMConfig } = useConfigs();
  const [selectedConfig, setSelectedConfig] = useState("");

  const handleReorder = (oldIndex: number, newIndex: number) => {
    const items = Array.from(llmConfigs);
    const [reorderedItem] = items.splice(oldIndex, 1);
    items.splice(newIndex, 0, reorderedItem);
    setLLMConfigs(items);
  };


  const handleAddConfig = () => {
    const newConfig: LLMConfig = {
      id: crypto.randomUUID(),
      name: "",
      apiEndPoint: "",
      apiKey: "",
      projectID: "",
      region: "",
      apiCompatibility: "OpenAI",
      modelID: "",
      useTools: true,
    };
    setLLMConfigs([...llmConfigs, newConfig]);
    setSelectedConfig(newConfig.id);
  };

  const handleConfigChange = <K extends keyof LLMConfig>(field: K, value: LLMConfig[K]) => {
    if (selectedConfig === "") return;
    const updatedConfigs = llmConfigs.map((config) =>
      config.id === selectedConfig ? { ...config, [field]: value } : config,
    );
    setLLMConfigs(updatedConfigs);
  };

  const disabled =
    llmConfigs.length === 0 || !selectedConfig || llmConfigs.find((config) => config.id === selectedConfig) === null;
  const config = llmConfigs.find((config) => config.id === selectedConfig) || {
    name: "",
    apiEndPoint: "",
    apiKey: "",
    projectID: "",
    region: "",
    apiCompatibility: "OpenAI",
    modelID: "",
    useTools: true,
  };

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "row",
        gap: "1rem",
        alignItems: "stretch",
      }}
    >
      <Box
        style={{
          minWidth: "14rem",
          maxWidth: "14rem",
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          alignItems: "stretch",
          flexShrink: 0,
        }}
      >
        <Paper
          sx={{
            flex: 1,
            overflow: "auto",
            maxHeight: "20rem",
          }}
        >
          <DraggableList
            items={llmConfigs.map((config, index) => ({ ...config, index }))}
            onReorder={handleReorder}
            renderItem={(item) => (
              <EditableListItem
                item={item}
                fallbackName="<unnamed>"
                isSelected={selectedConfig === item.id}
                onClick={() => setSelectedConfig(item.id)}
                onDuplicate={() => {
                  const newConfig: LLMConfig = {
                    ...item,
                    id: crypto.randomUUID(),
                    name: `${item.name} (copy)`,
                  };
                  setLLMConfigs([...llmConfigs, newConfig]);
                  setSelectedConfig(newConfig.id);
                }}
                onRename={(name) => {
                  const updatedConfigs = llmConfigs.map((config) =>
                    config.id === item.id ? { ...config, name } : config,
                  );
                  setLLMConfigs(updatedConfigs);
                }}
                onDelete={() => {
                  const updatedConfigs = llmConfigs.filter((c) => c.id !== item.id);
                  setLLMConfigs(updatedConfigs);
                  setSelectedConfig(updatedConfigs[0]?.id || "");
                }}
                isActive={item.id === activeLLMConfig}
                onActivate={() => setActiveLLMConfig(item.id)}
              />
            )}
          />
        </Paper>
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button startIcon={<AddCircleIcon />} onClick={handleAddConfig} variant="contained">
            Add
          </Button>
        </Box>
      </Box>

      <Box
        style={{
          display: "flex",
          flexDirection: "column",
          minWidth: "14rem",
          minHeight: "100%",
          gap: "0.5rem",
          flex: 1,
        }}
      >
        <FormControl fullWidth margin="normal">
          <InputLabel>API compatibility</InputLabel>
          <Select
            disabled={disabled}
            label="API compatibility"
            value={config.apiCompatibility}
            onChange={(e) => handleConfigChange("apiCompatibility", e.target.value as LLMConfig["apiCompatibility"])}
          >
            <MenuItem value="Anthropic">Anthropic</MenuItem>
            <MenuItem value="Ollama">Ollama</MenuItem>
            <MenuItem value="OpenAI">OpenAI</MenuItem>
            <MenuItem value="VertexAI">VertexAI</MenuItem>
          </Select>
        </FormControl>
        {config.apiCompatibility !== "VertexAI" && (
          <TextField
            label="API endpoint"
            variant="filled"
            disabled={disabled}
            value={config.apiEndPoint}
            onChange={(e) => handleConfigChange("apiEndPoint", e.target.value)}
          />
        )}
        {config.apiCompatibility !== "VertexAI" && (
          <TextField
            label="API key"
            variant="filled"
            disabled={disabled}
            value={config.apiKey}
            onChange={(e) => handleConfigChange("apiKey", e.target.value)}
          />
        )}
        {config.apiCompatibility === "VertexAI" && (
          <TextField
            label="Project ID"
            variant="filled"
            disabled={disabled}
            value={config.projectID}
            onChange={(e) => handleConfigChange("projectID", e.target.value)}
          />
        )}
        {config.apiCompatibility === "VertexAI" && (
          <TextField
            label="Region"
            variant="filled"
            disabled={disabled}
            value={config.region}
            onChange={(e) => handleConfigChange("region", e.target.value)}
          />
        )}
        <TextField
          label="Model ID"
          variant="filled"
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
      </Box>
    </Box>
  );
};
