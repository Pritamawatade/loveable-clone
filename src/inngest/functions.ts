import { createAgent, createNetwork, createTool, openai, type Tool } from "@inngest/agent-kit";
import { inngest } from "./client";
import { Sandbox } from "e2b"
import { getSandbox, lastAssistantTextMessageContent } from "./utils";
import z, { array } from "zod";
import { PROMPT } from "@/prompt";
import prisma from "@/lib/db";


interface AgentState{
  summary: string,
  files: {[path: string]: string}
}
export const codeAgentFunction = inngest.createFunction(
  { id: "code-agent" },
  { event: "code-agent/run" },
  async ({ event, step }) => {

    const sandboxId = await step.run("get-sandboxId", async () => {
      const sandbox = await Sandbox.create("3c626no0oswu49azse48")
      return sandbox.sandboxId;
    })

    const codeAgent = createAgent<AgentState>({
      name: "AI Agent",
      description: "An AI agent that writes code",
      system: PROMPT,
      model: openai({
        model: "gpt-4.1", defaultParameters: { temperature: 0.1 }
      }),
      tools: [
        createTool({
          name: "terminal",
          description: "Use the terminal to run commands",
          parameters: z.object({
            command: z.string().describe("The command to run in the terminal")
          }),
          handler: async ({ command }, { step }) => {
            return await step?.run("terminal", async () => {
              const buffers = { stdout: "", stdErr: "" }

              try {
                const sandbox = await getSandbox(sandboxId);
                const result = await sandbox.commands.run(command, {
                  onStdout: (data: string) => {
                    buffers.stdout += data;
                  },
                  onStderr: (err: string) => {
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
          name: "creatrOrUpdateFiles",
          description: "Create or update a file in the sandbox.",
          parameters: z.object({
            files: z.array(
              z.object({
                path: z.string().describe("The path of the file to create or update"),
                content: z.string().describe("The content of the file")
              }),
            )
          }),
          handler: async ({ files }, { step, network }: Tool.Options<AgentState>) => {
            const newFiles = await step?.run("create-update-files", async () => {
              try {
                const updateFiles = network.state.data.files || {};
                const sandbox = await getSandbox(sandboxId)

                for (const file of files) {
                  await sandbox.files.write(file.path, file.content);
                  updateFiles[file.path] = file.content;
                }

                return updateFiles;
              } catch (error) {
                return `Failed to create or update files ${error}`;
              }
            })

            if (typeof newFiles === "object") {
              network.state.data.files = newFiles;
            }
          }
        }),

        createTool({
          name: "readFiles",
          description: "Read a file from the sandbox",
          parameters: z.object({
            files: z.array(z.string()).describe("The path of the file to read")
          }),
          handler: async ({ files }, { step }) => {
            return await step?.run("read-files", async () => {
              try {
                const contents = []
                const sandbox = await getSandbox(sandboxId);

                for (const filePath of files) {
                  const content = await sandbox.files.read(filePath);
                  contents.push({ path: filePath, content });
                }

                return JSON.stringify(contents);
              } catch (error) {
                return `Error reading files ${error}`;

              }
            })
          }
        })
      ],
      lifecycle: {
        onResponse: async ({ result, network }) => {
          const lastAssistantMessageText = lastAssistantTextMessageContent(result);
          if (lastAssistantMessageText && network) {
            if (lastAssistantMessageText.includes("<task_summary>")) {
              network.state.data.summary = lastAssistantMessageText;
            }
          }

          return result;
        }
      }
    })

    const network = createNetwork<AgentState>({
      name: "coding-agent-network",
      agents: [codeAgent],
      maxIter: 10,
      router: async ({ network }) => {
        if (network.state.data.summary) {
          return;
        }

        return codeAgent;
      }
    })

    const result = await network.run(event.data.value);

    const isError = !result.state.data.summary || Object.keys(result.state.data.files || {}).length === 0;

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);
      const host = sandbox.getHost(3000);
      return `http://${host}`;
    })


    await step.run("save-result", async () => {
      if(isError){

        return await prisma.message.create({
          data:{
            role: "ASSISTANT",
            type: "RESULT",
            content: `Something went wrong please try again. The agent failed to produce a result. Summary: ${result.state.data.summary || "No summary"} Files: ${JSON.stringify(result.state.data.files || {})}.`
          }
        })

      }
      return await prisma.message.create({
        data: {
          content: result.state.data.summary || "No summary",
          role: "ASSISTANT",
          type: "RESULT",
          fragments: {
            create: {
              sandboxUrl: sandboxUrl,
              title: "Sandbox URL",
              files: result.state.data.files
            }
          }
        }
      })
    })


    return {
      url: sandboxUrl,
      title: "Fragment",
      files: network.state.data.files,
      summary: network.state.data.summary || "No summary available"
    }
  },
);