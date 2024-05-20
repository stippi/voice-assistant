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

type ConfigsContextType = {
  llmConfigs: LLMConfig[];
  setLLMConfigs: React.Dispatch<React.SetStateAction<LLMConfig[]>>;
};

export const ConfigsContext = createContext<ConfigsContextType>({
  llmConfigs: [],
  setLLMConfigs: () => {},
});

export const ConfigsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [llmConfigs, setLLMConfigs] = useState(initialLLMConfigs);

  useEffect(() => {
    localStorage.setItem("voice-assistant-configs", JSON.stringify(llmConfigs));
  }, [llmConfigs]);

  return (
    <ConfigsContext.Provider value={{ llmConfigs, setLLMConfigs }}>
      {children}
    </ConfigsContext.Provider>
  );
};
