# 🐧 Linux Helper Agent

AI-powered Linux assistant built on Cloudflare Workers using the Agents SDK.

![Linux Helper](https://img.shields.io/badge/Cloudflare-Workers-orange)
![AI](https://img.shields.io/badge/AI-Llama%203.3-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- 💬 **Natural Language Chat** - Ask Linux questions in plain English
- 🔧 **Command Explanations** - Understand what any shell command does
- 📖 **Man Page Summaries** - Quick reference for any command
- 🐛 **Error Troubleshooting** - Get help fixing error messages
- ⚠️ **Safety Warnings** - Detects dangerous commands before you run them
- 💾 **Conversation Memory** - Remembers your chat history
- 🎨 **Terminal Theme** - Beautiful dark theme inspired by terminal aesthetics

## Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [Cloudflare Account](https://dash.cloudflare.com/sign-up) (free tier works!)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

## Quick Start

1. **Install dependencies**
   ```bash
   cd linux-helper-agent
   npm install
   ```

2. **Login to Cloudflare**
   ```bash
   npx wrangler login
   ```

3. **Run locally**
   ```bash
   npm start
   ```
   Open [http://localhost:5173](http://localhost:5173)

4. **Deploy to Cloudflare**
   ```bash
   npm run deploy
   ```

## Project Structure

```
linux-helper-agent/
├── src/
│   ├── server.ts    # Agent logic & WebSocket handling
│   ├── tools.ts     # Linux-specific AI tools
│   ├── app.tsx      # React chat UI
│   ├── main.tsx     # React entry point
│   └── styles.css   # Terminal-themed styling
├── wrangler.jsonc   # Cloudflare Workers config
├── package.json     # Dependencies
├── vite.config.ts   # Vite configuration
└── index.html       # HTML template
```

## Available Tools

The AI agent has access to these specialized tools:

| Tool | Description |
|------|-------------|
| `explainCommand` | Breaks down shell commands and explains each part |
| `suggestCommand` | Suggests the right command for any task |
| `fixError` | Helps troubleshoot Linux error messages |
| `manPage` | Provides summarized man page information |
| `dangerCheck` | Warns about potentially destructive commands |

## Example Queries

- "Explain `ls -la`"
- "How do I find all .log files larger than 100MB?"
- "I'm getting 'permission denied' when running my script"
- "What's the difference between `rm -rf` and `rm -r`?"
- "Is this command safe? `dd if=/dev/zero of=/dev/sda`"

## Customization

### Change the AI Model

Edit `src/server.ts` and change the model:

```typescript
const model = workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast");
// Or try: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b"
```

### Modify the System Prompt

Edit `LINUX_EXPERT_PROMPT` in `src/server.ts` to change the AI's behavior.

### Add New Tools

Add new tools in `src/tools.ts` following the pattern of existing tools.

## Learn More

- [Cloudflare Agents SDK](https://developers.cloudflare.com/agents/)
- [Workers AI Models](https://developers.cloudflare.com/workers-ai/models/)
- [Durable Objects](https://developers.cloudflare.com/durable-objects/)
