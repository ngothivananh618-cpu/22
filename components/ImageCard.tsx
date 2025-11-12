import React from 'react';
import type { ImageResult } from '../App';

interface ImageCardProps {
    result: ImageResult;
    index: number;
    onOpenEditModal: (image: ImageResult) => void;
    isSelected?: boolean;
    onToggleSelection?: (id: string) => void;
    onRegenerate?: (id: string) => void;
}

const ImageCard: React.FC<ImageCardProps> = ({ result, index, onOpenEditModal, isSelected, onToggleSelection, onRegenerate }) => {
  const imageNumber = index + 1;

  if (result.status === 'generating' || result.status === 'retrying') {
    return (
      <div className="w-full aspect-video bg-gray-800 rounded-lg flex flex-col items-center justify-center p-4 border-2 border-dashed border-indigo-500/50 relative">
        <div className="absolute top-3 left-3 bg-indigo-500/80 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-md">
            {imageNumber}
        </div>
        <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-indigo-500"></div>
        <p className="mt-4 text-gray-300">
            {result.status === 'retrying' ? 'Đang thử lại...' : `Đang tạo ảnh ${imageNumber}...`}
        </p>
      </div>
    );
  }

  if (result.status === 'error') {
    return (
       <div className="w-full aspect-video bg-gray-800 rounded-lg flex flex-col items-center justify-center p-4 border border-red-500/30 relative group">
          <div className="absolute top-3 left-3 bg-red-500/80 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-md">
            {imageNumber}
          </div>
          <i className="fas fa-exclamation-triangle text-4xl text-red-400 mb-2"></i>
          <h4 className="font-bold text-red-400">Lỗi tạo ảnh {imageNumber}</h4>
          <p className="text-xs text-center text-gray-400 mt-1">{result.error}</p>
          {onRegenerate && (
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                    onClick={() => onRegenerate(result.id)}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center"
                >
                    <i className="fas fa-sync-alt mr-2"></i>
                    Thử lại
                </button>
            </div>
          )}
       </div>
    )
  }

  if (result.status === 'cancelled') {
    return (
       <div className="w-full aspect-video bg-gray-800 rounded-lg flex flex-col items-center justify-center p-4 border border-gray-600 relative">
          <div className="absolute top-3 left-3 bg-gray-600/80 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-md">
            {imageNumber}
          </div>
          <i className="fas fa-ban text-4xl text-gray-500 mb-2"></i>
          <h4 className="font-bold text-gray-400">Đã hủy</h4>
          <p className="text-xs text-center text-gray-500 mt-1">{result.error || 'Quá trình tạo đã bị dừng.'}</p>
       </div>
    )
  }

  return (
    <div className="w-full aspect-video relative group bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <img
        src={result.url!}
        alt={`Ảnh series số ${imageNumber}`}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-md transition-opacity duration-300 group-hover:opacity-0">
        {imageNumber}
      </div>

      {result.generatedBy && (
        <div className="absolute bottom-2 right-2 text-xs text-gray-200 bg-black/50 px-2 py-1 rounded-full pointer-events-none transition-opacity duration-300 group-hover:opacity-0">
          <i className="fas fa-user-circle mr-1"></i>
          {result.generatedBy}
        </div>
      )}

      {onToggleSelection && (
        <div className="absolute top-3 right-3 z-20">
            <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelection(result.id)}
                className="h-6 w-6 rounded text-teal-500 bg-gray-700 border-gray-500 focus:ring-teal-500 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4 text-center">
        <h3 className="text-white font-bold text-xl mb-3">Ảnh số {imageNumber}</h3>
        <div className="flex gap-3 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
            <button
              onClick={() => onOpenEditModal(result)}
              className="bg-gray-200 hover:bg-white text-gray-800 font-semibold py-2 px-4 rounded-full shadow-lg flex items-center"
            >
              <i className="fas fa-pencil-alt mr-2"></i>
              Sửa
            </button>
            {onRegenerate && (
                <button
                    onClick={() => onRegenerate(result.id)}
                    className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-full shadow-lg flex items-center"
                >
                    <i className="fas fa-sync-alt mr-2"></i>
                    Tạo lại
                </button>
            )}
            <a
              href={result.url!}
              download={`series-anh-${imageNumber}.png`}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-full shadow-lg flex items-center"
            >
              <i className="fas fa-download mr-2"></i>
              Tải
            </a>
        </div>
      </div>
    </div>
  );
};

export default ImageCard;