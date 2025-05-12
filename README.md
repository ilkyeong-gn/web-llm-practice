# Vite와 TypeScript로 브라우저에서 SLM 모델 실행하기

## 1. 개요

이 문서는 Vite와 TypeScript를 사용하여 소형 언어 모델(Small Language Model, SLM)을 웹 브라우저에서 직접 실행하는 방법을 설명합니다. 사용자가 메시지를 입력하면 WebLLM을 통해 브라우저에서 SLM 모델이 직접 처리하여 응답을 생성하고, 응답 생성 과정에서는 진행 상황을 시각적으로 표시합니다.

## 2. 기술 스택

이 구현에 사용할 핵심 기술 스택은 다음과 같습니다:

- **프론트엔드**: React + TypeScript
- **빌드 도구**: Vite (빠른 개발 환경 및 최적화된 빌드)
- **SLM 통합**: WebLLM (브라우저에서 경량 언어 모델 실행을 위한 라이브러리)
- **모델**: Phi-3.5 Mini (Microsoft의 경량 언어 모델)
- **스타일링**: CSS
- **배포**: GitHub Pages 또는 Vercel

## 3. 프로젝트 설정

### 3.1 Vite 프로젝트 생성

```bash
# Vite 프로젝트 생성 (React + TypeScript 템플릿 사용)
npm create vite@latest slm-browser-chat --template react-ts
cd slm-browser-chat

# 필요한 패키지 설치
npm install @mlc-ai/web-llm
npm install

# 개발 서버 실행
npm run dev
```

### 3.2 프로젝트 구조

```
slm-browser-chat/
├── public/
├── src/
│   ├── components/         # 재사용 가능한 컴포넌트
│   │   ├── ChatBox.tsx     # 채팅 인터페이스 및 응답 생성 프로그레스 표시
│   │   ├── Message.tsx     # 개별 메시지 컴포넌트
│   │   └── ModelLoader.tsx # 모델 로드 상태 표시
│   ├── types/              # TypeScript 타입 정의
│   │   └── index.ts        # 공통 타입 정의
│   ├── App.tsx             # 메인 애플리케이션
│   ├── main.tsx            # 진입점
│   └── styles.css          # 스타일 (응답 생성 프로그레스 관련 스타일 포함)
├── index.html              # HTML 템플릿
├── tsconfig.json           # TypeScript 설정
├── vite.config.ts          # Vite 설정
└── package.json
```

### 3.3 타입 정의 (types/index.ts)

```typescript
// 메시지 타입 정의
export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

// 모델 로드 진행 보고서 타입
export interface ProgressReport {
  progress: number;
  text: string;
}
```

## 4. 주요 컴포넌트 구현

### 4.1 App.tsx (메인 애플리케이션)

```tsx
import React from "react";
import { CreateMLCEngine, MLCEngine } from "@mlc-ai/web-llm";
import ChatBox from "./components/ChatBox";
import ModelLoader from "./components/ModelLoader";
import { type Message } from "./types";
import "./styles.css";

const modelVersion = "v0_2_48";
const modelLibURLPrefix =
  "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/";

function App() {
  const [engine, setEngine] = React.useState<MLCEngine | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = React.useState<number>(0);
  const [loadingMessage, setLoadingMessage] =
    React.useState<string>("모델 초기화 중...");
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [isGenerating, setIsGenerating] = React.useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = React.useState<number>(0);
  const genProgressIntervalRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    async function initChat() {
      try {
        // 모델 로드 진행 상황 콜백 함수
        const initProgressCallback = (progress: {
          progress: number;
          text: string;
        }) => {
          setLoadingProgress(progress.progress * 100);
          setLoadingMessage(progress.text);
        };

        // MLCEngine 생성 및 모델 로드
        // CreateMLCEngine 팩토리 함수 사용
        const chatEngine = await CreateMLCEngine(
          "Phi-3.5-mini-instruct-q4f32_1-MLC",
          {
            initProgressCallback,
            appConfig: {
              model_list: [
                {
                  model:
                    "https://huggingface.co/mlc-ai/Phi-3.5-mini-instruct-q4f32_1-MLC",
                  model_id: "Phi-3.5-mini-instruct-q4f32_1-MLC",
                  model_lib:
                    modelLibURLPrefix +
                    modelVersion +
                    "/Phi-3.5-mini-instruct-q4f32_1-ctx4k_cs1k-webgpu.wasm",
                  vram_required_MB: 5483.12,
                  low_resource_required: false,
                  overrides: {
                    context_window_size: 4096,
                  },
                },
              ],
            },
          }
        );

        setEngine(chatEngine);
        setLoading(false);
        setMessages([
          {
            role: "assistant",
            content: "안녕하세요! 무엇을 도와드릴까요?",
          },
        ]);
      } catch (err) {
        console.error("모델 로드 중 오류 발생:", err);
        setError(
          "모델을 로드하는 데 실패했습니다. 브라우저가 WebGPU를 지원하는지 확인해주세요."
        );
        setLoading(false);
      }
    }

    initChat();

    // 컴포넌트 언마운트 시 정리
    return () => {
      // 인터벌 정리
      if (genProgressIntervalRef.current) {
        clearInterval(genProgressIntervalRef.current);
      }
      // 업데이트된 API 사용
      engine?.unload();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [];

  // 프로그레스 업데이트를 위한 시뮬레이션 함수
  const startProgressSimulation = () => {
    // 이미 진행 중인 인터벌이 있으면 정리
    if (genProgressIntervalRef.current) {
      clearInterval(genProgressIntervalRef.current);
    }

    setGenerationProgress(0);
    setIsGenerating(true);

    // 프로그레스 시뮬레이션 (0-95%까지만 표시, 실제 완료는 응답 후 100%로 설정)
    let progress = 0;
    genProgressIntervalRef.current = window.setInterval(() => {
      // 느리게 증가하는 로직 (초기에는 빠르게, 후반에는 느리게)
      const step = progress < 30 ? 3 : progress < 60 ? 2 : 0.5;
      progress = Math.min(95, progress + step);
      setGenerationProgress(progress);
    }, 300);
  };

  // 프로그레스 시뮬레이션 정지
  const stopProgressSimulation = () => {
    if (genProgressIntervalRef.current) {
      clearInterval(genProgressIntervalRef.current);
      genProgressIntervalRef.current = null;
    }
    setGenerationProgress(100); // 완료 표시
    
    // 잠시 후 생성 상태 해제
    setTimeout(() => {
      setIsGenerating(false);
      setGenerationProgress(0);
    }, 500);
  };

  const handleSendMessage = async (userMessage: string) => {
    if (!engine || userMessage.trim() === "" || isGenerating) return;

    // 사용자 메시지 추가
    const updatedMessages: Message[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];
    setMessages(updatedMessages);

    // 프로그레스 시뮬레이션 시작
    startProgressSimulation();

    try {
      // OpenAI 스타일 API를 사용하여 채팅 완료
      const chatMessages: Message[] = [
        { role: "system", content: "You are a helpful assistant." },
        ...updatedMessages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      ];

      const response = await engine.chat.completions.create({
        messages: chatMessages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      // 프로그레스 시뮬레이션 정지
      stopProgressSimulation();

      // 응답 메시지 추가
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: response.choices[0].message.content!,
        },
      ]);
    } catch (err) {
      console.error("응답 생성 중 오류 발생:", err);
      
      // 프로그레스 시뮬레이션 정지
      stopProgressSimulation();
      
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: "죄송합니다, 응답을 생성하는 중에 오류가 발생했습니다.",
        },
      ]);
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>브라우저에서 실행되는 SLM 채팅</h1>
        <p>Phi-3 Mini 모델이 브라우저에서 직접 실행됩니다.</p>
      </header>

      <main>
        {loading ? (
          <ModelLoader progress={loadingProgress} message={loadingMessage} />
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <ChatBox 
            messages={messages} 
            onSendMessage={handleSendMessage} 
            isGenerating={isGenerating}
            generationProgress={generationProgress}
          />
        )}
      </main>

      <footer>
        <p>
          이 애플리케이션은 WebLLM을 사용하여 SLM을 브라우저에서 직접
          실행합니다. 모든 처리는 사용자의 기기에서 이루어지며, 데이터가 외부로
          전송되지 않습니다.
        </p>
      </footer>
    </div>
  );
}

export default App;
```

### 4.2 ChatBox.tsx (채팅 인터페이스)

```tsx
import React, { useState, useRef, useEffect } from "react";
import Message from "./Message";
import { Message as MessageType } from "../types";

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
  const [input, setInput] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 새 메시지가 추가될 때마다 스크롤을 아래로 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 컴포넌트 마운트 시 입력란에 포커스
  useEffect(() => {
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
```

### 4.3 Message.tsx (메시지 컴포넌트)

```tsx
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
```

### 4.4 ModelLoader.tsx (모델 로딩 상태)

```tsx
import React from "react";

interface ModelLoaderProps {
  progress: number;
  message: string;
}

const ModelLoader: React.FC<ModelLoaderProps> = ({ progress, message }) => {
  return (
    <div className="model-loader">
      <div className="loader-message">{message}</div>
      <div className="progress-container">
        <div className="progress-bar" style={{ width: `${progress}%` }}></div>
      </div>
      <div className="progress-text">{Math.round(progress)}%</div>
      <p className="loader-info">
        첫 로딩 시에는 모델 파일(~300MB)을 다운로드해야 하므로 시간이 소요될 수
        있습니다. 파일은 브라우저 캐시에 저장되어 다음 방문 시 더 빠르게
        로드됩니다.
      </p>
    </div>
  );
};

export default ModelLoader;
```

## 5. 스타일링 (styles.css)

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: #333;
  background-color: #f5f5f5;
}

.app-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

header {
  text-align: center;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

header h1 {
  margin-bottom: 10px;
  color: #2c3e50;
}

main {
  flex: 1;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 70vh;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.message {
  margin-bottom: 15px;
  padding: 12px 15px;
  border-radius: 10px;
  max-width: 80%;
}

.user-message {
  align-self: flex-end;
  background-color: #e3f2fd;
  margin-left: auto;
}

.assistant-message {
  background-color: #f1f1f1;
  margin-right: auto;
}

.message-header {
  font-weight: bold;
  margin-bottom: 5px;
  font-size: 14px;
  color: #666;
}

.message-content {
  line-height: 1.5;
  white-space: pre-wrap;
}

.input-form {
  display: flex;
  padding: 15px;
  border-top: 1px solid #eee;
}

.message-input {
  flex: 1;
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  outline: none;
}

.send-button {
  margin-left: 10px;
  padding: 12px 20px;
  background-color: #2c3e50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.send-button:hover {
  background-color: #1a252f;
}

.model-loader {
  padding: 40px;
  text-align: center;
}

.loader-message {
  margin-bottom: 20px;
  font-size: 18px;
}

.progress-container {
  height: 20px;
  width: 100%;
  background-color: #eee;
  border-radius: 10px;
  margin-bottom: 10px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background-color: #4caf50;
  transition: width 0.3s ease;
}

.progress-text {
  margin-bottom: 20px;
  font-weight: bold;
}

.loader-info {
  color: #666;
  font-size: 14px;
  max-width: 500px;
  margin: 0 auto;
}

.error-message {
  padding: 40px;
  text-align: center;
  color: #e74c3c;
}

/* 생성 중 메시지 스타일 */
.generating-message {
  padding: 15px;
  margin-bottom: 15px;
  background-color: #f9f9f9;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* 타이핑 인디케이터 스타일 */
.typing-indicator {
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
}

.typing-indicator span {
  height: 10px;
  width: 10px;
  margin: 0 3px;
  background-color: #2c3e50;
  border-radius: 50%;
  display: inline-block;
  opacity: 0.4;
  animation: typing 1.4s infinite ease-in-out both;
}

.typing-indicator span:nth-child(1) {
  animation-delay: 0s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.4;
  }
  40% {
    transform: scale(1.2);
    opacity: 1;
  }
}

/* 생성 프로그레스 바 스타일 */
.generation-progress-container {
  height: 10px;
  width: 100%;
  background-color: #eee;
  border-radius: 5px;
  margin-bottom: 8px;
  overflow: hidden;
}

.generation-progress-bar {
  height: 100%;
  background-color: #3498db;
  transition: width 0.3s ease;
}

.generation-progress-text {
  font-size: 14px;
  text-align: center;
  color: #666;
  margin-bottom: 5px;
}

/* 비활성화된 입력 필드와 버튼 스타일 */
.message-input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.send-button:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

footer {
  margin-top: 20px;
  text-align: center;
  font-size: 14px;
  color: #666;
  padding-top: 20px;
  border-top: 1px solid #eee;
}
```

## 6. 추가 기능: 응답 생성 프로그레스 표시

이 애플리케이션은 AI가 응답을 생성하는 동안 사용자에게 시각적 피드백을 제공하기 위한 프로그레스 표시 기능을 구현했습니다.

### 6.1 응답 생성 상태 관리

```typescript
// App.tsx에서 생성 상태 관리
const [isGenerating, setIsGenerating] = React.useState<boolean>(false);
const [generationProgress, setGenerationProgress] = React.useState<number>(0);
const genProgressIntervalRef = React.useRef<number | null>(null);
```

### 6.2 프로그레스 시뮬레이션

실제 생성 진행률을 정확히 파악하기 어려우므로, 시간에 따라 진행률이 증가하는 시뮬레이션을 구현했습니다:

```typescript
// 프로그레스 시뮬레이션 시작
const startProgressSimulation = () => {
  // ...
  genProgressIntervalRef.current = window.setInterval(() => {
    // 느리게 증가하는 로직 (초기에는 빠르게, 후반에는 느리게)
    const step = progress < 30 ? 3 : progress < 60 ? 2 : 0.5;
    progress = Math.min(95, progress + step);
    setGenerationProgress(progress);
  }, 300);
};
```

### 6.3 프로그레스 UI 컴포넌트

```jsx
{/* 응답 생성 중 프로그레스 표시 */}
{isGenerating && (
  <div className="generating-message">
    <div className="typing-indicator">...</div>
    <div className="generation-progress-container">...</div>
    <div className="generation-progress-text">...</div>
  </div>
)}
```

### 6.4 입력 비활성화

응답 생성 중에는 사용자 입력이 비활성화됩니다:

```jsx
<input
  // ...
  disabled={isGenerating}
/>
<button 
  // ... 
  disabled={isGenerating}
>
  전송
</button>
```

## 7. 빌드 및 배포 구성

### 6.1 vite.config.ts 설정

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/slm-browser-chat/", // GitHub Pages를 위한 기본 경로 설정 (리포지토리 이름에 맞게 조정)
  build: {
    outDir: "dist",
    // 크고 복잡한 파일을 처리하기 위한 설정
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          webllm: ["@mlc-ai/web-llm"],
        },
      },
    },
  },
});
```

### 6.2 GitHub Pages 배포

```bash
# GitHub Pages 배포를 위한 패키지 설치
npm install --save-dev gh-pages
```

`package.json`에 다음 스크립트 추가:

```json
{
  "name": "slm-browser-chat",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview",
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  },
  "dependencies": {
    "@mlc-ai/web-llm": "^0.2.21",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@vitejs/plugin-react": "^4.0.3",
    "eslint": "^8.45.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.3",
    "gh-pages": "^6.0.0",
    "typescript": "^5.0.2",
    "vite": "^4.4.5"
  }
}
```

배포 실행:

```bash
npm run deploy
```

### 6.3 Vercel 배포

```bash
# Vercel CLI 설치
npm install -g vercel

# 배포 실행
vercel login
vercel
```

## 7. 주요 고려사항 및 제한사항

### 7.1 브라우저 호환성

- WebGPU를 지원하는 브라우저가 필요합니다 (Chrome 113+ 또는 Edge 113+).
- Safari 및 Firefox는 아직 WebGPU를 완전히 지원하지 않을 수 있습니다.
- WebGPU를 지원하지 않는 브라우저에서는 WebGL로 폴백하도록 할 수 있으나 성능이 저하됩니다.

### 7.2 모델 크기 및 초기 로딩

- 첫 방문 시 모델 파일(300MB 내외)을 다운로드해야 하므로 초기 로딩 시간이 오래 걸릴 수 있습니다.
- 이후 방문에서는 브라우저 캐시에서 모델을 로드하므로 빠르게 실행됩니다.

### 7.3 하드웨어 제약

- SLM이라도 추론 과정에서 상당한 메모리와 CPU/GPU 리소스를 사용합니다.
- 저사양 기기에서는 성능이 제한될 수 있습니다.

## 8. 향후 개선 방향

### 8.1 기능 개선

- 대화 기록 저장/로드 기능 (IndexedDB 활용)
- 다양한 SLM 모델 선택 옵션 제공
- 멀티턴 대화 컨텍스트 개선
- 마크다운 렌더링 지원

### 8.2 성능 최적화

- 모델 양자화 수준 조정으로 성능/품질 균형
- 점진적 모델 로딩 구현
- 서비스 워커를 통한 오프라인 지원 강화

## 9. 결론

Vite와 TypeScript를 사용하여 SLM을 브라우저에서 직접 실행하는 애플리케이션을 개발할 수 있습니다. 이 가이드는 WebLLM을 사용하여 간단한 채팅 인터페이스를 구현하는 방법을 보여주었습니다.

이러한 접근 방식은 서버 비용이 없고, 개인정보를 보호하며, 오프라인에서 사용 가능하다는 장점이 있습니다. 이러한 기술을 활용하면 클라이언트 측에서 완전히 작동하는 AI 채팅 애플리케이션을 개발할 수 있습니다.

## 10. 참고 자료

1. WebLLM 공식 문서: https://webllm.mlc.ai/
2. Phi-3 모델: https://huggingface.co/microsoft/phi-3-mini-4k-instruct
3. Vite 공식 문서: https://vitejs.dev/
4. React 공식 문서: https://react.dev/
5. TypeScript 공식 문서: https://www.typescriptlang.org/
6. WebGPU 브라우저 지원 현황: https://caniuse.com/webgpu
