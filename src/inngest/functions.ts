import { createAgent, openai } from "@inngest/agent-kit";
import { inngest } from "./client";
import {Sandbox} from "e2b"
import { getSandboxId } from "./utils";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {

    const sandboxId = await step.run("get-sandboxId", async ()=>{
      const sandbox = await Sandbox.create("3c626no0oswu49azse48")
      return sandbox.sandboxId;
    })

  const agent = createAgent({
    name: "AI Agent",
    description: "An AI agent that writes code",
    system: "You are a helpful assistant that writes code for the user",
    model: openai({model: "gpt-3.5-turbo"})
  })
    const {output} = await agent.run(`${event.data.value}`)

    const sandboxUrl = await step.run("get-sandbox-url", async ()=>{
      const sandbox = await getSandboxId(sandboxId);
      const host = sandbox.getHost(3000);
      return `http://${host}`;
    })
  
    
    
    return  {output, sandboxUrl}
  },
);