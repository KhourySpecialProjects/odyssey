import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// One Claude client for every Mentor answer (ODY-886). Like AI scoring's, it
// reads ANTHROPIC_API_KEY. Its retries only happen before an answer starts
// streaming, so a student never sees text twice.

let client: Anthropic | undefined;

export const mentorClient = () => (client ??= new Anthropic());
