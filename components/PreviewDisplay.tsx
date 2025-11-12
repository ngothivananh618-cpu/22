import React, { useState } from 'react';
import type { ImageResult, Character } from '../App';
import ImageCard from './ImageCard';
import ImageDisplay from './ImageDisplay';

interface PreviewDisplayProps {
    step: number;
    characters: Character[];
    contextPreview: ImageResult | null;
    onRegenerateContext: () => void;
    onRegenerateSingleCharacter: (id: string) => void;
    onSelectReferenceImage: (itemId: string, imageUrl: string) => void;
    generatedImages: ImageResult[];
    onOpenEditModal: (image: ImageResult) => void;
    selectedImageIds: Set<string>;
    onToggleImageSelection: (id: string) => void;
    onRegenerateSeriesImage: (id: string) => void;
    onRetryFailedSeries: () => void;
    videoPrompts: string[];
    isGeneratingVideoPrompts: boolean;
    onDownloadVideoPrompts: () => void;
    thumbnailResult: ImageResult | null;
    isGeneratingThumbnail: boolean;
    onProceedToStep6: () => void;
    onProceedToStep7: () => void;
    isGeneratingChars: boolean;
    isGeneratingSeries: boolean;
    onStopGeneration: () => void;
    isQuotaExceeded: boolean;
}


const LoadingSpinner: React.FC<{ text: string }> = ({ text }) => (
    <div className="flex flex-col items-center justify-center text-center h-full text-gray-400">
        <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-teal-500"></div>
        <p className="mt-4 text-lg">{text}</p>
    </div>
);

const Placeholder: React.FC = () => (
    <div className="flex flex-col items-center justify-center text-center text-gray-500 w-full h-full border-2 border-dashed border-gray-600 rounded-lg p-8">
        <i className="fas fa-film text-6xl mb-4"></i>
        <h3 className="text-xl font-semibold text-gray-400">Không gian sáng tạo của bạn</h3>
        <p className="mt-2">Kết quả xem trước hoặc series ảnh cuối cùng sẽ xuất hiện ở đây.</p>
    </div>
);

const ZoomableImageCard: React.FC<{
    result: ImageResult;
    title: string;
    isSelected: boolean;
    onRegenerate: (id: string) => void;
    onSelect: () => void;
}> = ({ result, title, isSelected, onRegenerate, onSelect }) => {
    const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - left) / width) * 100;
        const y = ((e.clientY - top) / height) * 100;
        setZoomPosition({ x, y });
    };

    if (result.status === 'generating') {
        return (
            <div className="w-full aspect-video bg-gray-700 rounded-lg flex flex-col items-center justify-center p-2 border-2 border-dashed border-teal-500/50">
                <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-teal-500"></div>
                <p className="mt-2 text-sm text-gray-300">Đang tạo...</p>
                <p className="font-bold text-sm text-white truncate mt-1">{title}</p>
            </div>
        );
    }

    if (result.status === 'error') {
        return (
            <div className="w-full aspect-video bg-gray-700 rounded-lg flex flex-col items-center justify-center p-2 border border-red-500/30 relative group">
                <i className="fas fa-exclamation-circle text-3xl text-red-400 mb-2"></i>
                <h4 className="font-bold text-sm text-red-400 text-center">{title}</h4>
                <p className="text-xs text-center text-gray-400 mt-1">{result.error}</p>
                 <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                        onClick={() => onRegenerate(result.id)}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded-lg text-sm"
                    >
                        <i className="fas fa-sync-alt mr-2"></i>
                        Thử lại
                    </button>
                </div>
            </div>
        )
    }

    if (result.status === 'cancelled') {
        return (
           <div className="w-full aspect-video bg-gray-700 rounded-lg flex flex-col items-center justify-center p-2 border border-gray-600 relative">
              <i className="fas fa-ban text-4xl text-gray-500 mb-2"></i>
              <h4 className="font-bold text-sm text-gray-400 text-center">{title}</h4>
              <p className="text-xs text-center text-gray-500 mt-1">{result.error || 'Đã hủy'}</p>
           </div>
        )
      }
    
    return (
         <div 
            className={`w-full aspect-video relative group bg-gray-900 rounded-lg shadow-md overflow-hidden cursor-zoom-in transition-all duration-300 ${isSelected ? 'ring-4 ring-yellow-500 shadow-yellow-500/40' : 'ring-2 ring-transparent'}`}
            onMouseMove={handleMouseMove}
        >
            <img
                src={result.url!}
                alt={title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 ease-out group-hover:scale-[2.5]"
                style={{
                   transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 transition-opacity duration-300 opacity-100 group-hover:opacity-0">
                <h4 className="font-bold text-white text-sm truncate">{title} (Di chuột để phóng to)</h4>
            </div>
            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                 <button
                    onClick={onSelect}
                    className={`font-bold py-2 px-4 rounded-lg text-sm flex items-center shadow-lg transition-colors ${
                        isSelected 
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-black' 
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                >
                    {isSelected 
                        ? <><i className="fas fa-check-circle mr-2"></i>Đã chọn làm tham chiếu</> 
                        : <><i className="fas fa-check-circle mr-2"></i>Chọn làm tham chiếu</>}
                </button>
                <button
                    onClick={() => onRegenerate(result.id)}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center shadow-lg"
                >
                    <i className="fas fa-sync-alt mr-2"></i>
                    Tạo lại
                </button>
            </div>
        </div>
    );
};


const PreviewDisplay: React.FC<PreviewDisplayProps> = ({
    step,
    characters,
    contextPreview,
    onRegenerateContext,
    onRegenerateSingleCharacter,
    onSelectReferenceImage,
    generatedImages,
    onOpenEditModal,
    selectedImageIds,
    onToggleImageSelection,
    onRegenerateSeriesImage,
    onRetryFailedSeries,
    videoPrompts,
    isGeneratingVideoPrompts,
    onDownloadVideoPrompts,
    thumbnailResult,
    isGeneratingThumbnail,
    onProceedToStep6,
    onProceedToStep7,
    isGeneratingChars,
    isGeneratingSeries,
    onStopGeneration,
    isQuotaExceeded
}) => {
    const characterPreviews = characters.map(c => c.preview).filter(Boolean) as ImageResult[];

    if (step === 2 && contextPreview) { 
        return (
             <div className="w-full h-full flex flex-col">
                <h3 className="text-lg font-semibold text-indigo-400 mb-4 text-center">Xem trước Bối cảnh</h3>
                <div className="flex-grow">
                     <ZoomableImageCard 
                        result={contextPreview} 
                        title="Bối cảnh" 
                        isSelected={false}
                        onRegenerate={() => onRegenerateContext()}
                        onSelect={() => {}}
                     />
                </div>
            </div>
        );
    }
    
    if (step === 3 && (characters.some(c => c.preview) || isGeneratingChars)) { 
        const isGenerating = isGeneratingChars;
        return (
            <div className="w-full h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-indigo-400">Xem trước Nhân vật</h3>
                    {isGenerating && (
                        <button
                            onClick={onStopGeneration}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center text-sm"
                        >
                            <i className="fas fa-stop mr-2"></i> Dừng
                        </button>
                    )}
                </div>
                <p className="text-center text-sm text-gray-400 mb-4">Chọn một ảnh làm tham chiếu để AI giữ sự đồng bộ tốt nhất.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow overflow-y-auto pr-2">
                   {characters.map((char) => {
                       if (!char.preview) {
                           return <div key={char.id} className="w-full aspect-video bg-gray-700/50 rounded-lg flex flex-col items-center justify-center p-2 border-2 border-dashed border-gray-600">
                                <p className="text-sm text-gray-400">Đang chờ tạo...</p>
                                <p className="font-bold text-sm text-white truncate mt-1">{char.name}</p>
                           </div>
                       }
                       const isSelected = !!(char.referenceImageUrl && char.referenceImageUrl === char.preview?.url);
                       return <ZoomableImageCard 
                                key={char.id} 
                                result={char.preview!} 
                                title={char.name} 
                                isSelected={isSelected}
                                onRegenerate={() => onRegenerateSingleCharacter(char.id)}
                                onSelect={() => {
                                    if (char.preview?.url) {
                                        onSelectReferenceImage(char.id, char.preview.url);
                                    }
                                }}
                              />;
                   })}
                </div>
            </div>
        );
    }

    if (step >= 5 && (generatedImages.length > 0 || isGeneratingSeries)) {
        const isGenerating = isGeneratingSeries || generatedImages.some(img => img.status === 'generating');
        if (isGenerating) {
             return (
                <div className="w-full h-full flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-indigo-400">Đang tạo Series Ảnh...</h3>
                        <button
                            onClick={onStopGeneration}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center text-sm"
                        >
                            <i className="fas fa-stop mr-2"></i> Dừng
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow overflow-y-auto pr-2">
                       {generatedImages.map((image, index) => (
                           <ImageCard 
                               key={image.id}
                               result={image}
                               index={index}
                               onOpenEditModal={onOpenEditModal}
                           />
                       ))}
                    </div>
                </div>
            );
        }
        return <ImageDisplay 
                    generatedImages={generatedImages} 
                    onOpenEditModal={onOpenEditModal} 
                    onProceedToStep6={onProceedToStep6} 
                    onProceedToStep7={onProceedToStep7}
                    selectedImageIds={selectedImageIds}
                    onToggleSelection={onToggleImageSelection}
                    onRegenerateImage={onRegenerateSeriesImage}
                    onRetryFailed={onRetryFailedSeries}
                    isQuotaExceeded={isQuotaExceeded}
                />;
    }
    
    if (step === 6) {
        if (isGeneratingVideoPrompts) return <LoadingSpinner text="Đang tạo prompt video..." />;
        if (videoPrompts.length > 0) {
            return (
                <div className="w-full h-full flex flex-col">
                    <h3 className="text-lg font-semibold text-indigo-400 mb-4 text-center">Kết quả Prompt Video</h3>
                    <div className="w-full flex-grow bg-gray-900/50 rounded-lg p-4 overflow-y-auto mb-4 text-sm space-y-3">
                        {videoPrompts.map((prompt, index) => (
                            <p key={index} className="text-gray-300 border-b border-gray-700 pb-3">
                                <span className="font-semibold text-indigo-300">{index + 1}.</span> {prompt}
                            </p>
                        ))}
                    </div>
                    <button
                        onClick={onDownloadVideoPrompts}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-300 flex items-center justify-center self-center"
                    >
                        <i className="fas fa-download mr-2"></i>
                        Tải về (.txt)
                    </button>
                </div>
            );
        }
    }
    
    if (step === 7) {
        if (isGeneratingThumbnail) return <LoadingSpinner text="Đang tạo thumbnail..." />;
        if (thumbnailResult) {
            return (
                 <div className="w-full h-full flex flex-col items-center">
                    <h3 className="text-lg font-semibold text-indigo-400 mb-4 text-center">Kết quả Thumbnail</h3>
                    {thumbnailResult.status === 'success' && thumbnailResult.url && (
                        <div className="w-full aspect-video bg-gray-900 rounded-lg shadow-lg overflow-hidden mb-4">
                            <img src={thumbnailResult.url} alt="Generated Thumbnail" className="w-full h-full object-contain" />
                        </div>
                    )}
                     {thumbnailResult.status === 'error' && (
                        <div className="w-full aspect-video bg-gray-800 rounded-lg flex flex-col items-center justify-center p-4 border border-red-500/30 mb-4">
                            <i className="fas fa-exclamation-triangle text-4xl text-red-400 mb-2"></i>
                            <h4 className="font-bold text-red-400">Lỗi tạo thumbnail</h4>
                            <p className="text-xs text-center text-gray-400 mt-1">{thumbnailResult.error}</p>
                        </div>
                    )}
                    {thumbnailResult.url && (
                        <a
                            href={thumbnailResult.url}
                            download="youtube-thumbnail.png"
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-300 flex items-center justify-center"
                        >
                            <i className="fas fa-download mr-2"></i>
                            Tải Thumbnail
                        </a>
                    )}
                 </div>
            );
        }
    }

    const hasAnyPreviews = contextPreview || characters.some(c => c.preview);
    if (!hasAnyPreviews) return <Placeholder />;

    return <Placeholder />;
};

export default PreviewDisplay;