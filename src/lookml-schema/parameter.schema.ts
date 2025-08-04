import { z } from "zod";
import { lookmlParameterSchema, LookmlParameter } from "./base.schema";

const parameterParameterData: LookmlParameter[] = [
  {
    name: "type",
    description: "Specifies the data type of the parameter.",
    documentation:
      "The data type of the parameter. Can be 'string', 'number', 'date', etc., but also special types like 'unquoted' or 'yesno' that affect Liquid variable handling.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-field-type-for-parameter",
  },
  {
    name: "default_value",
    description: "Specifies a default value for the parameter.",
    documentation:
      "Sets a default value that will be pre-populated in the filter control for this parameter.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-field-default-value",
  },
  {
    name: "allowed_value",
    description: "Defines a set of allowed values for the parameter.",
    documentation:
      "Restricts user input to a predefined set of values, creating a dropdown list in the UI. Each allowed_value has a 'label' and a 'value'.",
    type: "unquoted",
    link: "https://cloud.google.com/looker/docs/reference/param-field-allowed-value",
  },
  {
    name: "description",
    description: "Adds a description to the parameter field.",
    documentation:
      "Provides additional information to users about the parameter, visible on hover.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-field-description",
  },
  {
    name: "label",
    description: "Specifies how the parameter will appear in the UI.",
    documentation:
      "Overrides the default display name of the parameter in the UI.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-field-label",
  },
];

export const parameterParameters = z
  .array(lookmlParameterSchema)
  .parse(parameterParameterData);
