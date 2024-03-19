import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

const credential = new DefaultAzureCredential();
const endpoint = process.env.COSMOSDB_ENDPOINT!;

export const client = new CosmosClient({
    endpoint,
    aadCredentials: credential
})