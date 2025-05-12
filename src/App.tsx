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
            content: "Hello, How may I help you?",
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
  }, []);

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
        <p>Phi-3.5 Mini 모델이 브라우저에서 직접 실행됩니다.</p>
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
