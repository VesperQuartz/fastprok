import { chat, toServerSentEventsResponse } from "@tanstack/ai";
import { ollamaText } from "@tanstack/ai-ollama";
import { createFileRoute } from "@tanstack/react-router";

const Chat = () => {
  return <div>Chat</div>;
};

export const Route = createFileRoute("/api/chat/")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json();
        console.log(body);
        const stream = chat({
          adapter: ollamaText("mrlectus"),
          messages: body.messages,
        });
        return toServerSentEventsResponse(stream);
      },
    },
  },
  component: Chat,
});
