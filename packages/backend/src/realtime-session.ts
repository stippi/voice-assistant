import WebSocket from "ws";

export function createSession() {
  const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";
  const ws = new WebSocket(url, {
    headers: {
      Authorization: "Bearer " + process.env.OPENAI_API_KEY,
      "OpenAI-Beta": "realtime=v1",
    },
  });

  ws.on("open", function open() {
    console.log("Connected to server.");
    ws.send(
      JSON.stringify({
        type: "response.create",
        response: {
          modalities: ["text"],
          instructions: "Please assist the user.",
        },
      }),
    );
  });

  ws.on("message", function incoming(message) {
    console.log(JSON.parse(message.toString()));
  });
}
