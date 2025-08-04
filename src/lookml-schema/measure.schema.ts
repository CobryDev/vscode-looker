import { z } from "zod";
import { lookmlParameterSchema, LookmlParameter } from "./base.schema";

const measureParameterData: LookmlParameter[] = [
  {
    name: "type",
    description: "Specifies the aggregation type of the measure.",
    documentation:
      "The type of aggregation to perform. Common types include sum, count, average, min, max, and number.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-field-type-for-measure",
  },
  {
    name: "sql",
    description: "Defines the SQL expression to be aggregated.",
    documentation:
      "The SQL expression on which the aggregation function is applied. For example, for a 'sum' measure, this would be the column to sum.",
    type: "sql_block",
    link: "https://cloud.google.com/looker/docs/reference/param-field-sql",
  },
  {
    name: "drill_fields",
    description: "Specifies the fields to show when drilling down.",
    documentation:
      "Defines a custom set of fields to display when a user drills into this measure's value.",
    type: "list",
    link: "https://cloud.google.com/looker/docs/reference/param-field-drill-fields",
  },
  {
    name: "filters",
    description: "Applies a hardcoded filter to the measure.",
    documentation:
      "Adds a filter condition directly to the measure's SQL. This is useful for creating filtered versions of a measure, such as 'Count of Paid Orders'.",
    type: "list",
    link: "https://cloud.google.com/looker/docs/reference/param-field-filters",
  },
  // Display & Formatting
  {
    name: "label",
    description: "Specifies how the measure will appear in the field picker.",
    documentation:
      "Overrides the default display name of the measure in the UI.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-field-label",
  },
  {
    name: "value_format_name",
    description: "Applies a predefined format to the measure.",
    documentation:
      "Applies a named format, like 'decimal_0', 'usd', 'percent_2', or 'gbp_0', to the measure's value.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-field-value-format-name",
  },
  {
    name: "hidden",
    description: "Hides the measure from the field picker.",
    documentation:
      "When set to 'yes', the measure will not be displayed in the UI, but can still be referenced in LookML.",
    type: "boolean",
    link: "https://cloud.google.com/looker/docs/reference/param-field-hidden",
  },
  {
    name: "description",
    description: "Adds a description to the measure.",
    documentation:
      "Provides additional information to users about the measure, visible on hover.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-field-description",
  },
];

export const measureParameters = z
  .array(lookmlParameterSchema)
  .parse(measureParameterData);
