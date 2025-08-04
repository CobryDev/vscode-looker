import { z } from "zod";
import { lookmlParameterSchema, LookmlParameter } from "./base.schema";

const joinParameterData: LookmlParameter[] = [
  // Core Join Logic
  {
    name: "type",
    description: "Specifies the type of SQL join to perform.",
    documentation:
      "Defines the type of join, such as left_outer (default), inner, full_outer, or cross.",
    type: "string",
    required: true,
    link: "https://cloud.google.com/looker/docs/reference/param-join-type",
  },
  {
    name: "relationship",
    description: "Specifies the relationship between the joined views.",
    documentation:
      "Defines the cardinality of the join, such as many_to_one, one_to_one, one_to_many, or many_to_many. This is crucial for Looker to calculate symmetric aggregates correctly.",
    type: "string",
    required: true,
    link: "https://cloud.google.com/looker/docs/reference/param-join-relationship",
  },
  {
    name: "sql_on",
    description: "Defines the join condition using a SQL expression.",
    documentation:
      "Specifies the join condition using a raw SQL expression with ${view_name.field_name} substitutions. Use this or 'foreign_key'.",
    type: "sql_block",
    link: "https://cloud.google.com/looker/docs/reference/param-join-sql-on",
  },
  {
    name: "foreign_key",
    description: "Defines the join based on a foreign key relationship.",
    documentation:
      "Creates a join condition automatically by matching a dimension in the joined view with the primary key of the source view. Use this or 'sql_on'.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-join-foreign-key",
  },

  // Filtering
  {
    name: "access_filter",
    description: "Applies a user attribute-based filter to the join.",
    documentation:
      "Applies a data restriction based on the current user's attributes. This is useful for row-level security.",
    type: "unquoted",
    link: "https://cloud.google.com/looker/docs/reference/param-join-access-filter",
  },
  {
    name: "sql_where",
    description:
      "Applies a filter condition to the joined view before joining.",
    documentation:
      "Adds a WHERE clause to the SQL for the joined view, allowing you to filter the rows of the joined view before the join is performed. This parameter is rarely used.",
    type: "sql_block",
    link: "https://cloud.google.com/looker/docs/reference/param-join-sql-where",
  },

  // Querying and Field Management
  {
    name: "fields",
    description: "Specifies which fields to bring in from the joined view.",
    documentation:
      "A list of fields or sets of fields to include in the Explore from the joined view. By default, all fields are included.",
    type: "list",
    link: "https://cloud.google.com/looker/docs/reference/param-join-fields",
  },
  {
    name: "from",
    description: "Specifies an alias for a view in a join.",
    documentation:
      "Allows you to join the same view multiple times under different aliases. The alias is specified in the 'join' parameter, and 'from' specifies the original view to use.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-join-from",
  },
  {
    name: "view_label",
    description: "Specifies a label for the joined view in the field picker.",
    documentation:
      "Changes the display name of the joined view in the Explore UI, helping to clarify the purpose of the join to business users.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-join-view-label",
  },
  {
    name: "required_joins",
    description:
      "Forces one or more joins to be included in the generated SQL.",
    documentation:
      "Specifies other joins that must be included in the SQL query whenever this join is included, even if the user hasn't selected fields from them.",
    type: "list",
    link: "https://cloud.google.com/looker/docs/reference/param-join-required-joins",
  },
];

export const joinParameters = z
  .array(lookmlParameterSchema)
  .parse(joinParameterData);
