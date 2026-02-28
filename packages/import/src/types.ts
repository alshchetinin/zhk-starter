export interface RelationMapping {
  /** Field name in import data (e.g., "external_project_id") */
  sourceKey: string;
  /** Drizzle table to look up the FK in */
  lookupTable: string;
  /** Column to search by in lookup table (default: "externalId") */
  lookupColumn?: string;
  /** Target column to set on the entity (e.g., "projectId") */
  targetColumn: string;
}

export interface TableImportResult {
  table: string;
  inserted: number;
  updated: number;
  deleted: number;
}

export interface ImportResult {
  success: boolean;
  results: TableImportResult[];
  error?: string;
}
