import { tool } from "ai";
import { z } from "zod";

// Linux helper tools for the AI agent
export const linuxTools = {
    // Explain a shell command in detail
    explainCommand: tool({
        description:
            "Break down a Linux/shell command and explain each part including flags, arguments, and what the command does. Use this when a user asks about understanding a command.",
        parameters: z.object({
            command: z.string().describe("The full shell command to explain"),
        }),
        execute: async ({ command }) => {
            return {
                type: "explain",
                command,
                instruction: `Provide a detailed breakdown of this command: ${command}
        
Format your response as:
1. **Command Overview**: What does this command do at a high level?
2. **Components Breakdown**:
   - Base command: [explain]
   - Each flag/option: [explain what each does]
   - Arguments: [explain what each argument represents]
3. **Example Output**: What would typical output look like?
4. **Common Variations**: Other useful ways to use this command
5. **Safety Notes**: Any warnings about destructive potential`,
            };
        },
    }),

    // Suggest commands for a task
    suggestCommand: tool({
        description:
            "Suggest appropriate Linux commands to accomplish a specific task. Use this when a user asks how to do something in Linux.",
        parameters: z.object({
            task: z.string().describe("The task the user wants to accomplish"),
            distro: z
                .string()
                .optional()
                .describe("Optional: specific Linux distribution (ubuntu, centos, arch, etc.)"),
        }),
        execute: async ({ task, distro }) => {
            return {
                type: "suggest",
                task,
                distro: distro || "generic",
                instruction: `Suggest the best command(s) to: ${task}${distro ? ` (for ${distro})` : ""}
        
Format your response as:
1. **Recommended Command**: The primary command to use
2. **Explanation**: Why this is the best approach
3. **Alternative Options**: Other ways to accomplish this
4. **Pro Tips**: Useful flags or variations
5. **Example Usage**: Real-world example with expected output`,
            };
        },
    }),

    // Help fix an error
    fixError: tool({
        description:
            "Analyze a Linux error message and provide troubleshooting steps. Use this when a user encounters an error.",
        parameters: z.object({
            error: z.string().describe("The error message the user encountered"),
            context: z
                .string()
                .optional()
                .describe("Optional: what the user was trying to do when the error occurred"),
        }),
        execute: async ({ error, context }) => {
            return {
                type: "fix",
                error,
                context: context || "unknown",
                instruction: `Help troubleshoot this error: ${error}${context ? ` (Context: ${context})` : ""}
        
Format your response as:
1. **Error Analysis**: What does this error actually mean?
2. **Common Causes**: Top reasons this error occurs
3. **Diagnostic Steps**: Commands to gather more information
4. **Solution(s)**: Step-by-step fix instructions
5. **Prevention**: How to avoid this in the future`,
            };
        },
    }),

    // Provide man page summary
    manPage: tool({
        description:
            "Provide a summarized man page for a Linux command, including common options and examples. Use this for quick command reference.",
        parameters: z.object({
            command: z.string().describe("The command to get man page info for"),
        }),
        execute: async ({ command }) => {
            return {
                type: "manpage",
                command,
                instruction: `Provide a man page summary for: ${command}
        
Format your response as:
## ${command.toUpperCase()}(1) - Manual Page Summary

### NAME
[command] - [one-line description]

### SYNOPSIS
\`\`\`
[usage pattern]
\`\`\`

### DESCRIPTION
[Brief description of what the command does]

### COMMONLY USED OPTIONS
| Option | Description |
|--------|-------------|
| -x | ... |

### EXAMPLES
\`\`\`bash
# Example 1: [description]
[command example]

# Example 2: [description]
[command example]
\`\`\`

### SEE ALSO
[Related commands]`,
            };
        },
    }),

    // Check for dangerous commands
    dangerCheck: tool({
        description:
            "Analyze a command for potential dangers and provide safety warnings. Use this for commands that could cause data loss or system damage.",
        parameters: z.object({
            command: z.string().describe("The command to check for safety"),
        }),
        execute: async ({ command }) => {
            // List of dangerous patterns
            const dangerousPatterns = [
                { pattern: /rm\s+-rf?\s+\//, risk: "critical", reason: "Deletes root filesystem" },
                { pattern: /rm\s+-rf/, risk: "high", reason: "Recursive force delete without confirmation" },
                { pattern: /mkfs/, risk: "critical", reason: "Formats filesystem, destroys all data" },
                { pattern: /dd\s+.*of=\/dev\//, risk: "critical", reason: "Overwrites disk device directly" },
                { pattern: />\s*\/dev\/sd[a-z]/, risk: "critical", reason: "Overwrites disk device" },
                { pattern: /chmod\s+-R\s+777/, risk: "high", reason: "Removes all file permissions security" },
                { pattern: /chown\s+-R/, risk: "medium", reason: "Recursive ownership change" },
                { pattern: /:\(\)\{\s*:\|:\s*&\s*\};\s*:/, risk: "critical", reason: "Fork bomb - crashes system" },
                { pattern: />\s*\/etc\/passwd/, risk: "critical", reason: "Overwrites user database" },
                { pattern: /curl.*\|\s*(ba)?sh/, risk: "high", reason: "Executes remote script without review" },
                { pattern: /wget.*\|\s*(ba)?sh/, risk: "high", reason: "Executes remote script without review" },
            ];

            const risks = dangerousPatterns
                .filter((p) => p.pattern.test(command))
                .map((p) => ({ risk: p.risk, reason: p.reason }));

            return {
                type: "danger_check",
                command,
                risks,
                hasDanger: risks.length > 0,
                instruction:
                    risks.length > 0
                        ? `⚠️ DANGER DETECTED in command: ${command}

Risks found:
${risks.map((r) => `- [${r.risk.toUpperCase()}] ${r.reason}`).join("\n")}

Provide:
1. **Why It's Dangerous**: Detailed explanation of what could go wrong
2. **Safer Alternative**: A safer way to accomplish the same goal
3. **If You Must Proceed**: Precautions and backup steps
4. **Recovery Options**: What to do if something goes wrong`
                        : `✅ No obvious dangers detected in: ${command}

However, always:
1. Understand what a command does before running it
2. Test with dry-run flags when available
3. Have backups for important data
4. Use sudo only when necessary`,
            };
        },
    }),
};

// Execute a tool by name (for manual confirmations)
export async function executeLinuxTool(
    toolName: string,
    args: Record<string, unknown>,
    env: unknown
): Promise<unknown> {
    const toolDef = linuxTools[toolName as keyof typeof linuxTools];
    if (!toolDef) {
        throw new Error(`Unknown tool: ${toolName}`);
    }
    // Tools are auto-executing in our implementation
    return { success: true, message: "Tool executed" };
}
