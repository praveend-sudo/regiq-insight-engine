import { auth, defineMcp } from "@lovable.dev/mcp-js";
import askRegiq from "./tools/ask-regiq";
import listChats from "./tools/list-chats";
import getChat from "./tools/get-chat";
import listTasks from "./tools/list-tasks";
import createTask from "./tools/create-task";
import updateTask from "./tools/update-task";
import listFlagged from "./tools/list-flagged";

// Direct Supabase host is required as the OAuth issuer (the proxy URL fails RFC 8414 issuer matching).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "regiq-mcp",
  title: "RegIQ Compliance",
  version: "0.1.0",
  instructions:
    "Tools for RegIQ, an AI compliance assistant for Sri Lankan financial institutions. Use `ask_regiq` to answer compliance questions across CBSL, SEC, CSE and IRD regulations plus internal policies. Use the chat tools to read past compliance conversations, the task tools to manage compliance follow-ups, and `list_flagged_answers` to review answers flagged for scrutiny. All tools act as the signed-in RegIQ user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [askRegiq, listChats, getChat, listTasks, createTask, updateTask, listFlagged],
});
