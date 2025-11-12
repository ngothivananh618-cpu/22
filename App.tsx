
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Header from './components/Header';
import ProgressBar from './components/ProgressBar';
import InputField from './components/InputField';
import PreviewDisplay from './components/PreviewDisplay';
import EditImageModal from './components/EditImageModal';
import { researchAndExtractDetails, generateImage, generateImageWithReferences, generateVideoPrompts, generateThumbnail } from './services/geminiService';

declare const pako: any;

export type ImageResult = {
    id: string;
    promptId?: string; // The ID of the prompt used to generate this image
    status: 'generating' | 'success' | 'error' | 'retrying' | 'cancelled';
    url?: string | null;
    error?: string | null;
    generatedBy?: string; // Name of the team member who generated it
};

export type Setting = {
    place: string;
    time: string;
    weather: string;
    season: string;
    mood: string;
    socialContext: string;
    theme: {
        centralIdea: string;
        thematicQuestion: string;
    };
};

export type Character = {
    id: string;
    name: string;
    isMain: boolean;
    goal: string;
    motivation: string;
    conflict: string;
    appearanceAndBehavior: string;
    backstory: string;
    characterArc: string;
    preview?: ImageResult;
    referenceImageUrl?: string | null;
};

export type TeamMember = {
    id: string;
    name: string;
};


const API_CALL_DELAY = 2500; // 2.5 seconds
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const App: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
    
    // Team management state
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([{ id: uuidv4(), name: 'Thành viên 1' }]);
    const [activeUserId, setActiveUserId] = useState<string | null>(() => teamMembers[0]?.id || null);
    
    useEffect(() => {
        // Ensure there's always an active user if the list is not empty
        if (!activeUserId && teamMembers.length > 0) {
            setActiveUserId(teamMembers[0].id);
        }
    }, [teamMembers, activeUserId]);


    // Step 1: Script
    const [script, setScript] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [newMemberName, setNewMemberName] = useState('');


    // Step 2: Context
    const [settingDetails, setSettingDetails] = useState<Setting | null>(null);
    const [contextPrompt, setContextPrompt] = useState('');
    const [contextPreview, setContextPreview] = useState<ImageResult | null>(null);


    // Step 3: Characters
    const [characters, setCharacters] = useState<Character[]>([]);
    const [isGeneratingChars, setIsGeneratingChars] = useState(false);


    // Step 5: Series Generation
    const [seriesPrompts, setSeriesPrompts] = useState<{ id: string, value: string }[]>([]);
    const [generatedImages, setGeneratedImages] = useState<ImageResult[]>([]);
    const [selectedImageIds, setSelectedImageIds] = useState(new Set<string>());


    // Step 6: Video Prompts
    const [videoPrompts, setVideoPrompts] = useState<string[]>([]);
    const [isGeneratingVideoPrompts, setIsGeneratingVideoPrompts] = useState(false);

    // Step 7: Thumbnail
    const [thumbnailTopic, setThumbnailTopic] = useState('');
    const [thumbnailResult, setThumbnailResult] = useState<ImageResult | null>(null);
    const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);

    // Edit Modal State
    const [editingImage, setEditingImage] = useState<ImageResult | null>(null);
    
    // Stop generation state
    const isStoppingRef = useRef(false);

    const activeUser = useMemo(() => teamMembers.find(m => m.id === activeUserId), [teamMembers, activeUserId]);


    const handleNextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 7));
    const handlePrevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));
    const goToStep = (step: number) => setCurrentStep(step);

    const handleStopGeneration = useCallback(() => {
        isStoppingRef.current = true;
    }, []);

    const handleAnalyzeScript = async () => {
        setIsAnalyzing(true);
        setError(null);
        isStoppingRef.current = false;
        try {
            const { setting, characters: analyzedChars } = await researchAndExtractDetails(script);
            setSettingDetails(setting);
            const generatedContextPrompt = `Bối cảnh chính: ${setting.place} vào ${setting.time}. Thời tiết: ${setting.weather} (${setting.season}). Bầu không khí ${setting.mood}.`;
            setContextPrompt(generatedContextPrompt);

            setCharacters(analyzedChars.map(char => ({ ...char, id: uuidv4(), preview: undefined, referenceImageUrl: null })));
            setCurrentStep(2);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred during analysis.';
            setError(message);
            setSettingDetails(null); // Reset data on failure
            setCharacters([]);       // Reset data on failure
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleGenerateContext = async () => {
        const id = 'context-preview';
        setContextPreview({ id, status: 'generating' });
        try {
            const url = await generateImage(contextPrompt);
            setContextPreview({ id, status: 'success', url, generatedBy: activeUser?.name });
        } catch (err) {
            setContextPreview({ id, status: 'error', error: err instanceof Error ? err.message : 'Lỗi không xác định' });
        }
    };
    
    const handleCharacterChange = (id: string, field: keyof Character, value: string) => {
        setCharacters(chars => chars.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const handleAddNewCharacter = () => {
        const newChar: Character = {
            id: uuidv4(),
            name: 'Nhân vật mới',
            isMain: false,
            goal: '',
            motivation: '',
            conflict: '',
            appearanceAndBehavior: '',
            backstory: '',
            characterArc: '',
            preview: undefined,
            referenceImageUrl: null
        };
        setCharacters(prev => [...prev, newChar]);
    };

    const handleGenerateSingleCharacter = useCallback(async (id: string) => {
        const character = characters.find(c => c.id === id);
        if (!character) return;

        setCharacters(chars => chars.map(c => c.id === id ? { ...c, preview: { id, status: 'generating' } } : c));

        try {
            const prompt = `${character.appearanceAndBehavior}. Bối cảnh: ${contextPrompt}`;
            const url = await generateImage(prompt);
            setCharacters(chars => chars.map(c => c.id === id ? { ...c, preview: { id, status: 'success', url, generatedBy: activeUser?.name } } : c));
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Lỗi không xác định';
            setCharacters(chars => chars.map(c => c.id === id ? { ...c, preview: { id, status: 'error', error: errorMsg } } : c));
            throw err; // Re-throw to be caught by the sequential generator
        }
    }, [characters, contextPrompt, activeUser]);

    const handleGenerateAllCharacterPreviews = async () => {
        setIsGeneratingChars(true);
        setError(null);
        isStoppingRef.current = false; // Reset on start

        const charactersToGenerate = characters.filter(c => !c.preview || c.preview.status !== 'success');

        for (let i = 0; i < charactersToGenerate.length; i++) {
             if (isStoppingRef.current) {
                const remainingCharIds = new Set(charactersToGenerate.slice(i).map(c => c.id));
                setCharacters(chars =>
                    chars.map(c => {
                        if (remainingCharIds.has(c.id) && (!c.preview || c.preview.status === 'generating')) {
                            return { ...c, preview: { id: c.id, status: 'cancelled', error: 'Người dùng đã dừng' } };
                        }
                        return c;
                    })
                );
                break;
            }

            const char = charactersToGenerate[i];
            try {
                await handleGenerateSingleCharacter(char.id);
            } catch (err) {
                 const errorMsg = err instanceof Error ? err.message : 'Lỗi không xác định';
                 if (errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('limit')) {
                    setError('Hạn ngạch API của bạn đã đạt giới hạn. Hãy lưu dự án, gửi cho một thành viên khác trong nhóm để tải lên và tiếp tục.');
                    setIsQuotaExceeded(true);
                    // Cancel remaining characters
                    setCharacters(chars => {
                        const remainingCharIds = new Set(charactersToGenerate.slice(i + 1).map(c => c.id));
                         return chars.map(c => {
                            if (remainingCharIds.has(c.id) && (!c.preview || c.preview.status === 'generating')) {
                                return { ...c, preview: { id: c.id, status: 'cancelled', error: 'Bị hủy do giới hạn API' } };
                            }
                            return c;
                        });
                    });
                    break; // Exit the loop
                }
            }
            // Add delay between requests to avoid hitting rate limits, but not after the last one
            if (i < charactersToGenerate.length - 1) {
                await delay(API_CALL_DELAY);
            }
        }
        setIsGeneratingChars(false);
        isStoppingRef.current = false;
    };

    const handleProceedToSeries = () => {
        const prompts = script.split('\n').filter(Boolean).map(value => ({ id: uuidv4(), value }));
        setSeriesPrompts(prompts);
        handleNextStep();
    };
    
    const handleGenerateSeries = useCallback(async () => {
        const promptsToGenerate = seriesPrompts.filter(p => {
            const existingImage = generatedImages.find(img => img.promptId === p.id);
            return !existingImage || existingImage.status !== 'success';
        });

        if (promptsToGenerate.length === 0) {
            return;
        }

        setIsLoading(true);
        setError(null);
        isStoppingRef.current = false;
        setSelectedImageIds(new Set());

        setGeneratedImages(currentImgs => {
            const newImgs = [...currentImgs];
            promptsToGenerate.forEach(p => {
                const promptIndex = seriesPrompts.findIndex(sp => sp.id === p.id);
                const imageId = `series-${promptIndex}-${p.id}`;
                const existingImgIndex = newImgs.findIndex(img => img.promptId === p.id);
                const generatingImage: ImageResult = { id: imageId, promptId: p.id, status: 'generating' };

                if (existingImgIndex > -1) {
                    newImgs[existingImgIndex] = { ...newImgs[existingImgIndex], ...generatingImage };
                } else {
                    let insertIndex = newImgs.length;
                    for (let i = 0; i < newImgs.length; i++) {
                        const imgPromptIndex = seriesPrompts.findIndex(sp => sp.id === newImgs[i].promptId);
                        if (imgPromptIndex > promptIndex) {
                            insertIndex = i;
                            break;
                        }
                    }
                    newImgs.splice(insertIndex, 0, generatingImage);
                }
            });
            return newImgs;
        });
        
        const mainCharacters = characters.filter(c => c.isMain && c.referenceImageUrl);

        for (let i = 0; i < promptsToGenerate.length; i++) {
            if (isStoppingRef.current) {
                setGeneratedImages(imgs => imgs.map(img => img.status === 'generating' ? {...img, status: 'cancelled', error: 'Người dùng đã dừng'} : img));
                break;
            }

            const promptData = promptsToGenerate[i];

            try {
                const fullPrompt = `${promptData.value}. Bối cảnh: ${contextPrompt}`;
                const url = await generateImageWithReferences(fullPrompt, mainCharacters);
                setGeneratedImages(imgs => imgs.map(img => img.promptId === promptData.id ? { ...img, status: 'success', url, generatedBy: activeUser?.name } : img));
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Lỗi không xác định';
                setGeneratedImages(imgs => imgs.map(img => img.promptId === promptData.id ? { ...img, status: 'error', error: errorMsg } : img));
                
                if (errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('limit')) {
                    setError('Hạn ngạch API của bạn đã đạt giới hạn. Hãy lưu dự án, gửi cho một thành viên khác trong nhóm để tải lên và tiếp tục.');
                    setIsQuotaExceeded(true);
                    const remainingPromptsToCancel = promptsToGenerate.slice(i + 1);
                    setGeneratedImages(imgs => {
                        const newImgs = [...imgs];
                        remainingPromptsToCancel.forEach(p => {
                            const imgIndex = newImgs.findIndex(img => img.promptId === p.id);
                            if (imgIndex !== -1 && newImgs[imgIndex].status === 'generating') {
                                newImgs[imgIndex] = { ...newImgs[imgIndex], status: 'cancelled', error: 'Bị hủy do giới hạn API' };
                            }
                        });
                        return newImgs;
                    });
                    break;
                }
            }
            if (i < promptsToGenerate.length - 1) {
                await delay(API_CALL_DELAY);
            }
        }
        setIsLoading(false);
        isStoppingRef.current = false;
    }, [seriesPrompts, characters, contextPrompt, activeUser, generatedImages]);

    const handleGenerateSingleSeriesImageFromPrompt = useCallback(async (promptId: string) => {
        const promptData = seriesPrompts.find(p => p.id === promptId);
        if (!promptData) {
            setError(`Không tìm thấy prompt gốc.`);
            return;
        }
    
        setIsLoading(true);
        setError(null);
    
        const promptIndex = seriesPrompts.findIndex(p => p.id === promptId);
        const imageId = `series-${promptIndex}-${promptId}`;
    
        setGeneratedImages(currentImgs => {
            const newImgs = [...currentImgs];
            const existingImgIndex = newImgs.findIndex(img => img.promptId === promptId);
            const generatingImage: ImageResult = { id: imageId, promptId, status: 'generating' };
    
            if (existingImgIndex > -1) {
                newImgs[existingImgIndex] = { ...newImgs[existingImgIndex], ...generatingImage };
            } else {
                let insertIndex = newImgs.length;
                for (let i = 0; i < newImgs.length; i++) {
                    const imgPromptIndex = seriesPrompts.findIndex(sp => sp.id === newImgs[i].promptId);
                    if (imgPromptIndex > promptIndex) {
                        insertIndex = i;
                        break;
                    }
                }
                newImgs.splice(insertIndex, 0, generatingImage);
            }
            return newImgs;
        });
    
        const mainCharacters = characters.filter(c => c.isMain && c.referenceImageUrl);
    
        try {
            const fullPrompt = `${promptData.value}. Bối cảnh: ${contextPrompt}`;
            const url = await generateImageWithReferences(fullPrompt, mainCharacters);
            setGeneratedImages(currentImgs => currentImgs.map(img => (img.promptId === promptId) ? { ...img, status: 'success', url, generatedBy: activeUser?.name } : img));
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Lỗi không xác định';
            setGeneratedImages(currentImgs => currentImgs.map(img => (img.promptId === promptId) ? { ...img, status: 'error', error: errorMsg } : img));
            if (errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('limit')) {
                setError('Hạn ngạch API của bạn đã đạt giới hạn.');
                setIsQuotaExceeded(true);
            }
        } finally {
            setIsLoading(false);
        }
    }, [seriesPrompts, characters, contextPrompt, activeUser]);
    
    const handleRegenerateSingleSeriesImage = async (imageId: string) => {
        const imageToRegen = generatedImages.find(img => img.id === imageId);
        if (!imageToRegen || !imageToRegen.promptId) {
            setError(`Không tìm thấy thông tin prompt cho ảnh.`);
            return;
        }

        // Use the new single generation function
        await handleGenerateSingleSeriesImageFromPrompt(imageToRegen.promptId);
    };

    const handleRetryFailedSeriesImages = async () => {
        setIsQuotaExceeded(false);
        setError(null);
        setIsLoading(true);
        isStoppingRef.current = false;
    
        const imagesToRetry = generatedImages.filter(img => (img.status === 'error' || img.status === 'cancelled') && img.promptId);
    
        for (const image of imagesToRetry) {
             if (isStoppingRef.current) {
                setGeneratedImages(imgs => imgs.map(img => img.status === 'generating' ? {...img, status: 'cancelled', error: 'Người dùng đã dừng'} : img));
                break;
            }

            // Use the single generation function for retrying
            await handleGenerateSingleSeriesImageFromPrompt(image.promptId!);
    
            // Add a delay between retries
            await delay(API_CALL_DELAY);
        }
        setIsLoading(false);
        isStoppingRef.current = false;
    };

    const handleToggleImageSelection = (id: string) => {
        setSelectedImageIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleGenerateVideoPrompts = async () => {
        setIsGeneratingVideoPrompts(true);
        try {
            const mainCharacters = characters.filter(c => c.isMain);
            const result = await generateVideoPrompts(script, mainCharacters);
            setVideoPrompts(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi khi tạo video prompts.');
        } finally {
            setIsGeneratingVideoPrompts(false);
        }
    };
    
    const handleDownloadVideoPrompts = () => {
        const content = videoPrompts.join('\n');
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'video-prompts.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleGenerateThumbnail = async () => {
        const id = 'thumbnail';
        setThumbnailResult({ id, status: 'generating' });
        setIsGeneratingThumbnail(true);
        try {
            const url = await generateThumbnail(thumbnailTopic, script);
            setThumbnailResult({ id, status: 'success', url, generatedBy: activeUser?.name });
        } catch (err) {
            setThumbnailResult({ id, status: 'error', error: err instanceof Error ? err.message : 'Lỗi không xác định' });
        } finally {
            setIsGeneratingThumbnail(false);
        }
    };
    
    const handleApplyEdit = (editedImage: ImageResult) => {
        const updatedImage = { ...editedImage, generatedBy: `Sửa bởi ${activeUser?.name}` };
        setGeneratedImages(imgs => imgs.map(img => img.id === updatedImage.id ? updatedImage : img));
        setCharacters(chars => chars.map(c => c.preview?.id === updatedImage.id ? { ...c, preview: updatedImage } : c));
        if (contextPreview?.id === updatedImage.id) setContextPreview(updatedImage);
        if (thumbnailResult?.id === updatedImage.id) setThumbnailResult(updatedImage);
        setEditingImage(null);
    };

    const handleSaveProject = () => {
        const projectState = {
            metadata: {
                savedBy: activeUser?.name || 'Không rõ',
                savedAt: new Date().toISOString(),
            },
            appState: {
                currentStep, script, settingDetails, contextPrompt, contextPreview,
                characters, seriesPrompts, generatedImages, videoPrompts, thumbnailTopic,
                thumbnailResult, selectedImageIds: Array.from(selectedImageIds),
                teamMembers, activeUserId,
            }
        };
        const jsonString = JSON.stringify(projectState, null, 2);
        const compressedData = pako.gzip(jsonString);
    
        const blob = new Blob([compressedData], { type: 'application/octet-stream' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.download = `tm-media-project-${timestamp}.tmproj`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleLoadProject = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const arrayBuffer = e.target?.result as ArrayBuffer;
                if (!arrayBuffer) throw new Error("File could not be read.");
    
                let jsonText: string;
                try {
                    jsonText = pako.ungzip(new Uint8Array(arrayBuffer), { to: 'string' });
                } catch (unzipError) {
                    jsonText = new TextDecoder().decode(arrayBuffer);
                }

                const loadedProject = JSON.parse(jsonText);
                const loadedState = loadedProject.appState || loadedProject;

                if (!loadedState.script || !loadedState.currentStep) {
                    throw new Error("Invalid project file format.");
                }

                setCurrentStep(loadedState.currentStep || 1);
                setScript(loadedState.script || '');
                setSettingDetails(loadedState.settingDetails || null);
                setContextPrompt(loadedState.contextPrompt || '');
                setContextPreview(loadedState.contextPreview || null);
                setCharacters(loadedState.characters || []);
                setSeriesPrompts(loadedState.seriesPrompts || []);
                setGeneratedImages(loadedState.generatedImages || []);
                setVideoPrompts(loadedState.videoPrompts || []);
                setThumbnailTopic(loadedState.thumbnailTopic || '');
                setThumbnailResult(loadedState.thumbnailResult || null);
                setSelectedImageIds(new Set(loadedState.selectedImageIds || []));
                setTeamMembers(loadedState.teamMembers || [{ id: uuidv4(), name: 'Thành viên 1' }]);
                setActiveUserId(loadedState.activeUserId || (loadedState.teamMembers?.[0]?.id || null));

                 if(loadedProject.metadata?.savedBy) {
                    alert(`Dự án được tải lên, được lưu lần cuối bởi ${loadedProject.metadata.savedBy} lúc ${new Date(loadedProject.metadata.savedAt).toLocaleString()}`);
                 }
                setError(null);
                setIsQuotaExceeded(false);
            } catch (err) {
                 const message = err instanceof Error ? err.message : 'An unknown error occurred.';
                 setError(`Không thể tải dự án: ${message}`);
            }
        };
        reader.onerror = () => setError("Lỗi khi đọc file dự án.");
        reader.readAsArrayBuffer(file);
        event.target.value = '';
    };

    const handleAddMember = () => {
        if (newMemberName.trim()) {
            const newMember = { id: uuidv4(), name: newMemberName.trim() };
            setTeamMembers([...teamMembers, newMember]);
            setNewMemberName('');
            if (!activeUserId) {
                setActiveUserId(newMember.id);
            }
        }
    };

    const handleRemoveMember = (id: string) => {
        setTeamMembers(teamMembers.filter(m => m.id !== id));
        if (activeUserId === id) {
            setActiveUserId(teamMembers[0]?.id || null);
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-6">
                        <div>
                          <h2 className="text-xl font-bold text-indigo-400">Bước 1: Kịch bản & Đội nhóm</h2>
                        </div>
                        
                        <div className="space-y-4 bg-gray-700/30 p-4 rounded-lg">
                            <h3 className="font-semibold text-lg text-teal-300">Không gian làm việc nhóm</h3>
                            <div className="space-y-2">
                                <label htmlFor="activeUser" className="block text-sm font-medium text-gray-300">Người thực hiện hiện tại:</label>
                                <select 
                                    id="activeUser"
                                    value={activeUserId || ''}
                                    onChange={(e) => setActiveUserId(e.target.value)}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                >
                                    {teamMembers.map(member => (
                                        <option key={member.id} value={member.id}>{member.name}</option>
                                    ))}
                                </select>
                            </div>
                             <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-300">Thành viên:</label>
                                <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                                    {teamMembers.map(member => (
                                        <div key={member.id} className="flex items-center justify-between bg-gray-800/50 p-2 rounded">
                                            <span className="text-sm">{member.name}</span>
                                            <button onClick={() => handleRemoveMember(member.id)} className="text-red-400 hover:text-red-300 text-xs" disabled={teamMembers.length <= 1}>
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                             <div className="flex gap-2">
                                <input 
                                    type="text"
                                    value={newMemberName}
                                    onChange={(e) => setNewMemberName(e.target.value)}
                                    placeholder="Tên thành viên mới..."
                                    className="flex-grow bg-gray-700 border border-gray-600 rounded-lg p-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                                />
                                <button onClick={handleAddMember} className="bg-blue-600 hover:bg-blue-500 rounded p-2 text-sm">Thêm</button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <InputField label="Nội dung kịch bản" name="script" value={script} onChange={(e) => setScript(e.target.value)} placeholder="Dán toàn bộ kịch bản của bạn vào đây..." isTextArea rows={10} />
                            <button onClick={handleAnalyzeScript} disabled={isAnalyzing || !script || isQuotaExceeded} className="w-full bg-indigo-600 hover:bg-indigo-500 rounded p-2 disabled:bg-indigo-800 disabled:cursor-not-allowed">
                                {isAnalyzing ? 'Đang phân tích...' : 'Phân tích & Tiếp tục'}
                            </button>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-indigo-400">Bước 2: Bối cảnh</h2>
                        {settingDetails && (
                            <div className="space-y-3 text-sm bg-gray-700/50 p-3 rounded-lg">
                                <p><strong><i className="fas fa-map-marker-alt mr-2 text-red-400"></i>Địa điểm:</strong> {settingDetails.place}</p>
                                <p><strong><i className="fas fa-clock mr-2 text-blue-400"></i>Thời gian:</strong> {settingDetails.time}</p>
                                <p><strong><i className="fas fa-cloud-sun-rain mr-2 text-teal-400"></i>Thời tiết:</strong> {settingDetails.weather}</p>
                                <p><strong><i className="fas fa-calendar-alt mr-2 text-orange-400"></i>Mùa:</strong> {settingDetails.season}</p>
                                <p><strong><i className="fas fa-wind mr-2 text-cyan-400"></i>Bầu không khí:</strong> {settingDetails.mood}</p>
                                <p><strong><i className="fas fa-users mr-2 text-yellow-400"></i>Bối cảnh XH:</strong> {settingDetails.socialContext}</p>
                            </div>
                        )}
                        <InputField label="Prompt tóm tắt bối cảnh (có thể sửa)" name="contextPrompt" value={contextPrompt} onChange={(e) => setContextPrompt(e.target.value)} isTextArea />
                        <p className="text-xs text-center text-gray-400 bg-gray-700/30 p-2 rounded-md">
                          <i className="fas fa-info-circle mr-1"></i>
                          Tất cả hình ảnh sẽ được tạo ở tỷ lệ 16:9 (widescreen).
                        </p>
                        <button onClick={handleGenerateContext} disabled={isLoading || !contextPrompt || isQuotaExceeded} className="w-full bg-indigo-600 hover:bg-indigo-500 rounded p-2 disabled:bg-indigo-800">Tạo ảnh xem trước Bối cảnh</button>
                        <div className="flex gap-2">
                            <button onClick={handlePrevStep} className="w-full bg-gray-600 hover:bg-gray-500 rounded p-2">Quay lại</button>
                            <button onClick={handleNextStep} disabled={!contextPreview || contextPreview.status !== 'success'} className="w-full bg-green-600 hover:bg-green-500 rounded p-2 disabled:bg-green-800">Tiếp tục</button>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-4 flex flex-col h-full">
                        <h2 className="text-xl font-bold text-indigo-400">Bước 3: Hồ sơ Nhân vật</h2>
                        <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                            {characters.map((char) => (
                                <details key={char.id} className="bg-gray-700 p-3 rounded-lg space-y-2 group" open>
                                    <summary className="font-bold text-lg cursor-pointer flex justify-between items-center">
                                        <span>{char.name} {char.isMain && <i className="fas fa-star text-yellow-400 ml-2" title="Nhân vật chính"></i>}</span>
                                        <i className="fas fa-chevron-down group-open:rotate-180 transition-transform"></i>
                                    </summary>
                                    <div className="pt-2 space-y-2">
                                        <InputField label="Ngoại hình & Hành vi" name={`appearance_${char.id}`} value={char.appearanceAndBehavior} onChange={(e) => handleCharacterChange(char.id, 'appearanceAndBehavior', e.target.value)} isTextArea />
                                        <InputField label="Mục tiêu" name={`goal_${char.id}`} value={char.goal} onChange={(e) => handleCharacterChange(char.id, 'goal', e.target.value)} />
                                        <InputField label="Động lực" name={`motivation_${char.id}`} value={char.motivation} onChange={(e) => handleCharacterChange(char.id, 'motivation', e.target.value)} isTextArea />
                                    </div>
                                </details>
                            ))}
                        </div>
                        <div className="mt-auto space-y-2">
                            <button onClick={handleAddNewCharacter} className="w-full bg-blue-600 hover:bg-blue-500 rounded p-2 text-sm flex items-center justify-center gap-2">
                                <i className="fas fa-plus"></i>Thêm Nhân vật mới
                            </button>
                            <button onClick={handleGenerateAllCharacterPreviews} disabled={isGeneratingChars || isQuotaExceeded} className="w-full bg-teal-600 hover:bg-teal-500 rounded p-3 text-lg disabled:bg-teal-800 disabled:cursor-not-allowed">
                                {isGeneratingChars ? 'Đang tạo...' : 'Tạo tất cả ảnh xem trước'}
                            </button>
                            <div className="flex gap-2">
                                <button onClick={handlePrevStep} className="w-full bg-gray-600 hover:bg-gray-500 rounded p-2">Quay lại</button>
                                <button onClick={handleNextStep} disabled={characters.some(c => !c.preview || c.preview.status !== 'success')} className="w-full bg-green-600 hover:bg-green-500 rounded p-2 disabled:bg-green-800">Tiếp tục</button>
                            </div>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-indigo-400">Bước 4: Chủ đề (Theme)</h2>
                        {settingDetails?.theme && (
                            <div className="space-y-3 text-sm bg-gray-700/50 p-3 rounded-lg">
                                <p><strong><i className="fas fa-lightbulb mr-2 text-purple-400"></i>Ý tưởng trung tâm:</strong> {settingDetails.theme.centralIdea}</p>
                                <p><strong><i className="fas fa-question-circle mr-2 text-purple-400"></i>Câu hỏi triết lý:</strong> {settingDetails.theme.thematicQuestion}</p>
                            </div>
                        )}
                        <p className="text-sm text-gray-400">Xem lại chủ đề đã được phân tích. Chủ đề này sẽ định hướng tông màu và cảm xúc cho series ảnh.</p>
                        <div className="flex gap-2">
                            <button onClick={handlePrevStep} className="w-full bg-gray-600 hover:bg-gray-500 rounded p-2">Quay lại</button>
                            <button onClick={handleProceedToSeries} className="w-full bg-green-600 hover:bg-green-500 rounded p-2">Tiếp tục tạo Series</button>
                        </div>
                    </div>
                );
            case 5:
                return (
                    <div className="space-y-4 flex flex-col h-full">
                        <h2 className="text-xl font-bold text-indigo-400">Bước 5: Tạo Series Ảnh</h2>
                        <p className="text-sm text-gray-400">Tổng: {seriesPrompts.length}</p>
                        <div className="flex-grow overflow-y-auto pr-2 space-y-2">
                          {seriesPrompts.map((p, index) => {
                            const associatedImage = generatedImages.find(img => img.promptId === p.id);
                            const isThisOneGenerating = associatedImage?.status === 'generating' || associatedImage?.status === 'retrying';

                            return (
                                <div key={p.id} className="flex items-center gap-2">
                                    <span className="text-gray-400 font-mono text-sm w-6 text-center">{index + 1}.</span>
                                    <div className="flex-grow">
                                        <InputField label="" name={`prompt_${p.id}`} value={p.value} onChange={e => setSeriesPrompts(prompts => prompts.map(prompt => prompt.id === p.id ? { ...prompt, value: e.target.value } : prompt))} placeholder="Mô tả cảnh..." />
                                    </div>
                                    <button
                                        onClick={() => handleGenerateSingleSeriesImageFromPrompt(p.id)}
                                        disabled={isLoading || isThisOneGenerating || isQuotaExceeded}
                                        className="p-2 w-10 h-10 flex-shrink-0 flex items-center justify-center bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg transition-colors disabled:bg-teal-800 disabled:cursor-not-allowed"
                                        title={associatedImage?.status === 'success' ? "Tạo lại ảnh này" : "Tạo ảnh này"}
                                    >
                                        {isThisOneGenerating
                                            ? <i className="fas fa-spinner fa-spin"></i>
                                            : <i className={`fas ${associatedImage?.status === 'success' ? 'fa-sync-alt' : 'fa-play'}`}></i>
                                        }
                                    </button>
                                </div>
                            );
                          })}
                        </div>
                        <button onClick={handleGenerateSeries} disabled={isLoading || isQuotaExceeded} className="w-full bg-indigo-600 hover:bg-indigo-500 rounded p-3 text-lg disabled:bg-indigo-800 disabled:cursor-not-allowed">
                            {isLoading ? 'Đang tạo...' : 'Bắt đầu tạo'}
                        </button>
                        <div className="flex gap-2">
                            <button onClick={handlePrevStep} className="w-full bg-gray-600 hover:bg-gray-500 rounded p-2">Quay lại</button>
                            <button onClick={handleNextStep} disabled={generatedImages.length === 0 || generatedImages.some(p => p.status !== 'success')} className="w-full bg-green-600 hover:bg-green-500 rounded p-2 disabled:bg-green-800">Tiếp tục</button>
                        </div>
                    </div>
                );
            case 6:
                 return (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-indigo-400">Bước 6: Tạo Prompt Video</h2>
                        <button onClick={handleGenerateVideoPrompts} disabled={isGeneratingVideoPrompts || isQuotaExceeded} className="w-full bg-orange-600 hover:bg-orange-500 rounded p-2 disabled:bg-orange-800 disabled:cursor-not-allowed">
                            {isGeneratingVideoPrompts ? 'Đang tạo...' : 'Tạo Prompt Video'}
                        </button>
                        <div className="flex gap-2">
                            <button onClick={handlePrevStep} className="w-full bg-gray-600 hover:bg-gray-500 rounded p-2">Quay lại</button>
                            <button onClick={handleNextStep} disabled={videoPrompts.length === 0} className="w-full bg-green-600 hover:bg-green-500 rounded p-2 disabled:bg-green-800">Tạo Thumbnail (Bước 7)</button>
                        </div>
                    </div>
                );
            case 7:
                return (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-indigo-400">Bước 7: Tạo Thumbnail</h2>
                        <InputField label="Chủ đề / Tiêu đề cho Thumbnail" name="thumbnailTopic" value={thumbnailTopic} onChange={(e) => setThumbnailTopic(e.target.value)} placeholder="VD: Thảm họa ở Louisville" />
                        <button onClick={handleGenerateThumbnail} disabled={isGeneratingThumbnail || !thumbnailTopic || isQuotaExceeded} className="w-full bg-purple-600 hover:bg-purple-500 rounded p-2 disabled:bg-purple-800 disabled:cursor-not-allowed">
                            {isGeneratingThumbnail ? 'Đang tạo...' : 'Tạo Thumbnail'}
                        </button>
                        <div className="flex gap-2">
                            <button onClick={handlePrevStep} className="w-full bg-gray-600 hover:bg-gray-500 rounded p-2">Quay lại</button>
                        </div>
                    </div>
                );
            default: return null;
        }
    };
    
    const characterPreviews = useMemo(() => characters.map(c => c.preview).filter(Boolean) as ImageResult[], [characters]);

    const activeStepForPreview = useMemo(() => {
        if (thumbnailResult || isGeneratingThumbnail) return 7;
        if (videoPrompts.length > 0 || isGeneratingVideoPrompts) return 6;
        if (generatedImages.length > 0 || isLoading) return 5;
        if (characterPreviews.length > 0 || isGeneratingChars) return 3;
        if (contextPreview) return 2;
        return 1;
    }, [thumbnailResult, isGeneratingThumbnail, videoPrompts, isGeneratingVideoPrompts, generatedImages, isLoading, characterPreviews, isGeneratingChars, contextPreview]);


    return (
        <div className="bg-gray-900 text-white min-h-screen font-sans flex flex-col">
            <Header 
                activeUser={activeUser}
                onSaveProject={handleSaveProject} 
                onLoadProject={handleLoadProject} 
                onShareProject={() => alert('Chức năng chia sẻ sẽ sớm được cập nhật!')} 
            />
            <main className="flex-grow flex flex-col items-center w-full p-4 md:p-6">
                <ProgressBar currentStep={currentStep} totalSteps={7} />
                {error && (
                    <div className={`p-3 rounded-md my-4 max-w-7xl w-full flex items-start gap-3 ${isQuotaExceeded ? 'bg-yellow-900/50 text-yellow-300' : 'bg-red-900/50 text-red-300'}`}>
                        <i className={`fas ${isQuotaExceeded ? 'fa-hourglass-half' : 'fa-exclamation-triangle'} mt-1`}></i>
                        <div>
                            <p className="font-bold">{isQuotaExceeded ? 'Đã đạt giới hạn sử dụng API' : 'Đã xảy ra lỗi'}</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    </div>
                )}
                <div className="flex flex-col md:flex-row w-full max-w-7xl mt-6 gap-6 flex-grow" style={{ minHeight: '60vh' }}>
                    <div className="w-full md:w-1/2 lg:w-1/3 bg-gray-800/50 p-6 rounded-lg shadow-xl border border-gray-700 flex flex-col">
                        {renderStepContent()}
                    </div>
                    <div className="w-full md:w-1/2 lg:w-2/3 bg-gray-800/50 p-6 rounded-lg shadow-xl border border-gray-700">
                        <PreviewDisplay
                            step={activeStepForPreview}
                            characters={characters}
                            contextPreview={contextPreview}
                            onRegenerateContext={handleGenerateContext}
                            onRegenerateSingleCharacter={handleGenerateSingleCharacter}
                            onSelectReferenceImage={(charId, url) => setCharacters(chars => 
                                chars.map(c => {
                                    if (c.id === charId) {
                                        // If it's already selected, deselect it. Otherwise, select it.
                                        const newRefUrl = c.referenceImageUrl === url ? null : url;
                                        return { ...c, referenceImageUrl: newRefUrl };
                                    }
                                    return c;
                                })
                            )}
                            generatedImages={generatedImages}
                            onOpenEditModal={setEditingImage}
                            selectedImageIds={selectedImageIds}
                            onToggleImageSelection={handleToggleImageSelection}
                            onRegenerateSeriesImage={handleRegenerateSingleSeriesImage}
                            onRetryFailedSeries={handleRetryFailedSeriesImages}
                            videoPrompts={videoPrompts}
                            isGeneratingVideoPrompts={isGeneratingVideoPrompts}
                            onDownloadVideoPrompts={handleDownloadVideoPrompts}
                            thumbnailResult={thumbnailResult}
                            isGeneratingThumbnail={isGeneratingThumbnail}
                            onProceedToStep6={() => setCurrentStep(6)}
                            onProceedToStep7={() => setCurrentStep(7)}
                            isGeneratingChars={isGeneratingChars}
                            isGeneratingSeries={isLoading}
                            onStopGeneration={handleStopGeneration}
                            isQuotaExceeded={isQuotaExceeded}
                        />
                    </div>
                </div>
            </main>
            {editingImage && (
                <EditImageModal
                    image={editingImage}
                    onClose={() => setEditingImage(null)}
                    onApply={handleApplyEdit}
                    language="Vietnamese"
                />
            )}
        </div>
    );
};

export default App;
