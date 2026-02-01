import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import "./styles.css";

// Message type
interface Message {
    role: "user" | "assistant";
    content: string;
    isStreaming?: boolean;
}

// WebSocket connection hook
function useAgent() {
    const [connected, setConnected] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const streamingContentRef = useRef<string>("");

    useEffect(() => {
        // Connect to agent WebSocket
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const ws = new WebSocket(`${protocol}//${window.location.host}/agent/LinuxHelperAgent/default`);

        ws.onopen = () => {
            setConnected(true);
            // Request chat history
            ws.send(JSON.stringify({ type: "get_history" }));
        };

        ws.onclose = () => {
            setConnected(false);
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case "history":
                    setMessages(data.messages || []);
                    break;

                case "stream":
                    streamingContentRef.current += data.content;
                    setMessages((prev) => {
                        const newMessages = [...prev];
                        const lastMessage = newMessages[newMessages.length - 1];
                        if (lastMessage?.isStreaming) {
                            lastMessage.content = streamingContentRef.current;
                        } else {
                            newMessages.push({
                                role: "assistant",
                                content: streamingContentRef.current,
                                isStreaming: true,
                            });
                        }
                        return newMessages;
                    });
                    break;

                case "done":
                    streamingContentRef.current = "";
                    setMessages((prev) => {
                        const newMessages = [...prev];
                        const lastMessage = newMessages[newMessages.length - 1];
                        if (lastMessage?.isStreaming) {
                            lastMessage.isStreaming = false;
                            lastMessage.content = data.content;
                        }
                        return newMessages;
                    });
                    setIsLoading(false);
                    break;

                case "error":
                    setIsLoading(false);
                    setMessages((prev) => [
                        ...prev,
                        { role: "assistant", content: `⚠️ Error: ${data.message}` },
                    ]);
                    break;

                case "cleared":
                    setMessages([]);
                    break;

                case "tool_calls":
                    // Could show tool usage indicator
                    console.log("Tool calls:", data.tools);
                    break;
            }
        };

        wsRef.current = ws;

        return () => {
            ws.close();
        };
    }, []);

    const sendMessage = useCallback((content: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            setIsLoading(true);
            streamingContentRef.current = "";
            setMessages((prev) => [...prev, { role: "user", content }]);
            wsRef.current.send(JSON.stringify({ type: "chat", content }));
        }
    }, []);

    const clearChat = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "clear" }));
        }
    }, []);

    return { connected, messages, isLoading, sendMessage, clearChat };
}

// Main App component
export function App() {
    const { connected, messages, isLoading, sendMessage, clearChat } = useAgent();
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Handle form submit
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            sendMessage(input.trim());
            setInput("");
        }
    };

    // Handle keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    // Quick action buttons
    const quickActions = [
        { label: "Explain ls -la", action: "Explain this command: ls -la" },
        { label: "Find files", action: "How do I find all .log files in /var/log?" },
        { label: "Check disk space", action: "What command shows disk space usage?" },
        { label: "Process management", action: "How do I find and kill a process by name?" },
    ];

    return (
        <div className="app">
            {/* Header */}
            <header className="header">
                <div className="header-content">
                    <div className="logo">
                        <span className="logo-icon">🐧</span>
                        <h1>Linux Helper</h1>
                    </div>
                    <div className="header-actions">
                        <span className={`status ${connected ? "connected" : "disconnected"}`}>
                            {connected ? "● Connected" : "○ Disconnected"}
                        </span>
                        <button className="clear-btn" onClick={clearChat} title="Clear chat history">
                            🗑️ Clear
                        </button>
                    </div>
                </div>
            </header>

            {/* Main chat area */}
            <main className="chat-container">
                {messages.length === 0 ? (
                    <div className="welcome">
                        <div className="terminal-icon">$_</div>
                        <h2>Welcome to Linux Helper</h2>
                        <p>I'm your AI-powered Linux assistant. Ask me anything about:</p>
                        <ul className="features">
                            <li>🔧 Shell commands and scripting</li>
                            <li>📖 Command explanations and man pages</li>
                            <li>🐛 Error troubleshooting</li>
                            <li>⚠️ Command safety checks</li>
                            <li>💡 Best practices and tips</li>
                        </ul>
                        <div className="quick-actions">
                            <p>Try these:</p>
                            <div className="action-buttons">
                                {quickActions.map((qa, i) => (
                                    <button
                                        key={i}
                                        className="quick-action-btn"
                                        onClick={() => sendMessage(qa.action)}
                                        disabled={isLoading}
                                    >
                                        {qa.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="messages">
                        {messages.map((msg, i) => (
                            <div key={i} className={`message ${msg.role}`}>
                                <div className="message-avatar">
                                    {msg.role === "user" ? "👤" : "🐧"}
                                </div>
                                <div className="message-content">
                                    {msg.role === "assistant" ? (
                                        <ReactMarkdown
                                            components={{
                                                code({ node, className, children, ...props }) {
                                                    const match = /language-(\w+)/.exec(className || "");
                                                    const isInline = !match;
                                                    return isInline ? (
                                                        <code className="inline-code" {...props}>
                                                            {children}
                                                        </code>
                                                    ) : (
                                                        <pre className="code-block">
                                                            <code className={className} {...props}>
                                                                {children}
                                                            </code>
                                                        </pre>
                                                    );
                                                },
                                            }}
                                        >
                                            {msg.content}
                                        </ReactMarkdown>
                                    ) : (
                                        <p>{msg.content}</p>
                                    )}
                                    {msg.isStreaming && <span className="cursor">▊</span>}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </main>

            {/* Input area */}
            <footer className="input-container">
                <form onSubmit={handleSubmit} className="input-form">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about Linux commands, troubleshoot errors, or get help with shell scripting..."
                        disabled={!connected || isLoading}
                        rows={1}
                    />
                    <button
                        type="submit"
                        disabled={!connected || !input.trim() || isLoading}
                        className="send-btn"
                    >
                        {isLoading ? (
                            <span className="loading-indicator">⟳</span>
                        ) : (
                            <span>Send</span>
                        )}
                    </button>
                </form>
                <p className="disclaimer">
                    Powered by Workers AI • Always verify commands before running in production
                </p>
            </footer>
        </div>
    );
}

export default App;
