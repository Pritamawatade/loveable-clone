import { createAgent, createTool, openai } from "@inngest/agent-kit";
import { inngest } from "./client";
import {Sandbox} from "e2b"
import { getSandbox } from "./utils";
import z, { array } from "zod";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {

    const sandboxId = await step.run("get-sandboxId", async ()=>{
      const sandbox = await Sandbox.create("3c626no0oswu49azse48")
      return sandbox.sandboxId;
    })

  const codeAgent = createAgent({
    name: "AI Agent",
    description: "An AI agent that writes code",
    system: "You are a helpful assistant that writes code for the user",
    model: openai({model: "gpt-4.1"}),
    tools: [
      createTool({
        name: "Terminal",
        description: "Use the terminal to run commands",
        parameters: z.object({
          command: z.string().describe("The command to run in the terminal")
        }),
        handler: async({command}, {step}) =>{
          return await step?.run("terminal", async () =>{
            const buffers = {stdout: "", stdErr: ""}

            try {
              const sandbox = await getSandbox(sandboxId);
              const result = await sandbox.commands.run(command, {
                onStdout: (data: string)=>{
                  buffers.stdout += data;
                },
                onStderr: (err: string)=>{
                  buffers.stdErr += err;
                }
              });

            } catch (error) {
              console.error(`Command failed ${error}\n stdout ${buffers.stdout}\n stderr : ${buffers.stdErr}`);
              return `Command failed ${error}\n stdout ${buffers.stdout}\n stderr : ${buffers.stdErr}`;
            }
          })
        }
      }),
      createTool({
        name: "Create or update file in the sandbox",
        description: "Create or update a file in the sandbox.",
        parameters: z.object({
          files: z.array(
            z.object({
              path: z.string().describe("The path of the file to create or update"),
              content: z.string().describe("The content of the file")
            }),
          )
        }),
        handler: async ({files},{step, network})=>{
            const newFiles = await step?.run("create-update-files", async ()=>{
            try {
              const updateFiles = network.state.data.files || {};
              const sandbox = await getSandbox(sandboxId)

              for(const file of files){
                await sandbox.files.write(file.path, file.content);
                updateFiles[file.path] = file.content;
              }
              
              return updateFiles;
            } catch (error) {
              return `Failed to create or update files ${error}`;
            }
          })

          if(typeof newFiles === "object"){
            network.state.data.files = newFiles;
          }
        }
      }),

      createTool({
        name: "Read file from sandbox",
        description: "Read a file from the sandbox",
        parameters: z.object({
          files: z.array(z.string()).describe("The path of the file to read")
        }),
        handler: async({files}, {step})=>{
          return await step?.run("read-files", async ()=>{
            try {
              const contents = []
              const sandbox = await getSandbox(sandboxId);
              
              for(const filePath of files){
                const content = await sandbox.files.read(filePath);
                contents.push({path: filePath, content});
              }

              return JSON.stringify(contents);
            } catch (error) {
              return `Error reading files ${error}`;
              
            }
          })
        }
      })
    ]
  })
    const {output} = await codeAgent.run(`${event.data.value}`)

    const sandboxUrl = await step.run("get-sandbox-url", async ()=>{
      const sandbox = await getSandbox(sandboxId);
      const host = sandbox.getHost(3000);
      return `http://${host}`;
    })
  
    
    
    return  {output, sandboxUrl}
  },
);