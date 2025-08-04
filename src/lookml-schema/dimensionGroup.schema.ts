import { z } from "zod";
import { lookmlParameterSchema, LookmlParameter } from "./base.schema";

const dimensionGroupParameterData: LookmlParameter[] = [
  {
    name: "type",
    description: "Specifies the type of the dimension group.",
    documentation:
      "Must be 'time'. This parameter defines the dimension group as a time-based field.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-field-type-for-dimension-group",
  },
  {
    name: "timeframes",
    description: "Specifies the time-based dimensions to generate.",
    documentation:
      "A list of time granularities to create, such as time, date, week, month, quarter, and year.",
    type: "list",
    link: "https://cloud.google.com/looker/docs/reference/param-field-timeframes",
  },
  {
    name: "sql",
    description: "Defines the SQL expression for the time data.",
    documentation:
      "The SQL expression that yields a timestamp, datetime, date, epoch, or yyyymmdd value.",
    type: "sql_block",
    link: "https://cloud.google.com/looker/docs/reference/param-field-sql",
  },
  {
    name: "datatype",
    description: "Specifies the data type of the time column in the database.",
    documentation:
      "Informs Looker of the underlying database column type (e.g., timestamp, datetime, date, epoch) to ensure correct time conversions.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-field-datatype",
  },
  {
    name: "convert_tz",
    description: "Specifies whether to apply timezone conversion.",
    documentation:
      "When set to 'no', disables timezone conversion for this dimension group. Useful for data that is already in the desired timezone.",
    type: "boolean",
    link: "https://cloud.google.com/looker/docs/reference/param-field-convert-tz",
  },
  {
    name: "label",
    description: "Specifies how the dimension group will appear in the UI.",
    documentation:
      "Sets the display name for the group of dimensions in the field picker.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-field-label",
  },
  {
    name: "description",
    description: "Adds a description to the dimension group.",
    documentation:
      "Provides additional information to users about the dimension group, visible on hover.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-field-description",
  },
];

export const dimensionGroupParameters = z
  .array(lookmlParameterSchema)
  .parse(dimensionGroupParameterData);
