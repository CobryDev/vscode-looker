import { z } from "zod";
import { lookmlParameterSchema, LookmlParameter } from "./base.schema";

const modelParameterData: LookmlParameter[] = [
  {
    name: "connection",
    description: "Specifies the database connection for this model.",
    documentation:
      "The database connection that all explores in this model will use. The connection must be configured in Looker's admin settings.",
    type: "string",
    required: true,
    link: "https://cloud.google.com/looker/docs/reference/param-model-connection",
  },
  {
    name: "include",
    description: "Includes other LookML files within the scope of this model.",
    documentation:
      "Use this parameter to include view files, dashboard files, or even other model files. Wildcards (*) can be used to include multiple files.",
    type: "string",
    required: true,
    link: "https://cloud.google.com/looker/docs/reference/param-include",
  },
  {
    name: "label",
    description: "Specifies a display name for the model.",
    documentation:
      "The label parameter determines how the model's name appears in the Explore menu and other parts of the Looker UI.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-model-label",
  },
  {
    name: "case_sensitive",
    description: "Specifies whether filters are case-sensitive for this model.",
    documentation:
      "When set to 'yes', filters will be case-sensitive. This setting depends on your database dialect's capabilities. When not specified, it uses the dialect's default setting.",
    type: "boolean",
    link: "https://cloud.google.com/looker/docs/reference/param-model-case-sensitive",
  },
  {
    name: "fiscal_month_offset",
    description: "Sets the month the fiscal year begins.",
    documentation:
      "An integer from 0-11 that offsets the start of the fiscal year from the calendar year (where 0 is January). This allows for fiscal year-based timeframes in dimension groups.",
    type: "number",
    link: "https://cloud.google.com/looker/docs/reference/param-model-fiscal-month-offset",
  },
  {
    name: "week_start_day",
    description: "Sets the starting day of the week for the model.",
    documentation:
      "Specifies the starting day for all week-based timeframes, such as 'monday' or 'sunday'.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-model-week-start-day",
  },
  {
    name: "datagroup",
    description: "Defines a caching policy for the model.",
    documentation:
      "Creates a named datagroup that can be used to define caching and PDT regeneration policies for explores and views within the model.",
    type: "unquoted",
    link: "https://cloud.google.com/looker/docs/reference/param-model-datagroup",
  },
  {
    name: "access_grant",
    description: "Defines an access grant for controlling data access.",
    documentation:
      "Creates a named access grant based on user attributes. This grant can then be used with 'required_access_grants' on explores, joins, or views to restrict access.",
    type: "unquoted",
    link: "https://cloud.google.com/looker/docs/reference/param-model-access-grant",
  },
];

export const modelParameters = z
  .array(lookmlParameterSchema)
  .parse(modelParameterData);
