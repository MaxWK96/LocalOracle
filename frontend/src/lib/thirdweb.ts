import { createThirdwebClient } from "thirdweb";

// Client ID must be set in .env.local for runtime usage
// Using a placeholder at build time to prevent static build errors
const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "placeholder";

export const thirdwebClient = createThirdwebClient({ clientId });
