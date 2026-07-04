import React, { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface AIChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  csvData?: any[];
  modelType?: 'kepler' | 'tess';
}

const AIChatbot: React.FC<AIChatbotProps> = ({ isOpen, onClose, csvData, modelType }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<{ remaining: number; limit: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      // Initialize with welcome message
      if (messages.length === 0) {
        const welcomeMessage: Message = {
          role: 'assistant',
          content: `Hello! 👋 I'm your AI assistant for exoplanet analysis. I have access to ${csvData?.length || 0} ${modelType?.toUpperCase() || ''} exoplanet predictions. Feel free to ask me questions about:\n\n• Specific exoplanet properties\n• Statistical analysis of the results\n• Comparison between different exoplanets\n• Habitability assessments\n• Detection methods and confidence levels\n\nWhat would you like to know?`,
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
      }
    }
  }, [isOpen, csvData, modelType]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Prepare context about the CSV data
      const dataContext = csvData ? `
You are analyzing ${csvData.length} exoplanet predictions from the ${modelType?.toUpperCase()} dataset. 
Here's a summary of the data:
- Total predictions: ${csvData.length}
- Model type: ${modelType}
- Sample data structure: ${JSON.stringify(csvData.slice(0, 2), null, 2)}

Available fields in the dataset: ${Object.keys(csvData[0] || {}).join(', ')}
` : 'No data available.';

      // Prepare messages for API
      const messagesToSend = [
        {
          role: 'system',
          content: `You are an expert exoplanet scientist and data analyst. You help users understand and analyze exoplanet detection data from NASA missions. 
              
${dataContext}

Provide accurate, scientific, and helpful responses. Use emojis occasionally to make the conversation engaging. Format numbers clearly and provide insights where relevant.`
        },
        ...messages.filter(m => m.role !== 'system').map(m => ({
          role: m.role,
          content: m.content,
        })),
        {
          role: 'user',
          content: inputMessage.trim(),
        }
      ];

      // Call our secure API endpoint instead of OpenAI directly
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesToSend
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle rate limit error
        if (response.status === 429) {
          throw new Error(errorData.message || 'Rate limit exceeded. Please try again tomorrow.');
        }
        
        throw new Error(errorData.error || `API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Update rate limit info
      if (data.rateLimit) {
        setRateLimitInfo(data.rateLimit);
      }
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.choices[0]?.message?.content || 'Sorry, I could not generate a response.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('ChatGPT API Error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ ${error instanceof Error ? error.message : 'Unknown error occurred. Please try again.'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    const welcomeMessage: Message = {
      role: 'assistant',
      content: `Chat cleared! 🧹 I'm still here to help you analyze ${csvData?.length || 0} exoplanet predictions. What would you like to know?`,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-void-950/70 backdrop-blur-sm z-50 animate-[fadeIn_0.2s_ease-out]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          style={{ backgroundColor: 'var(--bg)' }}
          className="rounded-panel border border-hairline-strong shadow-elevated w-full max-w-3xl h-[600px] flex flex-col pointer-events-auto animate-[slideInRight_0.3s_ease-out]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative overflow-hidden rounded-t-panel border-b border-hairline bg-surface-raised p-4">
            <div className="pointer-events-none absolute inset-0 bg-nebula-veil opacity-60" aria-hidden="true" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative flex h-11 w-11 items-center justify-center rounded-control border border-hairline bg-surface-sunken">
                  <i className="fas fa-robot text-xl text-accent"></i>
                  <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-stellar-400 shadow-glow-stellar"></div>
                </div>
                <div>
                  <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-ink">
                    AI Exoplanet Assistant
                    <span className="rounded-pill border border-hairline bg-surface px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-tertiary">GPT-3.5</span>
                  </h2>
                  <p className="text-sm text-ink-secondary">
                    <span className="font-mono text-accent">{csvData?.length || 0}</span> predictions • {modelType?.toUpperCase() || 'Unknown'} dataset
                  </p>
                  {rateLimitInfo && (
                    <p className="mt-1 flex items-center gap-1 font-mono text-xs text-ink-tertiary">
                      <i className="fas fa-clock"></i>
                      {rateLimitInfo.remaining} / {rateLimitInfo.limit} messages remaining today
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearChat}
                  className="flex items-center gap-2 rounded-control border border-hairline bg-surface px-3 py-2 text-sm font-medium text-ink-secondary transition-colors duration-200 hover:border-hairline-strong hover:text-ink"
                  title="Clear chat"
                >
                  <i className="fas fa-trash-alt"></i>
                  Clear
                </button>
                <button
                  onClick={onClose}
                  className="flex h-10 w-10 items-center justify-center rounded-control border border-hairline bg-surface text-ink-secondary transition-colors duration-200 hover:border-hairline-strong hover:text-ink"
                  title="Close"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4 themed-scrollbar">
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-[slideInRight_0.3s_ease-out]`}
              >
                <div
                  className={`max-w-[80%] rounded-card border p-4 ${
                    message.role === 'user'
                      ? 'border-stellar-400/25 bg-stellar-400/10 text-ink'
                      : 'border-hairline bg-surface-raised text-ink-secondary'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {message.role === 'assistant' && (
                      <i className="fas fa-robot mt-1 text-xl text-accent"></i>
                    )}
                    <div className="flex-1">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                      <p className={`mt-2 font-mono text-xs ${message.role === 'user' ? 'text-stellar-300/80' : 'text-ink-tertiary'}`}>
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    {message.role === 'user' && (
                      <i className="fas fa-user mt-1 text-xl text-accent"></i>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start animate-[slideInRight_0.3s_ease-out]">
                <div className="rounded-card border border-hairline bg-surface-raised p-4">
                  <div className="flex items-center gap-3">
                    <i className="fas fa-robot text-xl text-accent"></i>
                    <div className="flex gap-2">
                      <div className="h-2 w-2 rounded-full bg-stellar-400 animate-bounce" style={{ animationDelay: '0s' }}></div>
                      <div className="h-2 w-2 rounded-full bg-stellar-300 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="h-2 w-2 rounded-full bg-nebula-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="rounded-b-panel border-t border-hairline bg-surface p-4">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about the exoplanet predictions..."
                disabled={isLoading}
                className="flex-1 rounded-control border border-hairline bg-surface-sunken px-4 py-3 text-ink placeholder-ink-tertiary transition-colors focus:border-stellar-400/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="btn-space btn-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <i className={`fas ${isLoading ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-ink-tertiary">
              <i className="fas fa-info-circle mr-1"></i>
              Powered by OpenAI GPT-3.5-Turbo • Your questions help improve the analysis
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default AIChatbot;
