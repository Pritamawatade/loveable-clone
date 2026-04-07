import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import z from "zod";
import {generateSlug} from "random-word-slugs"
export const projectsRouter = createTRPCRouter({
    create: baseProcedure
        .input(
            z.object({
                value: z.string()
                .min(1, {error:"Value is required"})
                .max(10000, {error: "Prompt is too long"})
                .describe("The message to send to the AI")
            })
        )
        .mutation(async ({ input }) => {
            const createdProject = await prisma.project.create({
                data:{
                    name: generateSlug(2, {format: 'kebab'}),
                    messages:{
                        create:{
                            content: input.value,
                            role: "USER",
                            type: "RESULT"
                        }
                    }
                }
            })

            await inngest.send({
                name:"code-agent/run",
                data:{
                    value: input.value,
                    projectId: createdProject.id
                }
            })
            return createdProject;
        }),

    getMany: baseProcedure.query(async () => {
        const projects = await prisma.project.findMany({ orderBy: { updatedAt: "asc" }});
        return projects;
    })
})