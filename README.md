# neo4j-ts
Typescript helpers for Neo4j

## Example usage

```ts
const driver = neo4j.driver(
  'neo4j://localhost:7687',
  neo4j.auth.basic('username', 'password')
);

const neo4j = createNeo4jClient(driver);

async function example() {
  const users = await neo4j.findNodes('User', { active: true });
  
  const newUser = await neo4j.createNode('User', { 
    name: 'John', 
    email: 'john@example.com' 
  });
  
  const results = await neo4j.read('MATCH (n:User) RETURN n.name, n.email');
}
```

