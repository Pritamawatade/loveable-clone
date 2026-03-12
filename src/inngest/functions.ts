import { createAgent, openai } from "@inngest/agent-kit";
import { inngest } from "./client";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event }) => {
  const agent = createAgent({
    name: "AI Agent",
    description: "An AI agent that writes code",
    system: "You are a helpful assistant that writes code for the user",
    model: openai({model: "gpt-3.5-turbo"})
  })
    const {output} = await agent.run(`${event.data.value}`)

  console.log(`output = `, output);

  return {output}
  
  
  },
);