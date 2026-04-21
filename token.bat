@echo off
chcp 65001 >nul
:: --------------------------------------------
:: 請在此填寫您的私有金鑰資訊，注意：等號前方與後方「皆不能有空格」
:: --------------------------------------------

set TELEGRAM_BOT_TOKEN=8778236770:AAH6NyejC2GiQcHvpxgPC48l-3jIoeVBX1c
set TELEGRAM_CHANNEL_ID=-1003997490196

echo 正在讀取環境變數並啟動測試腳本...
node test-channel-broadcast.js
pause
