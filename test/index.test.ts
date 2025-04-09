import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createNeo4jClient } from '../src';
import { Driver, Neo4jRecord, Result, Transaction } from './types';

const mockRecord = {
  toObject: vi.fn().mockReturnValue({ id: '1', name: 'Test Node' }),
};

const mockResult: Result = {
  records: [(mockRecord as unknown) as Neo4jRecord],
};

const mockTransaction = {
  run: vi.fn().mockResolvedValue(mockResult),
};

const mockSession = {
  executeRead: vi.fn(async callback => {
    return callback((mockTransaction as unknown) as Transaction);
  }),
  executeWrite: vi.fn(async callback => {
    return callback((mockTransaction as unknown) as Transaction);
  }),
  close: vi.fn().mockResolvedValue(undefined),
};

const mockDriver = {
  session: vi.fn().mockReturnValue(mockSession),
};

describe('Neo4j Client', () => {
  let client: ReturnType<typeof createNeo4jClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = createNeo4jClient((mockDriver as unknown) as Driver);
  });

  describe('read', () => {
    it('should execute a read query and return the results', async () => {
      const cypher = 'MATCH (n) RETURN n LIMIT 1';
      const params = { param1: 'value1' };

      const result = await client.read(cypher, params);

      expect(mockDriver.session).toHaveBeenCalled();
      expect(mockSession.executeRead).toHaveBeenCalled();
      expect(mockTransaction.run).toHaveBeenCalledWith(cypher, params);
      expect(mockSession.close).toHaveBeenCalled();
      expect(result).toEqual([{ id: '1', name: 'Test Node' }]);
    });
  });

  describe('write', () => {
    it('should execute a write query and return the results', async () => {
      const cypher = 'CREATE (n:Node {name: $name}) RETURN n';
      const params = { name: 'New Node' };

      const result = await client.write(cypher, params);

      expect(mockDriver.session).toHaveBeenCalled();
      expect(mockSession.executeWrite).toHaveBeenCalled();
      expect(mockTransaction.run).toHaveBeenCalledWith(cypher, params);
      expect(mockSession.close).toHaveBeenCalled();
      expect(result).toEqual([{ id: '1', name: 'Test Node' }]);
    });
  });

  describe('readSingle', () => {
    it('should return the first result of a read query', async () => {
      const cypher = 'MATCH (n) RETURN n LIMIT 1';

      const result = await client.readSingle(cypher);

      expect(mockDriver.session).toHaveBeenCalled();
      expect(mockSession.executeRead).toHaveBeenCalled();
      expect(result).toEqual({ id: '1', name: 'Test Node' });
    });

    it('should return null if no results', async () => {
      mockResult.records = [];

      const cypher = 'MATCH (n:NonExistent) RETURN n';

      const result = await client.readSingle(cypher);

      expect(result).toBeNull();

      mockResult.records = [(mockRecord as unknown) as Neo4jRecord];
    });
  });

  describe('createNode', () => {
    it('should create a node with the given label and properties', async () => {
      const label = 'Person';
      const properties = { name: 'John', age: 30 };

      await client.createNode(label, properties);

      expect(mockTransaction.run).toHaveBeenCalledWith(
        expect.stringContaining(`CREATE (n:${label} $properties)`),
        { properties }
      );
    });
  });

  describe('findNodes', () => {
    it('should find nodes by label', async () => {
      const label = 'Person';

      await client.findNodes(label);

      expect(mockTransaction.run).toHaveBeenCalledWith(
        expect.stringContaining(`MATCH (n:${label}) RETURN n`),
        {}
      );
    });

    it('should find nodes by label and properties', async () => {
      const label = 'Person';
      const properties = { name: 'John' };

      await client.findNodes(label, properties);
      expect(mockTransaction.run).toHaveBeenCalledWith(
        expect.stringContaining(`MATCH (n:${label})`),
        properties
      );
    });
  });

  describe('createRelationship', () => {
    it('should create a relationship between two nodes', async () => {
      const startNodeMatch = '(a:Person {id: "1"})';
      const endNodeMatch = '(b:Movie {id: "2"})';
      const relationshipType = 'ACTED_IN';
      const properties = { role: 'Protagonist' };

      await client.createRelationship(
        startNodeMatch,
        endNodeMatch,
        relationshipType,
        properties
      );

      expect(mockTransaction.run).toHaveBeenCalledWith(
        expect.stringContaining(
          `CREATE (a)-[r:${relationshipType} $properties]->(b)`
        ),
        { properties }
      );
    });
  });

  describe('batch', () => {
    it('should execute multiple operations in a transaction', async () => {
      const operations = [
        { query: 'MATCH (n:Label1) RETURN n' },
        { query: 'MATCH (n:Label2) RETURN n', params: { param: 'value' } },
      ];

      await client.batch(operations);

      expect(mockTransaction.run).toHaveBeenCalledTimes(2);
      expect(mockTransaction.run).toHaveBeenCalledWith(operations[0].query, {});
      expect(mockTransaction.run).toHaveBeenCalledWith(
        operations[1].query,
        operations[1].params
      );
    });
  });
});
