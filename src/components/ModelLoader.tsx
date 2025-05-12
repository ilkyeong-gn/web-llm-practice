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
