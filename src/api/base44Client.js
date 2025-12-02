import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "6916c07a336ea461cb0e42ef", 
  requiresAuth: true // Ensure authentication is required for all operations
});
