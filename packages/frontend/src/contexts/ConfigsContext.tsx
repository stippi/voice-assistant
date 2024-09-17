import React, { createContext, useCallback, useEffect, useState, ReactNode } from "react";
import { LLMConfig } from "@shared/types";

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

export const ConfigsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [llmConfigs, setLLMConfigs] = useState<LLMConfig[]>([]);
  const [activeLLMConfig, setActiveLLMConfig] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  const loadConfigs = useCallback(() => {
    const savedConfigs = localStorage.getItem("voice-assistant-configs");
    const savedActiveConfig = localStorage.getItem("voice-assistant-active-config") || "";
    if (savedConfigs) {
      try {
        setLLMConfigs(JSON.parse(savedConfigs) as LLMConfig[]);
      } catch (e) {
        console.error("Failed to parse voice assistant configurations", e);
      }
    }
    setActiveLLMConfig(savedActiveConfig);
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      console.log(`Saving ${llmConfigs.length} configs`);
      localStorage.setItem("voice-assistant-configs", JSON.stringify(llmConfigs));
    } else {
      loadConfigs();
    }
  }, [llmConfigs, isInitialized, loadConfigs]);

  useEffect(() => {
    localStorage.setItem("voice-assistant-active-config", activeLLMConfig);
  }, [activeLLMConfig]);

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
