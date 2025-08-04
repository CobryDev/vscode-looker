import { z } from "zod";
import { lookmlParameterSchema, LookmlParameter } from "./base.schema";

const filterParameterData: LookmlParameter[] = [
  {
    name: "type",
    description: "Specifies the data type of the filter.",
    documentation:
      "The data type of the filter, which can be 'string', 'number', 'date', or 'yesno'. This determines the filter control shown to the user.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-field-type-for-filter",
  },
  {
    name: "default_value",
    description: "Specifies a default value for the filter.",
    documentation:
      "Sets a default value that will be pre-populated in the filter control in the UI.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-field-default-value",
  },
  {
    name: "suggest_dimension",
    description: "Specifies a dimension to populate filter suggestions.",
    documentation:
      "Populates filter suggestions for this filter field using the values from a specified dimension.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-field-suggest-dimension",
  },
  {
    name: "suggest_persist_for",
    description: "Sets the cache duration for filter suggestions.",
    documentation:
      "Specifies how long Looker should cache the suggestions for this filter. Defaults to '6 hours'.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-field-suggest-persist-for",
  },
  {
    name: "suggestions",
    description: "Populates suggestions from a hardcoded list.",
    documentation:
      "Provides a fixed list of suggestion values for the filter, instead of querying a dimension.",
    type: "list",
    link: "https://cloud.google.com/looker/docs/reference/param-field-suggestions",
  },
  {
    name: "description",
    description: "Adds a description to the filter field.",
    documentation:
      "Provides additional information to users about the filter, visible on hover.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-field-description",
  },
  {
    name: "label",
    description: "Specifies how the filter will appear in the field picker.",
    documentation:
      "Overrides the default display name of the filter in the UI.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-field-label",
  },
];

export const filterParameters = z
  .array(lookmlParameterSchema)
  .parse(filterParameterData);
