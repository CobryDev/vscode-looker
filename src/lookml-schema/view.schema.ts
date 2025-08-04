import { z } from "zod";
import { lookmlParameterSchema, LookmlParameter } from "./base.schema";

const viewParameterData: LookmlParameter[] = [
  // Structural Parameters
  {
    name: "view",
    description: "Creates a view definition.",
    documentation:
      "The view parameter creates a view in LookML. Views are the foundation of LookML and define how to access and present data from database tables.",
    type: "unquoted",
    link: "https://cloud.google.com/looker/docs/reference/param-view",
  },
  {
    name: "drill_fields",
    description:
      "Specifies the default list of fields shown when drilling into measures.",
    documentation:
      "The drill_fields parameter defines which fields are shown by default when users drill down from measures in this view. This provides a consistent drill experience across all measures in the view.",
    type: "list",
    link: "https://cloud.google.com/looker/docs/reference/param-view-drill-fields",
  },
  {
    name: "extends",
    description: "Specifies view(s) that will be extended by this view.",
    documentation:
      "The extends parameter allows this view to inherit all the parameters and fields from one or more other views. This enables code reuse and maintaining consistency across related views.",
    type: "list",
    link: "https://cloud.google.com/looker/docs/reference/param-view-extends",
  },
  {
    name: "extension",
    description:
      "Specifies that the view requires extension and cannot be exposed to users.",
    documentation:
      "The extension parameter marks a view as a template that must be extended by other views. Extension views cannot be used directly in explores and serve as base templates for other views.",
    type: "boolean",
    link: "https://cloud.google.com/looker/docs/reference/param-view-extension",
  },
  {
    name: "include",
    description: "Adds files to a view.",
    documentation:
      "The include parameter allows you to include other LookML files in the current view file, making their definitions available for use.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-include",
  },
  {
    name: "test",
    description: "Creates a data test to verify your model's logic.",
    documentation:
      "The test parameter creates data tests that verify your model's logic. These tests can check data quality, relationships, and business rules. Projects can require data tests before deployment.",
    type: "unquoted",
    link: "https://cloud.google.com/looker/docs/reference/param-test",
  },
  {
    name: "set",
    description:
      "Defines a set of dimensions and measures to be used in other parameters.",
    documentation:
      "The set parameter creates a named collection of dimensions and measures that can be referenced in other parameters like drill_fields or in explores.",
    type: "unquoted",
    link: "https://cloud.google.com/looker/docs/reference/param-set",
  },

  // Display Parameters
  {
    name: "label",
    description: "Specifies how the view name will appear in the field picker.",
    documentation:
      "The label parameter is used to change how a view's name appears in the field picker. If no label is specified, the view name is shown by default.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-view-label",
  },
  {
    name: "fields_hidden_by_default",
    description: "When set to yes, hides all fields in the view by default.",
    documentation:
      "Added in 21.12. When set to yes, this parameter hides all fields in the view by default. Use the hidden: no parameter on individual fields to display them. This is useful for views with many fields where you want to selectively expose only specific ones.",
    type: "boolean",
    link: "https://cloud.google.com/looker/docs/reference/param-view-fields-hidden-by-default",
  },

  // Filter Parameters
  {
    name: "suggestions",
    description:
      "Enables or disables suggestions for all dimensions on this view.",
    documentation:
      "When set to yes, Looker will generate query suggestions for this view in the Explore interface. This helps users discover relevant queries and insights.",
    type: "boolean",
    link: "https://cloud.google.com/looker/docs/reference/param-view-suggestions",
  },

  // Query Parameters
  {
    name: "required_access_grants",
    description:
      "Limits access to the view to only users with matching access grants.",
    documentation:
      "The required_access_grants parameter restricts access to this view to only users whose user attribute values match the specified access grants. This provides row-level security and data governance.",
    type: "list",
    link: "https://cloud.google.com/looker/docs/reference/param-view-required-access-grants",
  },
  {
    name: "sql_table_name",
    description: "Changes the SQL table on which a view is based.",
    documentation:
      "Use this parameter to specify a database table. You can use the form `schema.table` if necessary. If not provided, Looker assumes the table name is the same as the view name.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-view-sql-table-name",
  },

  // Derived Table Parameters
  {
    name: "derived_table",
    description: "Bases a view on a derived table.",
    documentation:
      "A derived table is a query whose results are used as if it were a physical table in the database. This parameter defines it using LookML terms and can include subparameters for SQL, persistence, and optimization.",
    type: "unquoted",
    link: "https://cloud.google.com/looker/docs/reference/param-view-derived-table",
  },
  {
    name: "cluster_keys",
    description: "Specifies that a PDT be clustered by one or more fields.",
    documentation:
      "The cluster_keys parameter optimizes query performance by clustering the persistent derived table (PDT) data by specified fields. Supported in BigQuery and Snowflake.",
    type: "list",
    link: "https://cloud.google.com/looker/docs/reference/param-view-cluster-keys",
  },
  {
    name: "create_process",
    description:
      "Specifies an ordered sequence of steps to create a PDT with custom DDL.",
    documentation:
      "The create_process parameter allows you to define custom DDL commands for creating PDTs on database dialects that require special handling. This parameter has the subparameter sql_step.",
    type: "unquoted",
    link: "https://cloud.google.com/looker/docs/reference/param-view-create-process",
  },
  {
    name: "datagroup_trigger",
    description:
      "Specifies the datagroup to use for the PDT rebuilding policy.",
    documentation:
      "The datagroup_trigger parameter links a PDT to a datagroup, which determines when the table should be rebuilt based on ETL schedules or data freshness requirements.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-view-datagroup-trigger",
  },
  {
    name: "distribution",
    description: "Sets the distribution key of a PDT in Redshift or Aster.",
    documentation:
      "The distribution parameter specifies how data should be distributed across nodes in Redshift or Aster databases for optimal query performance.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-view-distribution",
  },
  {
    name: "distribution_style",
    description: "Sets the distribution style of a PDT in Redshift.",
    documentation:
      "The distribution_style parameter controls how Redshift distributes data across compute nodes. Options include KEY, ALL, or EVEN distribution styles.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-view-distribution-style",
  },
  {
    name: "explore_source",
    description: "Defines a native derived table based on an Explore.",
    documentation:
      "The explore_source parameter creates a derived table from an existing Explore, allowing you to use Looker's modeling layer to generate complex SQL queries.",
    type: "unquoted",
    link: "https://cloud.google.com/looker/docs/reference/param-view-explore-source",
  },
  {
    name: "increment_key",
    description: "Makes the derived table into an incremental PDT.",
    documentation:
      "Added in 21.4. The increment_key makes the derived table incremental, specifying the time increment for which fresh data should be queried and appended to the PDT instead of rebuilding the entire table.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-view-increment-key",
  },
  {
    name: "increment_offset",
    description:
      "Specifies rebuild periods for incremental PDTs to account for late data.",
    documentation:
      "Added in 21.4. Used with increment_key for incremental PDTs. The increment_offset specifies how many previous time periods should be rebuilt to account for late arriving data.",
    type: "number",
    link: "https://cloud.google.com/looker/docs/reference/param-view-increment-offset",
  },
  {
    name: "interval_trigger",
    description: "Specifies a rebuild schedule for a persistent derived table.",
    documentation:
      "Added in 21.20. The interval_trigger specifies a rebuild schedule for a PDT in the format 'N (seconds | minutes | hours)', providing time-based refresh control.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-view-interval-trigger",
  },
  {
    name: "materialized_view",
    description:
      "Creates a materialized view on your database for a derived table.",
    documentation:
      "Added in 21.10. The statement materialized_view: yes creates a materialized view on your database for the derived table, leveraging database-native materialized view capabilities for better performance.",
    type: "boolean",
    link: "https://cloud.google.com/looker/docs/reference/param-view-materialized-view",
  },
  {
    name: "indexes",
    description:
      "Sets the indexes for a PDT in traditional databases or interleaved sort keys in Redshift.",
    documentation:
      "The indexes parameter creates database indexes on the PDT for improved query performance in traditional databases like MySQL and Postgres, or sets interleaved sort keys in Redshift.",
    type: "list",
    link: "https://cloud.google.com/looker/docs/reference/param-view-indexes",
  },
  {
    name: "partition_keys",
    description: "Specifies that a PDT be partitioned by one or more fields.",
    documentation:
      "The partition_keys parameter partitions the PDT by specified fields in Presto, or by a single date/time field in BigQuery, improving query performance for large datasets.",
    type: "list",
    link: "https://cloud.google.com/looker/docs/reference/param-view-partition-keys",
  },
  {
    name: "persist_for",
    description: "Sets the maximum age of a PDT before it is regenerated.",
    documentation:
      "The persist_for parameter controls how long a PDT is cached before being rebuilt. This balances data freshness with query performance and resource usage.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-view-persist-for",
  },
  {
    name: "publish_as_db_view",
    description:
      "Creates a stable database view for the PDT to enable external querying.",
    documentation:
      "The statement publish_as_db_view: yes creates a stable database view for the PDT, enabling other systems to query the table outside of Looker using a consistent view name.",
    type: "boolean",
    link: "https://cloud.google.com/looker/docs/reference/param-view-publish-as-db-view",
  },
  {
    name: "sortkeys",
    description: "Sets the sort keys of a PDT in Redshift.",
    documentation:
      "The sortkeys parameter specifies which columns should be used as sort keys in Redshift PDTs, optimizing query performance for commonly filtered or joined columns.",
    type: "list",
    link: "https://cloud.google.com/looker/docs/reference/param-view-sortkeys",
  },
  {
    name: "sql",
    description: "Declares the SQL query for a derived table.",
    documentation:
      "The sql parameter within derived_table defines the SQL query that generates the derived table's data. This SQL can reference other views and use Looker's liquid templating.",
    type: "sql_block",
    link: "https://cloud.google.com/looker/docs/reference/param-view-sql",
  },
  {
    name: "sql_create",
    description:
      "Defines a SQL CREATE statement for PDTs requiring custom DDL.",
    documentation:
      "The sql_create parameter allows you to define custom CREATE TABLE statements for PDTs on database dialects that require specific DDL commands for optimal performance.",
    type: "sql_block",
    link: "https://cloud.google.com/looker/docs/reference/param-view-sql-create",
  },
  {
    name: "sql_trigger_value",
    description: "Specifies the condition that causes a PDT to be regenerated.",
    documentation:
      "The sql_trigger_value parameter defines a SQL expression that, when its result changes, triggers the PDT to be rebuilt. This provides flexible, data-driven refresh logic.",
    type: "sql_block",
    link: "https://cloud.google.com/looker/docs/reference/param-view-sql-trigger-value",
  },
  {
    name: "table_compression",
    description:
      "Specifies the table compression to use for a PDT in Amazon Athena.",
    documentation:
      "The table_compression parameter controls compression settings for PDTs created in Amazon Athena, optimizing storage and query performance.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-view-table-compression",
  },
  {
    name: "table_format",
    description:
      "Specifies the table format to use for a PDT in Amazon Athena.",
    documentation:
      "The table_format parameter defines the file format (such as Parquet, ORC, or JSON) for PDTs created in Amazon Athena, affecting performance and compatibility.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-view-table-format",
  },

  // Refinement Parameters
  {
    name: "final",
    description:
      "Indicates that the current refinement is the final refinement allowed.",
    documentation:
      "The final parameter marks a view refinement as the last one allowed in the refinement chain, preventing further refinements. See the LookML refinements documentation for more information.",
    type: "boolean",
    link: "https://cloud.google.com/looker/docs/reference/param-view-final",
  },

  // Field Definition Parameters (these are typically sub-parameters within views)
  {
    name: "dimension_group",
    description:
      "Creates a group of time-based dimensions from a single database column.",
    documentation:
      "A dimension group allows you to easily create multiple time-based dimensions (like year, month, day) from a single timestamp or date column.",
    type: "unquoted",
    link: "https://cloud.google.com/looker/docs/reference/param-field-dimension-group",
  },
  {
    name: "measure",
    description: "Defines a measure field for aggregations.",
    documentation:
      "Measures are aggregations computed on data in your database. Common measures include count, sum, average, min, and max.",
    type: "unquoted",
    link: "https://cloud.google.com/looker/docs/reference/param-field-measure",
  },
  {
    name: "dimension",
    description: "Defines a dimension field for grouping and filtering.",
    documentation:
      "Dimensions are attributes or characteristics of data that can be used for grouping, filtering, and pivoting in Looker.",
    type: "unquoted",
    link: "https://cloud.google.com/looker/docs/reference/param-field-dimension",
  },
  {
    name: "filter",
    description:
      "Defines a filter-only field that doesn't appear in query results.",
    documentation:
      "Filters are special fields that can be used to filter data but don't appear as columns in query results. They're useful for creating parameterized queries.",
    type: "unquoted",
    link: "https://cloud.google.com/looker/docs/reference/param-field-filter",
  },
  {
    name: "parameter",
    description: "Defines a parameter that can be used in liquid variables.",
    documentation:
      "Parameters are user-input fields that can be referenced in liquid variables throughout the LookML. They allow for dynamic queries based on user input.",
    type: "unquoted",
    link: "https://cloud.google.com/looker/docs/reference/param-field-parameter",
  },

  // Deprecated Parameters
  {
    name: "distkey",
    description: "Replaced by distribution parameter.",
    documentation:
      "The distkey parameter has been deprecated and replaced by the distribution parameter. Use distribution instead for setting distribution keys in Redshift.",
    type: "string",
    deprecated: true,
    link: "https://cloud.google.com/looker/docs/reference/param-view-distribution",
  },
  {
    name: "view_label",
    description: "Avoid - replaced by label parameter.",
    documentation:
      "The view_label parameter should be avoided as of version 4.4. Use the label parameter instead for specifying how the view name appears in the field picker.",
    type: "string",
    deprecated: true,
    link: "https://cloud.google.com/looker/docs/reference/param-view-label",
  },
];

/**
 * We parse the raw data against our schema. This serves two purposes:
 * 1. It validates our own definitions, catching typos or structural errors early.
 * 2. It ensures the exported constant strictly conforms to our defined schema.
 */
export const viewParameters = z
  .array(lookmlParameterSchema)
  .parse(viewParameterData);
