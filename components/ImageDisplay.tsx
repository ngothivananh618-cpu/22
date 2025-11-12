
import React, { useState } from 'react';
import type { ImageResult } from '../App';
import ImageCard from './ImageCard';

// These would be available globally if JSZip is included via a script tag
declare const JSZip: any;
declare const saveAs: any;


interface ImageDisplayProps {
  generatedImages: ImageResult[];
  onOpenEditModal: (image: ImageResult) => void;
  onProceedToStep6: () => void;
  onProceedToStep7: () => void;
  selectedImageIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onRegenerateImage: (id: string) => void;
  onRetryFailed: () => void;
  isQuotaExceeded: boolean;
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({
  generatedImages,
  onOpenEditModal,
  onProceedToStep6,
  onProceedToStep7,
  selectedImageIds,
  onToggleSelection,
  onRegenerateImage,
  onRetryFailed,
  isQuotaExceeded,
}) => {
  const [isZipping, setIsZipping] = useState(false);
  const successfulImages = generatedImages.filter(img => img.status === 'success' && img.url);
  const retryableImages = generatedImages.filter(img => img.status === 'error' || img.status === 'cancelled');
  const hasRetryableImages = retryableImages.length > 0;


  const handleDownload = async (imagesToDownload: ImageResult[]) => {
    if (imagesToDownload.length === 0) return;
    setIsZipping(true);

    const zip = new JSZip();

    const fetchImage = async (img: ImageResult, index: number) => {
      try {
        const response = await fetch(img.url!);
        const blob = await response.blob();
        zip.file(`series-anh-${index + 1}.png`, blob);
      } catch (e) {
        console.error(`Could not fetch image ${img.id}: `, e);
      }
    };
    
    await Promise.all(imagesToDownload.map(fetchImage));

    zip.generateAsync({ type: 'blob' }).then(function (content: any) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = 'series-anh.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsZipping(false);
    });
  };

  const handleDownloadSelected = () => {
    const selectedImages = successfulImages.filter(img => selectedImageIds.has(img.id));
    handleDownload(selectedImages);
  };
  
  const handleDownloadAll = () => {
    handleDownload(successfulImages);
  };

  const hasFinished = generatedImages.length > 0 && generatedImages.every(img => img.status !== 'generating' && img.status !== 'retrying');

  return (
    <div className="w-full h-full flex flex-col">
      <h3 className="text-xl font-semibold text-indigo-400 mb-4 text-center">Kết quả cuối cùng</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 flex-grow overflow-y-auto p-2">
        {generatedImages.map((image, index) => (
          <ImageCard
            key={image.id}
            result={image}
            index={index}
            onOpenEditModal={onOpenEditModal}
            isSelected={selectedImageIds.has(image.id)}
            onToggleSelection={onToggleSelection}
            onRegenerate={onRegenerateImage}
          />
        ))}
      </div>
      {hasFinished && (
        <div className="mt-4 pt-4 border-t border-gray-700 flex flex-col gap-4">
           {hasRetryableImages && (
             <div className="flex justify-center">
                <button
                    onClick={onRetryFailed}
                    className={`bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center text-base ${isQuotaExceeded ? 'animate-pulse' : ''}`}
                >
                    <i className="fas fa-sync-alt mr-2"></i>
                    Thử lại ảnh lỗi & bị hủy ({retryableImages.length})
                </button>
             </div>
           )}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
                onClick={handleDownloadSelected}
                disabled={selectedImageIds.size === 0 || isZipping}
                className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center disabled:bg-teal-800 disabled:cursor-not-allowed"
            >
              <i className={`fas ${isZipping ? 'fa-spinner fa-spin' : 'fa-download'} mr-2`}></i>
              {isZipping ? 'Đang nén...' : `Tải ảnh đã chọn (${selectedImageIds.size})`}
            </button>
            <button
                onClick={handleDownloadAll}
                disabled={successfulImages.length === 0 || isZipping}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center disabled:bg-blue-800 disabled:cursor-not-allowed"
            >
              <i className={`fas ${isZipping ? 'fa-spinner fa-spin' : 'fa-file-archive'} mr-2`}></i>
              {isZipping ? 'Đang nén...' : 'Tải về tất cả'}
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                  onClick={onProceedToStep6}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                  Tạo Prompt Video (Bước 6) <i className="fas fa-arrow-right ml-2"></i>
              </button>
              <button
                  onClick={onProceedToStep7}
                  className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                  Tạo Thumbnail (Bước 7) <i className="fas fa-arrow-right ml-2"></i>
              </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageDisplay;
