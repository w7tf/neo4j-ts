import { Driver } from './types';

export function createNeo4jClient(driver: Driver) {
  /**
   * Execute a read operation on Neo4j
   * @template T - Type of the result object
   * @param cypher - Cypher query to execute
   * @param params - Parameters for the query
   * @returns Array of result objects of type T
   */
  async function read<T = Record<string, any>>(
    cypher: string,
    params: Record<string, any> = {}
  ): Promise<T[]> {
    const session = driver.session();

    try {
      const res = await session.executeRead(tx => tx.run<T>(cypher, params));
      const values = res.records.map(record => record.toObject());
      return values;
    } finally {
      await session.close();
    }
  }

  /**
   * Execute a write operation on Neo4j
   * @template T - Type of the result object
   * @param cypher - Cypher query to execute
   * @param params - Parameters for the query
   * @returns Array of result objects of type T
   */
  async function write<T = Record<string, any>>(
    cypher: string,
    params: Record<string, any> = {}
  ): Promise<T[]> {
    const session = driver.session();

    try {
      const res = await session.executeWrite(tx => tx.run<T>(cypher, params));
      const values = res.records.map(record => record.toObject());
      return values;
    } finally {
      await session.close();
    }
  }

  /**
   * Execute a single-result read operation and return the first item
   * @template T - Type of the result object
   * @param cypher - Cypher query to execute
   * @param params - Parameters for the query
   * @returns The first result object of type T or null if no results
   */
  async function readSingle<T = Record<string, any>>(
    cypher: string,
    params: Record<string, any> = {}
  ): Promise<T | null> {
    const results = await read<T>(cypher, params);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Execute a single-result write operation and return the first item
   * @template T - Type of the result object
   * @param cypher - Cypher query to execute
   * @param params - Parameters for the query
   * @returns The first result object of type T or null if no results
   */
  async function writeSingle<T = Record<string, any>>(
    cypher: string,
    params: Record<string, any> = {}
  ): Promise<T | null> {
    const results = await write<T>(cypher, params);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Create a node in Neo4j
   * @template T - Type of the result including the created node
   * @template P - Type of the node properties
   * @param label - Label for the node
   * @param properties - Properties for the node
   * @param returnAlias - Alias to use in the RETURN statement (default: 'n')
   * @returns The created node
   */
  async function createNode<T = Record<string, any>, P = Record<string, any>>(
    label: string,
    properties: P,
    returnAlias = 'n'
  ): Promise<T | null> {
    const cypher = `
      CREATE (${returnAlias}:${label} $properties)
      RETURN ${returnAlias}
    `;
    return writeSingle<T>(cypher, { properties });
  }

  /**
   * Find nodes by label and properties
   * @template T - Type of the result
   * @template P - Type of the node properties to filter by
   * @param label - Label to search for
   * @param properties - Properties to filter by (optional)
   * @param returnAlias - Alias to use in the RETURN statement (default: 'n')
   * @returns Array of nodes matching the criteria
   */
  async function findNodes<T = Record<string, any>, P = Record<string, any>>(
    label: string,
    properties?: Partial<P>,
    returnAlias = 'n'
  ): Promise<T[]> {
    if (!properties || Object.keys(properties).length === 0) {
      const cypher = `MATCH (${returnAlias}:${label}) RETURN ${returnAlias}`;
      return read<T>(cypher);
    }

    const whereConditions = Object.entries(properties)
      .map(([key, _]) => `${returnAlias}.${key} = $${key}`)
      .join(' AND ');

    const cypher = `
      MATCH (${returnAlias}:${label})
      WHERE ${whereConditions}
      RETURN ${returnAlias}
    `;

    return read<T>(cypher, properties as Record<string, any>);
  }

  /**
   * Create a relationship between two existing nodes
   * @template T - Type of the result
   * @template P - Type of the relationship properties
   * @param startNodeMatch - Cypher expression to match the start node (including parentheses)
   * @param endNodeMatch - Cypher expression to match the end node (including parentheses)
   * @param relationshipType - Type of relationship to create
   * @param properties - Properties for the relationship
   * @returns The created relationship with connected nodes
   */
  async function createRelationship<
    T = Record<string, any>,
    P = Record<string, any>
  >(
    startNodeMatch: string,
    endNodeMatch: string,
    relationshipType: string,
    properties: P = {} as P
  ): Promise<T | null> {
    const cypher = `
      MATCH ${startNodeMatch}
      MATCH ${endNodeMatch}
      CREATE (a)-[r:${relationshipType} $properties]->(b)
      RETURN a, r, b
    `;

    return writeSingle<T>(cypher, { properties });
  }

  /**
   * Execute a batch of operations in a single transaction
   * @template T - Type of the result objects
   * @param operations - Array of operations to execute
   * @returns Array of results, one for each operation
   */
  async function batch<T = Record<string, any>>(
    operations: Array<{
      query: string;
      params?: Record<string, any>;
      isWrite?: boolean;
    }>
  ): Promise<T[][]> {
    const session = driver.session();
    const results: T[][] = [];

    try {
      const needsWrite = operations.some(op => op.query.includes('CREATE'));

      if (needsWrite) {
        await session.executeWrite(async tx => {
          for (const op of operations) {
            const result = await tx.run<T>(op.query, op.params || {});
            results.push(result.records.map(record => record.toObject()));
          }
          return { records: [] }; // Return empty result to satisfy type
        });
      } else {
        await session.executeRead(async tx => {
          for (const op of operations) {
            const result = await tx.run<T>(op.query, op.params || {});
            results.push(result.records.map(record => record.toObject()));
          }
          return { records: [] }; // Return empty result to satisfy type
        });
      }

      return results;
    } finally {
      await session.close();
    }
  }

  return {
    read,
    write,
    readSingle,
    writeSingle,
    createNode,
    findNodes,
    createRelationship,
    batch,
  };
}

export * from './types';
export * from './utils';
