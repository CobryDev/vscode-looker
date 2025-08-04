import { z } from "zod";
import { lookmlParameterSchema, LookmlParameter } from "./base.schema";

const derivedTableParameterData: LookmlParameter[] = [
  // Core Definition
  {
    name: "sql",
    description: "Defines the SQL query for the derived table.",
    documentation:
      "The SQL query that will generate the results for the derived table. This query can reference other LookML views and fields.",
    type: "sql_block",
    link: "https://cloud.google.com/looker/docs/reference/param-view-derived-table#sql",
  },
  {
    name: "explore_source",
    description:
      "Creates a native derived table (NDT) from an existing Explore.",
    documentation:
      "Defines a derived table based on an existing Explore, allowing you to leverage Looker's modeling layer to generate the underlying query.",
    type: "unquoted",
    link: "https://cloud.google.com/looker/docs/reference/param-view-derived-table#explore_source",
  },
  {
    name: "create_process",
    description:
      "Specifies custom DDL steps to create a persistent derived table (PDT).",
    documentation:
      "Allows you to define an ordered sequence of SQL DDL statements for creating a PDT, for use with database dialects that require it.",
    type: "unquoted",
    link: "https://cloud.google.com/looker/docs/reference/param-view-derived-table#create_process",
  },

  // Persistence Triggers
  {
    name: "datagroup_trigger",
    description:
      "Specifies the datagroup to use for the PDT rebuilding policy.",
    documentation:
      "Links the PDT to a named datagroup defined in the model file. The PDT will be rebuilt when the datagroup is triggered.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-view-derived-table#datagroup_trigger",
  },
  {
    name: "sql_trigger_value",
    description: "Specifies a SQL query whose result triggers a PDT rebuild.",
    documentation:
      "A SQL query that is run on a schedule. The PDT is rebuilt if the result of the query is different from the previous check.",
    type: "sql_block",
    link: "https://cloud.google.com/looker/docs/reference/param-view-derived-table#sql_trigger_value",
  },
  {
    name: "interval_trigger",
    description: "Specifies a time-based rebuild schedule for a PDT.",
    documentation:
      "Defines a rebuild schedule for a PDT, such as '12 hours' or '30 minutes'.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-view-derived-table#interval_trigger",
  },
  {
    name: "persist_for",
    description: "DEPRECATED. Use a datagroup or interval_trigger instead.",
    documentation:
      "This parameter is not recommended for production use. Use datagroup_trigger or interval_trigger for more robust PDT management.",
    type: "string",
    deprecated: true,
    link: "https://cloud.google.com/looker/docs/reference/param-view-derived-table#persist_for",
  },

  // Incremental PDTs
  {
    name: "increment_key",
    description: "Makes the derived table an incremental PDT.",
    documentation:
      "Specifies a time-based dimension that will be used to incrementally append fresh data to the PDT instead of rebuilding the entire table.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-view-derived-table#increment_key",
  },
  {
    name: "increment_offset",
    description:
      "Specifies the number of previous time periods to rebuild for an incremental PDT.",
    documentation:
      "Used with increment_key to rebuild a specified number of previous periods to account for late-arriving data.",
    type: "number",
    link: "https://cloud.google.com/looker/docs/reference/param-view-derived-table#increment_offset",
  },

  // Optimization & Database Features
  {
    name: "materialized_view",
    description:
      "Creates the derived table as a materialized view on your database.",
    documentation:
      "When set to 'yes', Looker will create a materialized view on your database instead of a standard table, leveraging native database performance features.",
    type: "boolean",
    link: "https://cloud.google.com/looker/docs/reference/param-view-derived-table#materialized_view",
  },
  {
    name: "cluster_keys",
    description: "Specifies columns to cluster the PDT on.",
    documentation:
      "For dialects like BigQuery and Snowflake, this specifies which columns to use for clustering, which can improve query performance.",
    type: "list",
    link: "https://cloud.google.com/looker/docs/reference/param-view-derived-table#cluster_keys",
  },
  {
    name: "partition_keys",
    description: "Specifies columns to partition the PDT by.",
    documentation:
      "For dialects like BigQuery and Presto, this specifies which columns to use for partitioning the table, which can significantly improve performance and reduce query cost.",
    type: "list",
    link: "https://cloud.google.com/looker/docs/reference/param-view-derived-table#partition_keys",
  },
  {
    name: "indexes",
    description: "Specifies column indexes for the PDT.",
    documentation:
      "A list of columns to add a database index to. Supported on most traditional SQL databases.",
    type: "list",
    link: "https://cloud.google.com/looker/docs/reference/param-view-derived-table#indexes",
  },
];

export const derivedTableParameters = z
  .array(lookmlParameterSchema)
  .parse(derivedTableParameterData);
