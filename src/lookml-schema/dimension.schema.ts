import { z } from "zod";
import { lookmlParameterSchema, LookmlParameter } from "./base.schema";

const dimensionParameterData: LookmlParameter[] = [
  // Core Parameters
  {
    name: "type",
    description: "Specifies the data type of the dimension.",
    documentation:
      "The type of data for the dimension. Common types include string, number, time, and location. This affects how data is queried and displayed.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-field-type-for-dimension",
  },
  {
    name: "sql",
    description: "Defines the SQL expression for the dimension.",
    documentation:
      "The SQL expression that defines the value of the dimension. This can be a simple column name or a complex transformation.",
    type: "sql_block",
    link: "https://cloud.google.com/looker/docs/reference/param-field-sql",
  },
  {
    name: "primary_key",
    description: "Specifies this dimension as the primary key for the view.",
    documentation:
      "When set to 'yes', this dimension is designated as the primary key, which must contain unique, non-null values. This enables Looker to optimize queries and handle joins correctly.",
    type: "boolean",
    link: "https://cloud.google.com/looker/docs/reference/param-field-primary-key",
  },

  // Display & Formatting
  {
    name: "label",
    description: "Specifies how the dimension will appear in the field picker.",
    documentation:
      "Overrides the default display name of the dimension in the UI.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-field-label",
  },
  {
    name: "group_label",
    description:
      "Groups dimensions under a common heading in the field picker.",
    documentation:
      "Creates a collapsible group for this field and others with the same group label, helping to organize the field picker.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-field-group-label",
  },
  {
    name: "description",
    description: "Adds a description to the dimension, visible on hover.",
    documentation:
      "Provides additional information to users about the dimension, visible when they hover over the field name in the Explore UI.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-field-description",
  },
  {
    name: "hidden",
    description: "Hides the dimension from the field picker.",
    documentation:
      "When set to 'yes', the dimension will not be displayed in the UI, but can still be referenced in LookML.",
    type: "boolean",
    link: "https://cloud.google.com/looker/docs/reference/param-field-hidden",
  },
  {
    name: "value_format",
    description: "Specifies a format string for number and time dimensions.",
    documentation:
      "Applies formatting to the dimension's values using Excel-style format strings, such as '$#,##0.00' or 'yyyy-mm-dd'.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-field-value-format",
  },
  {
    name: "html",
    description: "Defines custom HTML to render the dimension's value.",
    documentation:
      "Allows for advanced formatting and functionality by rendering the dimension's value within a custom HTML block. Can be used to add images, links, or styles.",
    type: "sql_block",
    link: "https://cloud.google.com/looker/docs/reference/param-field-html",
  },

  // Interactive Features
  {
    name: "action",
    description: "Creates a Data Action for the dimension.",
    documentation:
      "Defines a Data Action, allowing users to perform tasks in other tools directly from Looker, using the value of this dimension as a payload.",
    type: "unquoted",
    link: "https://cloud.google.com/looker/docs/reference/param-field-action",
  },
  {
    name: "link",
    description: "Adds a link to the dimension.",
    documentation:
      "Makes the dimension's value a clickable link, which can point to other Looks, Dashboards, or external URLs.",
    type: "unquoted",
    link: "https://cloud.google.com/looker/docs/reference/param-field-link",
  },

  // Filtering & Suggestions
  {
    name: "can_filter",
    description: "Specifies whether the dimension can be used as a filter.",
    documentation:
      "When set to 'no', prevents users from filtering on this dimension in the Explore UI. Defaults to 'yes'.",
    type: "boolean",
    link: "https://cloud.google.com/looker/docs/reference/param-field-can-filter",
  },
  {
    name: "suggest_dimension",
    description: "Specifies a dimension to use for filter suggestions.",
    documentation:
      "Populates filter suggestions for this dimension using the values from another dimension. Useful for providing suggestions on a free-text field.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-field-suggest-dimension",
  },
];

export const dimensionParameters = z
  .array(lookmlParameterSchema)
  .parse(dimensionParameterData);
