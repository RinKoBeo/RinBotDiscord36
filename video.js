const axios = require('axios');
const { AttachmentBuilder } = require('discord.js');

module.exports = (client) => {
    // Các server cào video ổn định nhất hiện tại
    const cobaltInstances = [
        'https://cobalt.api.v0.lol/',
        'https://co.wuk.sh/'
    ];

    async function fetchVideoFile(url) {
        for (let instance of cobaltInstances) {
            try {
                console.log(`🔗 [Video Bot] Đang thử cào qua server: ${instance}`);
                const response = await axios.post(instance, {
                    url: url,
                    videoQuality: '480',
                    filenamePattern: 'classic'
                }, {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    timeout: 6000 // Thử 6 giây mỗi server, không được chuyển luồng ngay
                });

                if (response.data && response.data.url) {
                    return response.data.url;
                }
            } catch (e) {
                console.warn(`⚠️ [Video Bot] Server ${instance} không phản hồi nhanh hoặc lỗi.`);
            }
        }
        return null;
    }

    client.on("messageCreate", async (message) => {
        // Tạo biến check xem luồng đã kết thúc chưa để tránh block bot
        let isDone = false;
        
        try {
            if (message.author.bot || !message.guild) return;

            // Nhận diện link video phổ biến
            const urlRegex = /(https?:\/\/(?:www\.)?(?:tiktok|instagram|youtube|youtu\.be|facebook)\S+)/gi;
            const hasLink = message.content.match(urlRegex);

            if (!hasLink) return;

            const targetUrl = hasLink[0];
            const lowerUrl = targetUrl.toLowerCase();

            // Bỏ qua các loại link trang chủ rác
            if (
                lowerUrl === 'https://www.tiktok.com' || lowerUrl === 'https://www.tiktok.com/' || 
                lowerUrl === 'https://youtube.com' || lowerUrl === 'https://youtube.com/' ||
                lowerUrl === 'https://www.instagram.com' || lowerUrl === 'https://www.instagram.com/'
            ) return;

            // Báo hiệu đang xử lý
            await message.channel.sendTyping();
            
            // Đặt thời gian giới hạn tối đa cho cả luồng xử lý video để cứu bot không bị treo (Max 15s)
            const clearTreo = setTimeout(() => {
                if (!isDone) {
                    console.log("⏰ [Video Bot] Quá thời gian xử lý video! Tự động nhả link trực tiếp.");
                    isDone = true;
                    // Phương án dự phòng hoàn hảo: Đổi link sang dịch vụ fix embed để Discord tự hiện video player siêu nhẹ
                    let fallbackUrl = targetUrl;
                    if (lowerUrl.includes('tiktok.com')) fallbackUrl = targetUrl.replace('tiktok.com', 'vxtiktok.com');
                    if (lowerUrl.includes('instagram.com')) fallbackUrl = targetUrl.replace('instagram.com', 'ddinstagram.com');
                    
                    message.reply(`🎬 **Trình phát Video dự phòng:**\n${fallbackUrl}`).catch(() => {});
                }
            }, 15000);

            const streamVideoUrl = await fetchVideoFile(targetUrl);
            
            if (streamVideoUrl && !isDone) {
                console.log("📥 [Video Bot] Đang tải file video vào RAM...");
                
                // Tải file về RAM với timeout nghiêm ngặt (Max 8 giây) để không làm treo bot
                const videoBuffer = await axios.get(streamVideoUrl, { 
                    responseType: 'arraybuffer',
                    timeout: 8000 
                });
                
                if (!isDone) {
                    isDone = true;
                    clearTimeout(clearTreo);
                    
                    const videoAttachment = new AttachmentBuilder(Buffer.from(videoBuffer.data), { name: 'rin_video.mp4' });
                    console.log("🚀 [Video Bot] Đang gửi file lên Discord...");
                    return await message.reply({ files: [videoAttachment] });
                }
            } 
            
            // Nếu Cobalt tạch hoàn toàn nhưng bot chưa bị quá thời gian
            if (!isDone) {
                isDone = true;
                clearTimeout(clearTreo);
                
                let fallbackUrl = targetUrl;
                if (lowerUrl.includes('tiktok.com')) fallbackUrl = targetUrl.replace('tiktok.com', 'vxtiktok.com');
                if (lowerUrl.includes('instagram.com')) fallbackUrl = targetUrl.replace('instagram.com', 'ddinstagram.com');
                
                console.log("🚀 [Video Bot] Dùng link nhúng thông minh làm phương án dự phòng.");
                return await message.reply(`🎬 **Video Player:**\n${fallbackUrl}`);
            }

        } catch (err) {
            isDone = true;
            console.log("❌ [Video Bot] Bắt được lỗi hệ thống, giải phóng luồng:", err.message);
            
            // Nếu lỗi do file quá nặng (>25MB)
            if (err.message && err.message.includes("too large")) {
                let fallbackUrl = hasLink ? hasLink[0] : '';
                if (fallbackUrl.includes('tiktok.com')) fallbackUrl = fallbackUrl.replace('tiktok.com', 'vxtiktok.com');
                return message.reply(`⚠️ File video gốc quá nặng! Xem trực tiếp tại đây nha mày:\n${fallbackUrl}`).catch(() => {});
            }
        }
    });
};