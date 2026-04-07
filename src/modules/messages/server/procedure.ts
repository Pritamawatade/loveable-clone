import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import z from "zod";

export const messagesRouter = createTRPCRouter({
    create: baseProcedure
        .input(
            z.object({
                value: z.string()
                .min(1, {error:"Value is required"})
                .max(10000, {error: "Prompt is too long"})
                .describe("The message to send to the AI"),
                projectId: z.string()
                    .min(1, {error: "Project id is required"})
            })
        )
        .mutation(async ({ input }) => {
            const createdMessage = await prisma.message.create({
                data: {
                    content: input.value,
                    role: "USER",
                    type: "RESULT",
                    projectId: input.projectId
                }
            });

            await inngest.send({
                name:"code-agent/run",
                data:{
                    value: input.value,
                    projectId: input.projectId
                }
            })
            return createdMessage;
        }),

    getMany: baseProcedure.query(async () => {
        const messages = await prisma.message.findMany({ orderBy: { updatedAt: "asc" }, include: { fragments: true } });
        return messages;
    })
})