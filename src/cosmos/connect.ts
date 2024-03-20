import { CosmosClient } from "@azure/cosmos";

const endpoint = process.env.COSMOSDB_ENDPOINT!;
const key = process.env.COSMOSDB_KEY;

export const client =  new CosmosClient({ endpoint, key });