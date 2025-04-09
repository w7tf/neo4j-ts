export interface Neo4jRecord {
  toObject<T = any>(): T;
}

export interface Result<T = any> {
  records: Array<Neo4jRecord>;
}

export interface Transaction {
  run<T = any>(
    cypher: string,
    params?: Record<string, any>
  ): Promise<Result<T>>;
}

export interface Session {
  executeRead<T = any>(work: (tx: Transaction) => Promise<T>): Promise<T>;
  executeWrite<T = any>(work: (tx: Transaction) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export interface Driver {
  session(): Session;
}
