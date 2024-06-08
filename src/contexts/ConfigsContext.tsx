import React, { createContext, useState, useEffect, ReactNode } from "react";
import { LLMConfig } from "../model/llmConfig";

let initialLLMConfigs: LLMConfig[] = [];

const savedConfigs = localStorage.getItem("voice-assistant-configs");
if (savedConfigs) {
  try {
    initialLLMConfigs = JSON.parse(savedConfigs);
  } catch (e) {
    console.error("Failed to parse voice assistant configurations", e);
  }
}

const savedActiveConfig =
  localStorage.getItem("voice-assistant-active-config") || "";

type ConfigsContextType = {
  llmConfigs: LLMConfig[];
  setLLMConfigs: React.Dispatch<React.SetStateAction<LLMConfig[]>>;
  activeLLMConfig: string;
  setActiveLLMConfig: React.Dispatch<React.SetStateAction<string>>;
};

export const ConfigsContext = createContext<ConfigsContextType>({
  llmConfigs: [],
  setLLMConfigs: () => {},
  activeLLMConfig: "",
  setActiveLLMConfig: () => {},
});

export const ConfigsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [llmConfigs, setLLMConfigs] = useState(initialLLMConfigs);
  const [activeLLMConfig, setActiveLLMConfig] = useState(savedActiveConfig);

  useEffect(() => {
    localStorage.setItem("voice-assistant-configs", JSON.stringify(llmConfigs));
  }, [llmConfigs]);
  useEffect(() => {
    localStorage.setItem("voice-assistant-active-config", activeLLMConfig);
  }, [activeLLMConfig]);

  return (
    <ConfigsContext.Provider
      value={{
        llmConfigs,
        setLLMConfigs,
        activeLLMConfig,
        setActiveLLMConfig,
      }}
    >
      {children}
    </ConfigsContext.Provider>
  );
};
