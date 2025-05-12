import React from "react";

interface MessageProps {
  role: "user" | "assistant";
  content: string;
}

const Message: React.FC<MessageProps> = ({ role, content }) => {
  return (
    <div
      className={`message ${
        role === "user" ? "user-message" : "assistant-message"
      }`}
    >
      <div className="message-header">
        {role === "user" ? "👤 사용자" : "🤖 Phi-3 Mini"}
      </div>
      <div className="message-content">{content}</div>
    </div>
  );
};

export default Message;
