#!/usr/bin/env python3
"""
PC Remote Control - Telegram Bot
Provides menu-driven interface for controlling remote PC through Cloudflare Worker

Install: pip install python-telegram-bot requests
"""

import logging
import requests
import json
import time
from datetime import datetime
from typing import Optional, Dict, Any
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup, KeyboardButton
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes, MessageHandler, filters, ConversationHandler
from telegram.constants import ParseMode

# Configuration
CLOUDFLARE_WORKER_URL = "https://your-worker.your-domain.workers.dev"
BOT_TOKEN = "8433887802:AAHO8MqAXIujaKZJvENvNgmuiZH3BN5H8o4"
ADMIN_CHAT_IDS = [5649053560]  # Your Telegram chat ID (replace with your ID)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class PCRemoteManager:
    """Manager for PC remote control"""
    
    def __init__(self, worker_url: str):
        self.worker_url = worker_url.rstrip('/')
        self.session = requests.Session()
    
    def send_command(self, device_id: str, command_type: str, parameters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Send command to device through Cloudflare Worker"""
        try:
            command = {
                "id": f"{device_id}_{int(time.time())*1000}",
                "type": command_type,
                "parameters": parameters or {},
                "timestamp": str(datetime.now()),
                "deviceId": device_id,
                "status": "pending"
            }
            
            response = self.session.post(
                f"{self.worker_url}/tasks/{device_id}",
                json=command,
                timeout=10
            )
            
            if response.status_code == 200:
                return {"success": True, "data": response.json()}
            else:
                return {"success": False, "error": f"HTTP {response.status_code}"}
        except Exception as e:
            logger.error(f"Error sending command: {e}")
            return {"success": False, "error": str(e)}
    
    def get_result(self, device_id: str, command_id: str) -> Dict[str, Any]:
        """Get result of executed command"""
        try:
            response = self.session.get(
                f"{self.worker_url}/results/{device_id}/{command_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                return {"success": True, "data": response.json()}
            elif response.status_code == 204:
                return {"success": False, "error": "Result not ready yet"}
            else:
                return {"success": False, "error": f"HTTP {response.status_code}"}
        except Exception as e:
            logger.error(f"Error getting result: {e}")
            return {"success": False, "error": str(e)}


manager = PCRemoteManager(CLOUDFLARE_WORKER_URL)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Start command"""
    if update.effective_chat.id not in ADMIN_CHAT_IDS:
        await update.message.reply_text("❌ Access denied. Please contact administrator.")
        return
    
    keyboard = [
        [InlineKeyboardButton("⚡ Power & Network", callback_data="menu_power")],
        [InlineKeyboardButton("📊 Monitoring & Screen", callback_data="menu_monitor")],
        [InlineKeyboardButton("📂 Files & Applications", callback_data="menu_files")],
        [InlineKeyboardButton("⌨️ Control & Input", callback_data="menu_control")],
        [InlineKeyboardButton("⚙️ Settings", callback_data="menu_settings")]
    ]
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "🖥️ <b>PC Remote Control</b>\n\n"
        "Select an option to manage your PC:",
        reply_markup=reply_markup,
        parse_mode=ParseMode.HTML
    )


async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle button clicks"""
    query = update.callback_query
    await query.answer()
    
    # Get device ID from context or use default
    device_id = context.user_data.get("device_id", "YOUR_DEVICE_ID")
    
    # Handle back button
    if query.data == "menu_back":
        keyboard = [
            [InlineKeyboardButton("⚡ Power & Network", callback_data="menu_power")],
            [InlineKeyboardButton("📊 Monitoring & Screen", callback_data="menu_monitor")],
            [InlineKeyboardButton("📂 Files & Applications", callback_data="menu_files")],
            [InlineKeyboardButton("⌨️ Control & Input", callback_data="menu_control")],
            [InlineKeyboardButton("⚙️ Settings", callback_data="menu_settings")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(
            text="🖥️ <b>PC Remote Control</b>\n\nSelect an option to manage your PC:",
            reply_markup=reply_markup,
            parse_mode=ParseMode.HTML
        )
        return
    
    # Main menu
    if query.data == "menu_power":
        await show_power_menu(query, device_id)
    elif query.data == "menu_monitor":
        await show_monitor_menu(query, device_id)
    elif query.data == "menu_files":
        await show_files_menu(query, device_id)
    elif query.data == "menu_control":
        await show_control_menu(query, device_id)
    elif query.data == "menu_settings":
        await show_settings_menu(query, device_id)
    
    # Power commands
    elif query.data == "cmd_shutdown":
        result = manager.send_command(device_id, "Shutdown")
        await query.edit_message_text(
            text=f"⚡ <b>Shutdown</b>\n\n✅ Command sent successfully!",
            parse_mode=ParseMode.HTML
        )
    elif query.data == "cmd_restart":
        result = manager.send_command(device_id, "Restart")
        await query.edit_message_text(
            text=f"🔄 <b>Restart</b>\n\n✅ Command sent successfully!",
            parse_mode=ParseMode.HTML
        )
    elif query.data == "cmd_sleep":
        result = manager.send_command(device_id, "Sleep")
        await query.edit_message_text(
            text=f"😴 <b>Sleep Mode</b>\n\n✅ Command sent successfully!",
            parse_mode=ParseMode.HTML
        )
    elif query.data == "cmd_lock":
        result = manager.send_command(device_id, "Lock")
        await query.edit_message_text(
            text=f"🔒 <b>Lock System</b>\n\n✅ Command sent successfully!",
            parse_mode=ParseMode.HTML
        )
    elif query.data == "cmd_monitor_off":
        result = manager.send_command(device_id, "MonitorOff")
        await query.edit_message_text(
            text=f"🔌 <b>Monitor Off</b>\n\n✅ Command sent successfully!",
            parse_mode=ParseMode.HTML
        )
    
    # Monitoring commands
    elif query.data == "cmd_stats":
        result = manager.send_command(device_id, "GetStats")
        if result["success"]:
            data = result.get("data", {}).get("data", {})
            stats_text = f"""📊 <b>System Stats</b>

🔴 CPU: {data.get('cpuUsage', 'N/A')}% ({data.get('cpuTemperature', 'N/A')}°C)
🔵 RAM: {data.get('ramUsed', 'N/A')} / {data.get('ramTotal', 'N/A')} GB
💾 Disk: {data.get('diskUsed', 'N/A')} / {data.get('diskTotal', 'N/A')} GB
📶 Network: ↑{data.get('networkUpload', 'N/A')} ↓{data.get('networkDownload', 'N/A')} Mbps"""
        else:
            stats_text = f"❌ Error: {result.get('error')}"
        
        await query.edit_message_text(text=stats_text, parse_mode=ParseMode.HTML)
    
    elif query.data == "cmd_screenshot":
        result = manager.send_command(device_id, "Screenshot")
        await query.edit_message_text(text="📸 Screenshot command sent. Check your messages.")
    
    elif query.data == "cmd_processes":
        result = manager.send_command(device_id, "ProcessList")
        if result["success"]:
            processes = result.get("data", {}).get("data", {}).get("processes", [])[:5]
            proc_text = "📋 <b>Top Processes</b>\n\n"
            for p in processes:
                proc_text += f"• {p.get('name')} - RAM: {p.get('ramUsage', 0) / 1024 / 1024:.0f} MB\n"
        else:
            proc_text = f"❌ Error: {result.get('error')}"
        
        await query.edit_message_text(text=proc_text, parse_mode=ParseMode.HTML)
    
    # Control commands
    elif query.data == "cmd_clipboard":
        result = manager.send_command(device_id, "GetClipboard")
        if result["success"]:
            clipboard = result.get("data", {}).get("data", {}).get("text", "Empty")
            text = f"📋 <b>Clipboard Content</b>\n\n{clipboard}"
        else:
            text = f"❌ Error: {result.get('error')}"
        await query.edit_message_text(text=text, parse_mode=ParseMode.HTML)
    
    elif query.data == "cmd_volume":
        await query.edit_message_text(
            text="🔊 <b>Volume Control</b>\n\nEnter volume level (0-100):",
            parse_mode=ParseMode.HTML
        )
    
    elif query.data == "cmd_terminal":
        await query.edit_message_text(
            text="⌨️ <b>Terminal</b>\n\nEnter command to execute:",
            parse_mode=ParseMode.HTML
        )
    
    # Files menu
    elif query.data == "cmd_launcher":
        keyboard = [
            [InlineKeyboardButton("🔙 Back", callback_data="menu_files")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(
            text="🚀 <b>Launcher</b>\n\nYour configured applications would appear here.",
            reply_markup=reply_markup,
            parse_mode=ParseMode.HTML
        )
    
    # Settings commands
    elif query.data == "cmd_session_info":
        result = manager.send_command(device_id, "GetSessionInfo")
        if result["success"]:
            data = result.get("data", {}).get("data", {})
            info_text = f"""ℹ️ <b>Session Information</b>

💻 Device ID: {data.get('deviceId', 'N/A')}
🖥️ Hostname: {data.get('hostname', 'N/A')}
📦 OS: {data.get('osVersion', 'N/A')}
⚙️ CPU Cores: {data.get('cpuCores', 'N/A')}"""
        else:
            info_text = f"❌ Error: {result.get('error')}"
        
        await query.edit_message_text(text=info_text, parse_mode=ParseMode.HTML)


async def show_power_menu(query, device_id: str):
    """Show power management menu"""
    keyboard = [
        [InlineKeyboardButton("⚡ Shutdown", callback_data="cmd_shutdown")],
        [InlineKeyboardButton("🔄 Restart", callback_data="cmd_restart")],
        [InlineKeyboardButton("😴 Sleep", callback_data="cmd_sleep")],
        [InlineKeyboardButton("🔒 Lock", callback_data="cmd_lock")],
        [InlineKeyboardButton("🔌 Monitor Off", callback_data="cmd_monitor_off")],
        [InlineKeyboardButton("🔙 Back", callback_data="menu_back")]
    ]
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    await query.edit_message_text(
        text="⚡ <b>Power & Network Management</b>",
        reply_markup=reply_markup,
        parse_mode=ParseMode.HTML
    )


async def show_monitor_menu(query, device_id: str):
    """Show monitoring menu"""
    keyboard = [
        [InlineKeyboardButton("📊 System Stats", callback_data="cmd_stats")],
        [InlineKeyboardButton("📸 Screenshot", callback_data="cmd_screenshot")],
        [InlineKeyboardButton("📋 Processes", callback_data="cmd_processes")],
        [InlineKeyboardButton("🔙 Back", callback_data="menu_back")]
    ]
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    await query.edit_message_text(
        text="📊 <b>Monitoring & Screen</b>",
        reply_markup=reply_markup,
        parse_mode=ParseMode.HTML
    )


async def show_files_menu(query, device_id: str):
    """Show files menu"""
    keyboard = [
        [InlineKeyboardButton("🚀 Launcher", callback_data="cmd_launcher")],
        [InlineKeyboardButton("🔙 Back", callback_data="menu_back")]
    ]
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    await query.edit_message_text(
        text="📂 <b>Files & Applications</b>",
        reply_markup=reply_markup,
        parse_mode=ParseMode.HTML
    )


async def show_control_menu(query, device_id: str):
    """Show control menu"""
    keyboard = [
        [InlineKeyboardButton("📋 Clipboard", callback_data="cmd_clipboard")],
        [InlineKeyboardButton("🔊 Volume", callback_data="cmd_volume")],
        [InlineKeyboardButton("⌨️ Terminal", callback_data="cmd_terminal")],
        [InlineKeyboardButton("🔙 Back", callback_data="menu_back")]
    ]
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    await query.edit_message_text(
        text="⌨️ <b>Control & Input</b>",
        reply_markup=reply_markup,
        parse_mode=ParseMode.HTML
    )


async def show_settings_menu(query, device_id: str):
    """Show settings menu"""
    keyboard = [
        [InlineKeyboardButton("ℹ️ Session Info", callback_data="cmd_session_info")],
        [InlineKeyboardButton("🔙 Back", callback_data="menu_back")]
    ]
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    await query.edit_message_text(
        text="⚙️ <b>Settings</b>",
        reply_markup=reply_markup,
        parse_mode=ParseMode.HTML
    )


def main():
    """Start the bot"""
    application = Application.builder().token(BOT_TOKEN).build()
    
    # Handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CallbackQueryHandler(button_callback))
    
    logger.info("Bot started. Token is valid.")
    logger.info(f"Using Cloudflare Worker URL: {CLOUDFLARE_WORKER_URL}")
    logger.info("Polling for messages...")
    
    application.run_polling(allowed_updates=[Update.MESSAGE, Update.CALLBACK_QUERY])


if __name__ == "__main__":
    main()
