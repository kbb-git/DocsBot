require('dotenv').config({ path: '.env.local' });
import { runCheckoutDocsAgent } from '../app/lib/agent';

// Test query
const testQuery = "What payment methods does Checkout.com support?";

console.log(`Testing agent with query: "${testQuery}"`);

runCheckoutDocsAgent(testQuery)
  .then((result) => {
    console.log("\nAgent Response:");
    console.log(result.response);
    
    if (result.metadata && result.metadata.context) {
      console.log("\nContext Used:");
      console.log(JSON.stringify(result.metadata.context, null, 2));
    }
    
    console.log("\nTest completed successfully!");
  })
  .catch((error) => {
    console.error("Error running agent test:", error);
  }); 