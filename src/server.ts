import { Agent, AgentNamespace, getAgentByName, routeAgentRequest } from "agents";
import { createWorkersAI } from "workers-ai-provider";
import { streamText, tool } from "ai";
import { z } from "zod";
import { linuxTools, executeLinuxTool } from "./tools";

// Environment bindings
interface Env {
    LinuxHelperAgent: AgentNamespace<LinuxHelperAgent>;
    AI: Ai;
}

// System prompt for Linux expertise
const LINUX_EXPERT_PROMPT = `You are an expert Linux system administrator and shell scripting specialist. Your name is "Linux Helper".

Your capabilities include:
- Explaining Linux commands in detail, breaking down each flag and argument
- Suggesting the right commands for any Linux task
- Troubleshooting error messages and system issues
- Providing man page summaries and usage examples
- Warning users about potentially dangerous commands before they run them
- Teaching Linux fundamentals and best practices

Guidelines:
1. Always explain WHY a command works, not just what it does
2. Provide examples with common use cases
3. Warn about destructive operations (rm -rf, dd, mkfs, etc.)
4. Suggest safer alternatives when possible
5. Use code blocks for command output
6. Be concise but thorough

You have access to specialized tools to help users:
- Use explainCommand to break down shell commands
- Use suggestCommand to recommend commands for tasks
- Use fixError to help troubleshoot error messages
- Use manPage to provide manual page summaries
- Use dangerCheck to analyze potentially risky commands

Your responses should be formatted in Markdown for readability.`;

// Chat message type
type Message = {
    role: "user" | "assistant";
    content: string;
};

// Main Agent class
export class LinuxHelperAgent extends Agent<Env> {
    // Chat history stored in agent state
    async getMessages(): Promise<Message[]> {
        return (await this.sql`SELECT * FROM messages ORDER BY id ASC`.toArray()) as Message[];
    }

    async saveMessage(message: Message): Promise<void> {
        await this.sql`INSERT INTO messages (role, content) VALUES (${message.role}, ${message.content})`;
    }

    async initializeDatabase(): Promise<void> {
        await this.sql`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      content TEXT NOT NULL
    )`;
    }

    async onStart(): Promise<void> {
        await this.initializeDatabase();
    }

    async onConnect(): Promise<void> {
        console.log("Client connected to Linux Helper Agent");
    }

    async onMessage(connection: Connection, message: string): Promise<void> {
        try {
            const data = JSON.parse(message);

            if (data.type === "chat") {
                await this.handleChat(connection, data.content);
            } else if (data.type === "clear") {
                await this.sql`DELETE FROM messages`;
                connection.send(JSON.stringify({ type: "cleared" }));
            } else if (data.type === "get_history") {
                const messages = await this.getMessages();
                connection.send(JSON.stringify({ type: "history", messages }));
            } else if (data.type === "tool_confirm") {
                // Handle tool confirmation
                const result = await executeLinuxTool(data.toolName, data.args, this.env);
                connection.send(JSON.stringify({ type: "tool_result", result }));
            }
        } catch (error) {
            console.error("Error processing message:", error);
            connection.send(JSON.stringify({ type: "error", message: "Failed to process message" }));
        }
    }

    async handleChat(connection: Connection, userMessage: string): Promise<void> {
        // Save user message
        await this.saveMessage({ role: "user", content: userMessage });

        // Get chat history
        const history = await this.getMessages();

        // Create Workers AI instance
        const workersai = createWorkersAI({ binding: this.env.AI });

        // Stream response
        try {
            const result = streamText({
                model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
                system: LINUX_EXPERT_PROMPT,
                messages: history.map((m) => ({
                    role: m.role,
                    content: m.content,
                })),
                tools: linuxTools,
                maxSteps: 5,
                onChunk: ({ chunk }) => {
                    if (chunk.type === "text-delta") {
                        connection.send(
                            JSON.stringify({
                                type: "stream",
                                content: chunk.textDelta,
                            })
                        );
                    }
                },
                onStepFinish: async ({ toolCalls, toolResults }) => {
                    if (toolCalls && toolCalls.length > 0) {
                        connection.send(
                            JSON.stringify({
                                type: "tool_calls",
                                tools: toolCalls.map((tc) => ({
                                    name: tc.toolName,
                                    args: tc.args,
                                })),
                            })
                        );
                    }
                    if (toolResults && toolResults.length > 0) {
                        connection.send(
                            JSON.stringify({
                                type: "tool_results",
                                results: toolResults,
                            })
                        );
                    }
                },
            });

            // Wait for completion and save response
            const response = await result.text;
            await this.saveMessage({ role: "assistant", content: response });

            connection.send(
                JSON.stringify({
                    type: "done",
                    content: response,
                })
            );
        } catch (error) {
            console.error("AI Error:", error);
            connection.send(
                JSON.stringify({
                    type: "error",
                    message: "Failed to generate response. Please try again.",
                })
            );
        }
    }
}

// Cloudflare Worker fetch handler
export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);

        // Handle agent WebSocket connections
        if (url.pathname.startsWith("/agent")) {
            return routeAgentRequest(request, env);
        }

        // Get agent for HTTP requests
        if (url.pathname === "/api/agent") {
            const agent = await getAgentByName(env.LinuxHelperAgent, "default");
            return new Response(JSON.stringify({ id: agent.id }), {
                headers: { "Content-Type": "application/json" },
            });
        }

        // Serve static assets (handled by Vite in dev, Assets binding in prod)
        return env.ASSETS?.fetch(request) ?? new Response("Not Found", { status: 404 });
    },
};
