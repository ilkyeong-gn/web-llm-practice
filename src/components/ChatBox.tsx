import React from "react";
import Message from "./Message";
import { type Message as MessageType } from "../types";

interface ChatBoxProps {
  messages: MessageType[];
  onSendMessage: (message: string) => void;
  isGenerating?: boolean;
  generationProgress?: number;
}

const ChatBox: React.FC<ChatBoxProps> = ({ 
  messages, 
  onSendMessage, 
  isGenerating = false, 
  generationProgress = 0 
}) => {
  const [input, setInput] = React.useState<string>("");
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // 새 메시지가 추가될 때마다 스크롤을 아래로 이동
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 컴포넌트 마운트 시 입력란에 포커스
  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput("");
    }
  };

  return (
    <div className="chat-container">
      <div className="messages-container">
        {messages.map((message, index) => (
          <Message key={index} role={message.role} content={message.content} />
        ))}
        
        {/* 응답 생성 중 프로그레스 표시 */}
        {isGenerating && (
          <div className="generating-message">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div className="generation-progress-container">
              <div 
                className="generation-progress-bar" 
                style={{ width: `${generationProgress}%` }}
              ></div>
            </div>
            <div className="generation-progress-text">
              응답 생성 중... {Math.round(generationProgress)}%
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <form className="input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="메시지를 입력하세요..."
          ref={inputRef}
          className="message-input"
          disabled={isGenerating}
        />
        <button 
          type="submit" 
          className="send-button"
          disabled={isGenerating}
        >
          전송
        </button>
      </form>
    </div>
  );
};

export default ChatBox;
