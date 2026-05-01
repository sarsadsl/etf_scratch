export default {
  async fetch(request, env, ctx) {
    // CORS 配置：允許跨站請求，上線後建議將 '*' 改為您的 GitHub Pages 網址以提升安全性
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // 處理瀏覽器的 OPTIONS 預檢請求 (Preflight)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "無效的方法，僅支援 POST" }), {
        status: 405,
        headers: corsHeaders
      });
    }

    try {
      // 取得網頁前端傳遞過來的 Payload
      const body = await request.json();
      
      // 檢查隱私環境變數 (包含密碼)
      if (!env.BOT_TOKEN || !env.CHANNEL_ID || !env.ADMIN_PASSWORD) {
         throw new Error("伺服器環境變數缺漏，當前未綁定 API 或無通行密碼 (ADMIN_PASSWORD)");
      }

      // 核心身分防禦：驗證密碼
      if (body.password !== env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ success: false, error: "身分驗證防禦阻擋：無效的密碼" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const message = body.message || "系統通知：網頁端傳來了一則預設推播。";

      // 發送請求至 Telegram
      const telegramUrl = `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`;
      const telegramResponse = await fetch(telegramUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: env.CHANNEL_ID,
          text: message,
          parse_mode: "Markdown"
        })
      });

      const telegramResult = await telegramResponse.json();
      
      if (!telegramResponse.ok) {
        throw new Error(`Telegram 回報錯誤: ${telegramResult.description}`);
      }

      // 回報成功至前端
      return new Response(JSON.stringify({ success: true, description: "頻道廣播已送出" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (error) {
      // 錯誤攔截器
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  },
};
