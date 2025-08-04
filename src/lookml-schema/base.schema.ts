import { z } from "zod";

/**
 * Defines the schema for a single LookML parameter definition.
 * This is our single source of truth for what constitutes a valid parameter in our system.
 */
export const lookmlParameterSchema = z.object({
  name: z.string().describe("The literal name of the parameter, e.g., 'label'"),
  description: z
    .string()
    .describe("A brief, one-line description for the autocomplete detail."),
  documentation: z
    .string()
    .describe(
      "A longer, more detailed description for the documentation panel."
    ),
  type: z
    .enum(["string", "sql_block", "list", "boolean", "unquoted", "number"])
    .describe("The expected value type."),
  required: z
    .boolean()
    .optional()
    .describe("Whether the parameter is required."),
  deprecated: z
    .boolean()
    .optional()
    .describe("Whether the parameter is deprecated and should be avoided."),
  link: z
    .string()
    .url()
    .optional()
    .describe("An optional link to the official documentation."),
});

/**
 * This uses Zod's inference to create a TypeScript type automatically from our schema.
 * We will use this type throughout the application instead of a manually-defined interface.
 */
export type LookmlParameter = z.infer<typeof lookmlParameterSchema>;
