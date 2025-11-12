import React from 'react';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

const stepLabels = [
  "Kịch bản",
  "Bối cảnh",
  "Nhân vật",
  "Chủ đề",
  "Tạo series",
  "Prompt Video",
  "Thumbnail"
];

const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep, totalSteps }) => {
  return (
    <div className="w-full px-4 sm:px-8 py-4">
      <div className="flex items-center">
        {stepLabels.slice(0, totalSteps).map((label, index) => {
          const stepNumber = index + 1;
          const isCompleted = currentStep > stepNumber;
          const isActive = currentStep === stepNumber;

          return (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center relative">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 z-10
                    ${isCompleted ? 'bg-green-500 text-white' : ''}
                    ${isActive ? 'bg-indigo-500 text-white ring-4 ring-indigo-500/50' : ''}
                    ${!isCompleted && !isActive ? 'bg-gray-700 text-gray-400 border-2 border-gray-600' : ''}
                  `}
                >
                  {isCompleted ? <i className="fas fa-check"></i> : stepNumber}
                </div>
                <p
                  className={`absolute top-12 text-center w-24 text-xs font-semibold transition-colors duration-300
                    ${isActive ? 'text-indigo-300' : 'text-gray-400'}
                  `}
                >
                  {label}
                </p>
              </div>
              {stepNumber < totalSteps && (
                <div className={`flex-1 h-1 transition-colors duration-500 mx-[-2px]
                  ${isCompleted ? 'bg-green-500' : 'bg-gray-600'}
                `}></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressBar;