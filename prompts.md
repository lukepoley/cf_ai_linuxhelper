# AI Prompts for Linux Helper Agent

This file contains a collection of prompts you can use with an AI coding assistant (like me!) to build, extend, and maintain this project.

## Project Creation Prompts

These prompts would replicate the creation of this app from scratch.

### 1. Initial Scaffolding
> "Create a new Cloudflare Workers project named 'linux-helper-agent'. I want to use the `agents` SDK for stateful AI agents. The project should support React for the frontend and use Vite for building. Please set up the `wrangler.jsonc` configuration with a Durable Object named 'LinuxHelperAgent' and an AI binding."

### 2. Frontend Setup
> "Set up the frontend for my Cloudflare Workers app. I want a single-page React application that looks like a retro Linux terminal.
> - Use a dark theme with monospace fonts (like 'Courier New' or 'Fira Code').
> - Create a main chat interface where user messages look like shell commands (e.g., `user@linux:~$ help me`).
> - Responses should look like standard terminal output.
> - Use standard CSS, no external UI libraries like Tailwind unless necessary."

### 3. Backend Agent Logic
> "Implement the `LinuxHelperAgent` class in `src/server.ts` extending the `Agent` class from the `agents` SDK.
> - It should handle WebSocket connections in `onConnect` and `onMessage`.
> - Use `workers-ai-provider` to connect to `@cf/meta/llama-3.3-70b-instruct-fp8-fast`.
> - In `onMessage`, stream the AI response back to the client.
> - Persist chat history in a SQL database using `this.sql`."

### 4. Defining the System Persona
> "Create a constant `LINUX_EXPERT_PROMPT` in `src/server.ts`. The persona should be a helpful Linux system administrator who explains commands in detail, warns about dangerous operations (like `rm -rf`), and provides man-page style summaries. The output should always be in Markdown."

---

## Extension & Feature Prompts

Use these prompts to add new capabilities to the agent.

### Adding a New Tool
> "I want to add a new tool to the agent in `src/tools.ts`.
> - **Tool Name**: `checkDiskUsage`
> - **Description**: Checks for large files in a directory (simulated).
> - **Logic**: It should accept a path and return a simulated list of large files in that path with their sizes.
> - **Integration**: Register this tool in the `linuxTools` object and ensure the AI can call it."

### Enhancing Safety Features
> "Update the `dangerCheck` tool in `src/tools.ts`. I want to add a new rule: automatically flag any command that pipes a URL into bash (e.g., `curl ... | bash`). It should be marked as 'High Risk' because it executes remote code without review."

### Improve the UI
> "Update the `src/app.tsx` component. I want to add a 'Clear Terminal' button in the top right corner that looks like a minimize/close window control. When clicked, it should send a 'clear' message to the agent and wipe the local chat history."

### Switch AI Models
> "Verification check: Change the AI model used in `src/server.ts` to `@cf/deepseek-ai/deepseek-r1-distill-qwen-32b` to see if it provides better reasoning for complex shell scripts. Update the code to use this model string."

---

## Debugging & Maintenance Prompts

### Trouble Connecting
> "I'm seeing a 'WebSocket connection failed' error in the browser console. Can you check `src/main.tsx` and `src/server.ts` to ensure the WebSocket URL construction matches how Cloudflare Workers routing is set up in `wrangler.jsonc`?"

### Database Reset
> "I want to reset the agent's memory. Provide a way to clear the `messages` table in the SQL database. Maybe add a special command 'clear_history' that I can send from the client to trigger this SQL delete."

### Deployment
> "I'm ready to deploy. Check my `wrangler.jsonc` to ensure all bindings (AI, Durable Objects, Assets) are correctly configured for production. Then give me the exact `npm run deploy` command to push this to Cloudflare."
