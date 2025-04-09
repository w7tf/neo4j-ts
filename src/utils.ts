import { Integer } from 'neo4j-driver';


/**
 * Utility to safely convert Integer to number
 * @param value - Neo4j Integer or number
 * @returns JavaScript number
 */
export function toNumber(
  value: Integer | number | null | undefined
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }

  return value.toNumber();
}
