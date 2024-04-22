import {Message} from "../model/message";
import {GoogleProjectId, modelName} from "../config";
import {loginFlow} from "./google";
import React from "react";
import OpenAI from "openai";
import ChatCompletion = OpenAI.ChatCompletion;
import ChatCompletionTool = OpenAI.ChatCompletionTool;
import ChatCompletionMessage = OpenAI.ChatCompletionMessage;


function convertRole(role: string) {
  switch (role) {
    case "assistant":
      return "model";
    case "tool":
      return "function";
    default:
      return "user";
  }
}

export async function postGeminiRequest(
  systemMessage: Message,
  messages: Message[],
  tools: ChatCompletionTool[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
): Promise<ChatCompletion> {
  const accessToken = await loginFlow.getAccessToken();
  
  const wrappedSystemMessage = "Hi. I'll explain how you should behave:\n"
    + systemMessage.content;
  const transformedMessages = [
    {role: "user", content: wrappedSystemMessage},
    {role: "assistant", content: "Ok, let's start! Please continue in your native language."},
    ...messages];
  
  const region = "europe-west3";//"us-east4";
  const url = `https://${region}-aiplatform.googleapis.com/v1/projects/${GoogleProjectId}/locations/${region}/publishers/google/models/${modelName}:streamGenerateContent?alt=sse`
  const body = {
    contents: transformedMessages.map(message => {
      const converted: GeminiMessage = {
        role: convertRole(message.role),
        parts: []
      };
      if (message.role === "tool") {
        converted.parts.push({
          functionResponse: {
            name: message.name,
            response: {
              name: message.name,
              content: JSON.parse(message.content || "{}") as never
            }
          }
        });
      } else if (message.role === "assistant" && message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          converted.parts.push({
            functionCall: {
              name: toolCall.function.name,
              args: JSON.parse(toolCall.function.arguments) as never
            }
          });
        }
      } else if (message.content) {
        converted.parts.push({
          text: message.content
        });
      }
      return converted;
    }),
    tools: [
      {
        functionDeclarations: tools.map(tool => tool.function)
      }
    ]
  };
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'text/event-stream'
    },
    body: JSON.stringify(body)
  });
  
  if (!response.ok || !response.body) {
    throw new Error(`Failed to fetch from Gemini: ${response.status} ${response.statusText}`);
  }
  
  let content = '';
  let functionCall: FunctionCall | undefined;
  for await (const event of fetchServerSentEvents(response.body.getReader())) {
    const delta: GeminiResponse = JSON.parse(event.data);
    content += delta.candidates?.[0].content?.parts?.[0].text || "";
    if (content) {
      setMessages([...messages, {role: "assistant", content: content}]);
    }
    if (delta.candidates?.[0].content?.parts?.[0].functionCall) {
      functionCall = delta.candidates[0].content.parts[0].functionCall;
    }
  }
  
  const finalMessage: ChatCompletionMessage = {
    role: "assistant",
    content: content ? content : null
  };
  if (functionCall) {
    finalMessage.tool_calls = [
      {
        id: "unused",
        type: "function",
        function: {
          name: functionCall.name,
          arguments: JSON.stringify(functionCall.args)
        }
      }
    ];
  }

  return {
    id: "unused",
    choices: [
      {
        index: 0,
        message: finalMessage,
        finish_reason: functionCall ? "function_call" : "stop",
        logprobs: null
      }
    ],
    model: "gemini-pro",
    created: new Date().getTime(),
    object: "chat.completion"
  };
}

async function* fetchServerSentEvents(reader:  ReadableStreamDefaultReader<Uint8Array>): AsyncIterableIterator<MessageEvent> {
  const decoder = new TextDecoder();
  let data = '';
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        // Server closed the stream
        break;
      }
      
      // Decode the chunk and add it to the data
      const text = decoder.decode(value, { stream: true });
      data += text;
      //console.log('chunk:', text);
      
      // Split the data into messages
      let eolIndex;
      while ((eolIndex = data.indexOf('\r\n\r\n')) >= 0) {
        const message = data.substring("data: ".length, eolIndex).trim();
        data = data.substring(eolIndex + 4);
        
        if (message) {
          const event = new MessageEvent('message', {
            data: message.split('\n').pop()
          });
          // Hand the result to the iterator
          yield event;
        }
      }
    }
    //console.log("data after exiting loop", data);
  } finally {
    reader.releaseLock();
  }
}

interface FunctionCall {
  name: string,
  args: never
}

interface GeminiMessage {
  role: string,
  parts: {
    text?: string
    functionResponse?: {
      name: string,
      response: {
        name: string,
        content: never,
      }
    }
    functionCall?: FunctionCall
  }[]
}

interface Candidate {
  content: {
    role: string,
    parts: {
      text?: string
      functionCall?: FunctionCall
    }[]
  },
  finishReason: string,
}

interface GeminiResponse {
  candidates: Candidate[],
  usageMetadata: {
    promptTokenCount: number,
    candidatesTokenCount: number,
    totalTokenCount: number
  }
}

// Accumulator from OpenAI node SDK example
// function messageReducer(previous: GeminiResponse, delta: GeminiResponse): GeminiResponse {
//   const reduce = (acc: any, delta: GeminiResponse) => {
//     acc = { ...acc };
//     for (const [key, value] of Object.entries(delta)) {
//       if (acc[key] === undefined || acc[key] === null) {
//         acc[key] = value;
//         if (Array.isArray(acc[key])) {
//           for (const arr of acc[key]) {
//             delete arr.index;
//           }
//         }
//       } else if (typeof acc[key] === 'string' && typeof value === 'string') {
//         acc[key] += value;
//       } else if (typeof acc[key] === 'number' && typeof value === 'number') {
//         acc[key] = value;
//       } else if (Array.isArray(acc[key]) && Array.isArray(value)) {
//         const accArray = acc[key];
//         for (let i = 0; i < value.length; i++) {
//           const { index, ...chunkTool } = value[i];
//           if (index - accArray.length > 1) {
//             throw new Error(
//               `Error: An array has an empty value when tool_calls are constructed. tool_calls: ${accArray}; tool: ${value}`,
//             );
//           }
//           accArray[index] = reduce(accArray[index], chunkTool);
//         }
//       } else if (typeof acc[key] === 'object' && typeof value === 'object') {
//         acc[key] = reduce(acc[key], value);
//       }
//     }
//     return acc;
//   };
//   return reduce(previous, delta) as GeminiResponse;
// }
