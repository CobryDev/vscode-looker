import { z } from "zod";
import { lookmlParameterSchema, LookmlParameter } from "./base.schema";

const exploreParameterData: LookmlParameter[] = [
  // Core Parameters
  {
    name: "from",
    description: "Specifies the starting view for an explore.",
    documentation:
      "Defines the view that will serve as the base for the explore, from which all joins are made. If omitted, it assumes a view with the same name as the explore.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-explore-from",
  },
  {
    name: "view_name",
    description:
      "Specifies the starting view for an explore (alternative to 'from').",
    documentation:
      "An alternative to 'from' that defines the base view for the explore. If both are present, 'from' takes precedence.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-explore-view-name",
  },
  {
    name: "join",
    description: "Defines a join relationship to another view.",
    documentation:
      "Creates a join from the explore's base view to another view. Requires sub-parameters like 'type', 'relationship', and a join condition ('sql_on' or 'foreign_key').",
    type: "unquoted",
    link: "https://cloud.google.com/looker/docs/reference/param-explore-join",
  },

  // Display Parameters
  {
    name: "label",
    description: "Specifies how the explore will appear in the Explore menu.",
    documentation:
      "Overrides the default display name of the explore in the UI.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-explore-label",
  },
  {
    name: "group_label",
    description: "Groups explores under a common heading in the Explore menu.",
    documentation:
      "Creates a collapsible group for this explore and others with the same group label, helping to organize the UI.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-explore-group-label",
  },
  {
    name: "description",
    description: "Adds a description to the explore, visible to users.",
    documentation:
      "Provides additional information to users about the purpose of the explore, visible at the top of the Explore page.",
    type: "string",
    link: "https://cloud.google.com/looker/docs/reference/param-explore-description",
  },
  {
    name: "hidden",
    description: "Hides the explore from the Explore menu.",
    documentation:
      "When set to 'yes', the explore will not be visible to users in the UI, but its LookML can still be referenced.",
    type: "boolean",
    link: "https://cloud.google.com/looker/docs/reference/param-explore-hidden",
  },

  // Filtering & Querying
  {
    name: "always_filter",
    description: "Requires users to provide a filter for a specified field.",
    documentation:
      "Forces users to include a filter on one or more fields before they can run a query. This is often used to limit query size on very large tables.",
    type: "unquoted",
    link: "https://cloud.google.com/looker/docs/reference/param-explore-always-filter",
  },
  {
    name: "conditionally_filter",
    description:
      "Requires a filter for one field if another field is not used.",
    documentation:
      "A more flexible version of 'always_filter' that enforces filter requirements only under certain conditions, such as when a user does not select a field from a list.",
    type: "unquoted",
    link: "https://cloud.google.com/looker/docs/reference/param-explore-conditionally-filter",
  },
  {
    name: "sql_always_where",
    description: "Applies a permanent SQL WHERE clause to all queries.",
    documentation:
      "Adds a SQL condition to the WHERE clause of every query run from this explore. This condition cannot be removed by users and is used for permanent data restriction.",
    type: "sql_block",
    link: "https://cloud.google.com/looker/docs/reference/param-explore-sql-always-where",
  },
  {
    name: "sql_always_having",
    description: "Applies a permanent SQL HAVING clause to all queries.",
    documentation:
      "Adds a SQL condition to the HAVING clause of every query, allowing you to filter on the results of aggregate functions. This condition cannot be removed by users.",
    type: "sql_block",
    link: "https://cloud.google.com/looker/docs/reference/param-explore-sql-always-having",
  },

  // Extension & Refinement
  {
    name: "extends",
    description: "Specifies explore(s) that will be extended by this explore.",
    documentation:
      "Allows this explore to inherit all the parameters and joins from one or more other explores, enabling code reuse.",
    type: "list",
    link: "https://cloud.google.com/looker/docs/reference/param-explore-extends",
  },
  {
    name: "extension",
    description: "Specifies that the explore requires extension.",
    documentation:
      "Marks an explore as a template that must be extended by other explores. Extension explores cannot be used directly.",
    type: "boolean",
    link: "https://cloud.google.com/looker/docs/reference/param-explore-extension",
  },
];

export const exploreParameters = z
  .array(lookmlParameterSchema)
  .parse(exploreParameterData);
