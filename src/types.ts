/**
 * Result type for Neo4j queries
 * @template T - Type of the result object
 */
export type Neo4jResult<T> = {
  records: Array<{
    toObject(): T;
  }>;
};

/**
 * Type for the transaction object used in Neo4j session
 */
export interface Transaction {
  run<T = Record<string, any>>(
    cypher: string,
    params?: Record<string, any>
  ): Promise<Neo4jResult<T>>;
}

/**
 * Type for the Neo4j session
 */
export interface Session {
  executeRead<T>(
    callback: (tx: Transaction) => Promise<Neo4jResult<T>>
  ): Promise<Neo4jResult<T>>;

  executeWrite<T>(
    callback: (tx: Transaction) => Promise<Neo4jResult<T>>
  ): Promise<Neo4jResult<T>>;

  close(): Promise<void>;
}

/**
 * Type for the Neo4j driver
 */
export interface Driver {
  session(): Session;
}
