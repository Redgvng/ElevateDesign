import { z } from "zod";

export const CreateProjectInputSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(120),
});

export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;
