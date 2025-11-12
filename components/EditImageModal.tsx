
import React, { useState } from 'react';
import type { ImageResult } from '../App';
import { editImage } from '../services/geminiService';

interface EditImageModalProps {
  image: ImageResult;
  onClose: () => void;
  onApply: (editedImage: ImageResult) => void;
  language: string;
}

const EditImageModal: React.FC<EditImageModalProps> = ({ image, onClose, onApply, language }) => {
  const [prompt, setPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);

  const handleEdit = async () => {
    if (!prompt.trim()) {
      setError("Vui lòng nhập yêu cầu chỉnh sửa.");
      return;
    }
    if (!image.url) return;

    setIsEditing(true);
    setError(null);

    try {
        const [header, base64Data] = image.url.split(',');
        const mimeTypeMatch = header.match(/:(.*?);/);

        if (!base64Data || !mimeTypeMatch) {
            throw new Error("Định dạng ảnh gốc không hợp lệ.");
        }
        
        const newUrl = await editImage(prompt, { base64: base64Data, mimeType: mimeTypeMatch[1] }, language);
        setEditedImageUrl(newUrl);

    } catch (err) {
        const message = err instanceof Error ? err.message : 'Lỗi không xác định';
        setError(message);
    } finally {
        setIsEditing(false);
    }
  };

  const handleSave = () => {
    if (editedImageUrl) {
        onApply({ ...image, url: editedImageUrl });
    }
  };

  const currentImageUrl = editedImageUrl || image.url;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-4xl mx-4 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-indigo-400">Chỉnh sửa ảnh</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow overflow-y-auto pr-2">
            <div className="w-full aspect-video bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden">
                {isEditing ? (
                    <div className="flex flex-col items-center">
                        <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-indigo-500"></div>
                        <p className="mt-4 text-gray-300">Đang áp dụng thay đổi...</p>
                    </div>
                ) : (
                    currentImageUrl ? (
                        <img src={currentImageUrl} alt="Ảnh đang chỉnh sửa" className="w-full h-full object-contain" />
                    ) : (
                        <p className="text-gray-500">Không có ảnh để hiển thị</p>
                    )
                )}
            </div>

            <div className="flex flex-col space-y-4">
                 <label htmlFor="edit-prompt" className="block text-sm font-medium text-gray-300">
                    Bạn muốn thay đổi điều gì?
                </label>
                <textarea
                  id="edit-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ví dụ: Xóa chữ ký ở góc phải, thêm một con chim đang bay trên trời..."
                  rows={4}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                
                {error && <p className="text-sm text-red-400 bg-red-900/50 p-3 rounded-md">{error}</p>}
                
                {editedImageUrl ? (
                    <div className="bg-green-900/50 text-green-300 p-3 rounded-md text-sm">
                        <i className="fas fa-check-circle mr-2"></i>
                        Chỉnh sửa thành công! Bạn có thể lưu thay đổi hoặc thử lại.
                    </div>
                ): null}

                <div className="mt-auto flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={handleEdit}
                        disabled={isEditing}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center disabled:bg-indigo-900"
                    >
                       <i className="fas fa-magic-wand-sparkles mr-2"></i>
                       {editedImageUrl ? 'Thử lại' : 'Áp dụng thay đổi'}
                    </button>
                    {editedImageUrl && (
                         <button
                            onClick={handleSave}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center"
                        >
                           <i className="fas fa-save mr-2"></i>
                           Lưu thay đổi
                        </button>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default EditImageModal;
