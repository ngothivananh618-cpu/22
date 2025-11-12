import React from 'react';
import type { TeamMember } from '../App';

// Define props for the handlers
interface HeaderProps {
  activeUser?: TeamMember;
  onSaveProject: () => void;
  onLoadProject: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onShareProject: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeUser, onSaveProject, onLoadProject, onShareProject }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <header className="bg-gray-800/50 backdrop-blur-sm p-4 text-center shadow-lg border-b border-gray-700 relative">
      <div className="absolute top-1/2 -translate-y-1/2 left-4 flex items-center gap-2">
          <i className="fas fa-user-circle text-indigo-300 text-lg"></i>
          <span className="text-white font-semibold">{activeUser?.name || 'Chưa chọn'}</span>
      </div>
      <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">
        TM - MEDIA
      </h1>
      <p className="text-gray-400 mt-2 max-w-3xl mx-auto">
        TẠO ẢNH DÀNH RIÊNG CHO KÊNH MÁY BAY
      </p>
      {/* Project Management Buttons */}
      <div className="absolute top-1/2 -translate-y-1/2 right-4 flex gap-3">
        <button
          onClick={onShareProject}
          className="bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-300 text-sm flex items-center gap-2"
          title="Tạo liên kết để chia sẻ dự án"
        >
          <i className="fas fa-share-alt"></i>
          <span className="hidden md:inline">Chia sẻ</span>
        </button>
        <button
          onClick={onSaveProject}
          className="bg-gray-700 hover:bg-gray-600 text-indigo-300 font-semibold py-2 px-4 rounded-lg transition-colors duration-300 text-sm flex items-center gap-2"
        >
          <i className="fas fa-save"></i>
          <span className="hidden md:inline">Lưu</span>
        </button>
        <button
          onClick={handleLoadClick}
          className="bg-gray-700 hover:bg-gray-600 text-indigo-300 font-semibold py-2 px-4 rounded-lg transition-colors duration-300 text-sm flex items-center gap-2"
        >
          <i className="fas fa-folder-open"></i>
          <span className="hidden md:inline">Tải</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept=".json,.tmproj"
          onChange={onLoadProject}
          className="hidden"
        />
      </div>
    </header>
  );
};

export default Header;