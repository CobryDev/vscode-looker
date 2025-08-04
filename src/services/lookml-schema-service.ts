import { viewParameters } from "../lookml-schema/view.schema";
import { dimensionParameters } from "../lookml-schema/dimension.schema";
import { measureParameters } from "../lookml-schema/measure.schema";
import { dimensionGroupParameters } from "../lookml-schema/dimensionGroup.schema";
import { filterParameters } from "../lookml-schema/filter.schema";
import { parameterParameters } from "../lookml-schema/parameter.schema";
import { derivedTableParameters } from "../lookml-schema/derivedTable.schema";
import { joinParameters } from "../lookml-schema/join.schema";
import { exploreParameters } from "../lookml-schema/explore.schema";
import { modelParameters } from "../lookml-schema/model.schema";
import { LookmlParameter } from "../lookml-schema/base.schema";

/**
 * Service responsible for loading and providing access to LookML schema definitions.
 * It acts as a single point of access for all parameter information.
 */
export class LookmlSchemaService {
  private schema: Map<string, LookmlParameter[]>;

  constructor() {
    this.schema = new Map();
    // Load all our defined schemas into the map

    // Core LookML structures
    this.schema.set("model", modelParameters);
    this.schema.set("view", viewParameters);
    this.schema.set("explore", exploreParameters);
    this.schema.set("join", joinParameters);
    this.schema.set("derived_table", derivedTableParameters);

    // Field-level structures
    this.schema.set("dimension", dimensionParameters);
    this.schema.set("measure", measureParameters);
    this.schema.set("dimension_group", dimensionGroupParameters);
    this.schema.set("filter", filterParameters);
    this.schema.set("parameter", parameterParameters);
  }

  /**
   * Gets all valid parameters for a given LookML scope (e.g., 'view').
   */
  public getValidParameters(scope: string): LookmlParameter[] {
    return this.schema.get(scope) || [];
  }
}
