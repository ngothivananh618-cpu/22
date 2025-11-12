import { GoogleGenAI, Modality, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import type { Character, Setting } from '../App';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const safetySettings = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
];

const createImageStylePromptSuffix = () => {
    const details = { description: '16:9 (ảnh ngang, widescreen)', resolution: '3840x2160 pixels' };

    return `Phong cách cốt lõi: "Đồ họa Phân tích Kỹ thuật" (Technical Analysis Infographic) hoặc "Đồ họa Điều tra Tai nạn" (Accident Investigation Graphic).
Mục đích là để giải thích một sự kiện phức tạp bằng cách kết hợp hình ảnh với các lớp thông tin kỹ thuật số.

YÊU CẦU KỸ THUẬT HÌNH ẢNH (BẮT BUỘC TUYỆT ĐỐI):
- **TỈ LỆ KHUNG HÌNH (QUAN TRỌNG NHẤT):** TỈ LỆ KHUNG HÌNH CỦA ẢNH PHẢI CHÍNH XÁC LÀ ${details.description}. ĐÂY LÀ YÊU CẦU KHÔNG THỂ THAY ĐỔI.
- **Chất lượng:** Độ phân giải cực cao, chất lượng 4K (chính xác là ${details.resolution}), siêu chi tiết (ultra-detailed, photorealistic).

ĐẶC ĐIỂM NỘI DUNG (BẮT BUỘC):
1.  **Nền 3D Siêu thực (Photorealistic 3D Render):** Phần nền của bức ảnh (máy bay, hiện trường) PHẢI là đồ họa CGI 3D với độ chi tiết rất cao, sắc nét, tiệm cận ảnh chụp thật.
2.  **Lớp phủ Giao diện Hologram (H holographic UI Overlay):** PHẢI thêm các lớp thông tin, biểu đồ, và văn bản như một giao diện kỹ thuật số trong suốt, chồng lên trên cảnh thực.
3.  **Trực quan hóa Dữ liệu (Data Visualization):** PHẢI sử dụng các nhãn dữ liệu (text labels) và đường kẻ để chỉ ra các điểm lỗi, thông số kỹ thuật, hoặc khu vực quan trọng (ví dụ: 'GEAR FAILURE?', 'IMPACT ZONE').
4.  **Chế độ xem Cắt lớp/X-quang (Cutaway / X-ray View):** PHẢI có khả năng hiển thị các bộ phận cơ khí bên trong vật thể (như động cơ, thân máy bay) bằng hiệu ứng nhìn "xuyên thấu".
5.  **Phong cách Tài liệu/Giải thích (Documentary/Explainer Style):** Tổng thể tông màu PHẢI nghiêm túc, kịch tính, mang tính phân tích và trang trọng. Tập trung vào việc cung cấp thông tin kỹ thuật, không giật gân.`;
};

const rewritePromptForImageGeneration = async (originalPrompt: string, language: string = 'Vietnamese'): Promise<string> => {
    const rewriteInstruction = `Hãy đóng vai một kỹ sư prompt. Prompt sau đây dùng để tạo ảnh đã thất bại. Hãy viết lại nó bằng tiếng ${language} để nó trở nên mô tả, rõ ràng và cụ thể hơn. Prompt mới phải có khả năng tạo ra một hình ảnh thành công cao hơn trong khi vẫn giữ được ý định ban đầu.

Prompt gốc: "${originalPrompt}"

Chỉ trả về prompt đã được viết lại, không có bất kỳ lời giải thích, dấu ngoặc kép hay định dạng bổ sung nào.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: rewriteInstruction,
            config: {
                safetySettings,
            }
        });

        const rewrittenPrompt = response.text.trim().replace(/^"|"$/g, '');
        console.log(`Prompt gốc: "${originalPrompt}" | Prompt được viết lại: "${rewrittenPrompt}"`);
        
        if (rewrittenPrompt && rewrittenPrompt.length > 10 && rewrittenPrompt !== originalPrompt) {
            return rewrittenPrompt;
        }
        return `Một bức ảnh điện ảnh, siêu chi tiết về: ${originalPrompt}`;
    } catch (error) {
        console.error("Lỗi khi viết lại prompt, sử dụng prompt thay thế:", error);
        return `Một bức ảnh điện ảnh, siêu chi tiết về: ${originalPrompt}`;
    }
};


export const researchAndExtractDetails = async (script: string): Promise<{ setting: Setting, characters: Omit<Character, 'id' | 'preview' | 'referenceImageUrl'>[] }> => {
    const prompt = `Với tư cách là một đạo diễn hình ảnh và nhà phân tích kịch bản chuyên nghiệp, hãy đọc kỹ kịch bản sau đây. **Sử dụng Google Search để tra cứu thông tin từ các bài báo, báo cáo tai nạn và dữ liệu lịch sử liên quan đến sự kiện.** Mục tiêu của bạn là trích xuất các chi tiết cực kỳ chính xác về bối cảnh để đảm bảo hình ảnh được tạo ra phù hợp nhất với thực tế.

    **NHIỆM VỤ QUAN TRỌNG NHẤT VỀ NHÂN VẬT: Hãy tư duy sáng tạo để xác định MỌI 'nhân vật' có tiềm năng tạo ra một góc nhìn hình ảnh độc đáo và sống động.** 'Nhân vật' có thể là bất cứ thứ gì, từ thực thể chính đến những chi tiết nhỏ nhất nhưng quan trọng về mặt hình ảnh. ĐỪNG BỎ SÓT bất kỳ yếu tố nào có thể trở thành một cảnh quay thú vị.

    Hãy tìm mọi góc quay khả dĩ, bao gồm các hạng mục sau:
    1.  **Thực thể Cơ khí & Phương tiện:** Bất kỳ máy bay, tàu, xe nào, dù là chính hay phụ.
    2.  **Con người:** Mọi nhân vật có tên hoặc vai trò, từ chính đến phụ (phi công, kiểm soát viên, nhân chứng).
    3.  **Hệ thống & Linh kiện Cụ thể:** Mọi bộ phận máy móc được nhắc đến, dù chỉ một lần, nếu nó quan trọng cho một cảnh (ví dụ: 'cần gạt càng', 'bảng điều khiển', 'hộp đen').
    4.  **Môi trường & Địa điểm:** Cả bối cảnh chung và các chi tiết cụ thể (ví dụ: 'đường băng', 'nhà ga', 'một đám mây bão cụ thể').
    5.  **Lực lượng & Tổ chức:** Các nhóm người hoặc tổ chức (ví dụ: 'đội cứu hộ', 'NTSB', 'hãng hàng không').
    6.  **Khái niệm Trừu tượng có Thể Hình ảnh hóa:** Các vấn đề kỹ thuật hoặc khái niệm có thể được biểu diễn bằng hình ảnh (ví dụ: 'sóng âm', 'áp suất cabin', 'lỗi phần mềm').
    
    Sau đó, trích xuất thông tin chi tiết và trả về một đối tượng JSON DUY NHẤT có cấu trúc như sau:
    {
      "setting": {
        "place": "Vị trí địa lý và không gian cụ thể.",
        "time": "Thời gian lịch sử, ngày giờ chính xác của sự kiện (buổi sáng, buổi trưa, ban đêm).",
        "weather": "Điều kiện thời tiết tại thời điểm xảy ra sự kiện (nắng, mưa, mây mù, tuyết).",
        "season": "Mùa trong năm (xuân, hạ, thu, đông).",
        "mood": "Bầu không khí, cảm giác mà bối cảnh tạo ra.",
        "socialContext": "Bối cảnh xã hội, luật lệ, công nghệ.",
        "theme": {
          "centralIdea": "Ý tưởng trung tâm của câu chuyện (VD: sự cố kỹ thuật, sai lầm con người).",
          "thematicQuestion": "Câu hỏi triết lý mà câu chuyện đặt ra."
        }
      },
      "characters": [
        {
          "name": "Tên nhân vật/thực thể (VD: Máy bay UPS 5X214).",
          "isMain": "true nếu đây là nhân vật trung tâm, ngược lại false.",
          "goal": "Mục tiêu rõ ràng của nhân vật trong kịch bản.",
          "motivation": "Lý do cảm xúc đằng sau mục tiêu.",
          "conflict": "Trở ngại chính (bên trong hoặc bên ngoài) mà nhân vật phải đối mặt.",
          "appearanceAndBehavior": "Mô tả ngoại hình và hành vi chi tiết để tạo mô hình 3D.",
          "backstory": "Lý lịch hoặc chuyên môn kỹ thuật liên quan.",
          "characterArc": "Sự thay đổi của nhân vật từ đầu đến cuối."
        }
      ]
    }
    KỊCH BẢN:
    ---
    ${script}
    ---
    LƯU Ý QUAN TRỌNG: Chỉ trả về đối tượng JSON, không có bất kỳ văn bản giải thích nào khác.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                safetySettings,
            }
        });

        let jsonString = response.text.trim();
        const match = jsonString.match(/```json\n([\s\S]*?)\n```/);
        if (match) {
            jsonString = match[1];
        }

        return JSON.parse(jsonString);

    } catch (error) {
        console.error("Lỗi khi phân tích kịch bản:", error);
        throw new Error("Không thể phân tích kịch bản và trích xuất chi tiết.");
    }
};

export const generateImage = async (prompt: string): Promise<string> => {
    const imageStylePrompt = createImageStylePromptSuffix();
    let currentPrompt = `Chủ đề chính của ảnh: "${prompt}". ${imageStylePrompt}`;
    const originalPromptForRewrite = prompt;
    const maxRetries = 2;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: currentPrompt,
                config: {
                  numberOfImages: 1,
                  aspectRatio: '16:9',
                  outputMimeType: 'image/png',
                  safetySettings,
                },
            });

            if (response.generatedImages && response.generatedImages.length > 0) {
                const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
                return `data:image/png;base64,${base64ImageBytes}`;
            }
            
            throw new Error("Không tìm thấy dữ liệu ảnh trong phản hồi.");
        } catch (error) {
            console.error(`Lỗi tạo ảnh (lần thử ${attempt}/${maxRetries}):`, error);
            if (error instanceof Error && (error.message.toLowerCase().includes('quota') || error.message.toLowerCase().includes('limit'))) {
                 throw error;
            }

            if (attempt < maxRetries) {
                console.warn("Thử lại, viết lại prompt.");
                const rewrittenPrompt = await rewritePromptForImageGeneration(originalPromptForRewrite);
                currentPrompt = `Chủ đề chính của ảnh: "${rewrittenPrompt}". ${imageStylePrompt}`;
            } else {
                throw new Error(`Lỗi khi tạo ảnh từ Gemini API: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
            }
        }
    }
    throw new Error("Không thể tạo ảnh sau nhiều lần thử.");
};

export const generateImageWithReferences = async (prompt: string, characters: Character[]): Promise<string> => {
    const imageStylePrompt = createImageStylePromptSuffix();
    
    const characterDescriptions = characters
        .filter(c => c.referenceImageUrl)
        .map(c => `- ${c.name}: ${c.appearanceAndBehavior}`)
        .join('\n');
    
    let currentPrompt: string;
    if (characterDescriptions) {
        currentPrompt = `Chủ đề chính của ảnh: "${prompt}".\n\nGIỮ SỰ NHẤT QUÁN CHO CÁC NHÂN VẬT SAU:\n${characterDescriptions}\n\n${imageStylePrompt}`;
    } else {
        currentPrompt = `Chủ đề chính của ảnh: "${prompt}". ${imageStylePrompt}`;
    }

    const originalPromptForRewrite = prompt;
    const maxRetries = 2;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
             const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: currentPrompt,
                config: {
                    numberOfImages: 1,
                    aspectRatio: '16:9',
                    outputMimeType: 'image/png',
                    safetySettings,
                },
            });
            
            if (response.generatedImages && response.generatedImages.length > 0) {
                const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
                return `data:image/png;base64,${base64ImageBytes}`;
            }

            throw new Error("Không tìm thấy dữ liệu ảnh trong phản hồi.");
        } catch (error) {
            console.error(`Lỗi tạo ảnh với tham chiếu (lần thử ${attempt}/${maxRetries}):`, error);
            if (error instanceof Error && (error.message.toLowerCase().includes('quota') || error.message.toLowerCase().includes('limit'))) {
                 throw error;
            }
            
            if (attempt < maxRetries) {
                console.warn("Thử lại do lỗi, viết lại prompt.");
                const rewrittenPrompt = await rewritePromptForImageGeneration(originalPromptForRewrite);
                 if (characterDescriptions) {
                    currentPrompt = `Chủ đề chính của ảnh: "${rewrittenPrompt}".\n\nGIỮ SỰ NHẤT QUÁN CHO CÁC NHÂN VẬT SAU:\n${characterDescriptions}\n\n${imageStylePrompt}`;
                } else {
                    currentPrompt = `Chủ đề chính của ảnh: "${rewrittenPrompt}". ${imageStylePrompt}`;
                }
            } else {
                throw new Error(`Lỗi khi tạo ảnh với tham chiếu: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
            }
        }
    }
    throw new Error("Không thể tạo ảnh với tham chiếu sau nhiều lần thử.");
};

export const generateVideoPrompts = async (script: string, characters: Character[]): Promise<string[]> => {
    const characterProfiles = characters.map(c => `Hồ sơ nhân vật ${c.name}: ${JSON.stringify(c, null, 2)}`).join('\n\n');

    const prompt = `Dựa trên kịch bản và hồ sơ nhân vật sau đây, hãy tạo ra một danh sách các prompt chi tiết để tạo video. Mỗi prompt là một cảnh quay, mô tả hành động, góc máy, và cảm xúc, tuân thủ phong cách phim tài liệu kỹ thuật.
    
    KỊCH BẢN:
    ${script}
    
    HỒ SƠ NHÂN VẬT:
    ${characterProfiles}
    
    Hãy trả về một danh sách các chuỗi JSON, mỗi chuỗi là một prompt. Ví dụ: ["Prompt 1", "Prompt 2", ...]`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                },
                safetySettings,
            }
        });
        let jsonString = response.text.trim();
        
        if (!jsonString) {
            const blockReason = response?.promptFeedback?.blockReason;
            if (blockReason) {
                throw new Error(`Bị chặn bởi bộ lọc an toàn: ${blockReason}. Vui lòng sửa lại kịch bản.`);
            }
            throw new Error("Phản hồi từ AI trống rỗng, có thể do bộ lọc an toàn.");
        }

        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Lỗi tạo video prompts:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Không thể tạo video prompts.");
    }
};

export const generateThumbnail = async (topic: string, script: string): Promise<string> => {
    const prompt = `Tạo một thumbnail YouTube, chất lượng 4K cho một video với chủ đề "${topic}". Thumbnail phải theo phong cách phim tài liệu phân tích kỹ thuật 3D, kịch tính, nghiêm túc và thu hút. Tiêu đề chính trên thumbnail phải lớn, rõ ràng, màu vàng với viền đen. Bối cảnh nên dựa trên nội dung kịch bản sau: ${script}`;
    return await generateImage(prompt);
};

export const editImage = async (prompt: string, image: { base64: string; mimeType: string }, language: string): Promise<string> => {
    const imageStylePrompt = createImageStylePromptSuffix();
    let currentPrompt = `Yêu cầu chỉnh sửa cho ảnh này bằng tiếng ${language} là: "${prompt}". SAU KHI CHỈNH SỬA, ẢNH MỚI PHẢI TUÂN THỦ NGHIÊM NGẶT các yêu cầu kỹ thuật sau: ${imageStylePrompt}`;
    const originalPromptForRewrite = prompt;
    const maxRetries = 2;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { data: image.base64, mimeType: image.mimeType } },
                        { text: currentPrompt },
                    ],
                },
                config: { 
                    responseModalities: [Modality.IMAGE],
                    safetySettings,
                },
            });

            const candidate = response?.candidates?.[0];
            if (candidate && candidate.content && Array.isArray(candidate.content.parts)) {
                for (const part of candidate.content.parts) {
                    if (part && part.inlineData && part.inlineData.data) {
                        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    }
                }
            }
            
            const blockReason = response?.promptFeedback?.blockReason;
            if (blockReason) {
                throw new Error(`Bị chặn bởi bộ lọc an toàn: ${blockReason}.`);
            }
            throw new Error("Không tìm thấy dữ liệu ảnh đã chỉnh sửa.");
        } catch (error) {
            console.error(`Lỗi chỉnh sửa ảnh (lần thử ${attempt}/${maxRetries}):`, error);
             if (error instanceof Error && (error.message.toLowerCase().includes('quota') || error.message.toLowerCase().includes('limit'))) {
                 throw error;
            }

            if (attempt < maxRetries) {
                console.warn("Thử lại do lỗi, viết lại prompt chỉnh sửa.");
                const rewrittenPrompt = await rewritePromptForImageGeneration(originalPromptForRewrite, language);
                currentPrompt = `Yêu cầu chỉnh sửa cho ảnh này bằng tiếng ${language} là (đã được làm rõ hơn): "${rewrittenPrompt}". SAU KHI CHỈNH SỬA, ẢNH MỚI PHẢI TUÂN THỦ NGHIÊM NGẶT các yêu cầu kỹ thuật sau: ${imageStylePrompt}`;
            } else {
                throw new Error(`Lỗi khi chỉnh sửa ảnh: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
            }
        }
    }
    throw new Error("Không thể chỉnh sửa ảnh sau nhiều lần thử.");
};