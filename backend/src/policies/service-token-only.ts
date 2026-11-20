// Allows a request only when it carries a Strapi API token (the Next.js server's), never a user JWT.
export default (policyContext: any) => policyContext.state?.auth?.strategy?.name === 'content-api-token';
