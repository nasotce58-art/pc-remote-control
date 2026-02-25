/**
 * broadcast-handler.js
 * Обработчик рассылки сообщений для администратора
 * 
 * Команды:
 * /broadcast - начать рассылку
 * /broadcast_cancel - отменить рассылку
 */

const axios = require('axios');

class BroadcastHandler {
  constructor(bot, workerUrl, adminChatId) {
    this.bot = bot;
    this.workerUrl = workerUrl;
    this.adminChatId = adminChatId;
    this.broadcastState = new Map(); // Хранение состояния рассылки для пользователей
    
    this.registerCommands();
  }

  /**
   * Register bot commands
   */
  registerCommands() {
    // Команда /broadcast - начать рассылку
    this.bot.command('broadcast', async (ctx) => {
      const userId = ctx.from?.id;
      
      // Проверка на администратора
      if (userId !== this.adminChatId) {
        await ctx.reply('❌ Доступ запрещен\n\nТолько администратор может использовать эту команду.');
        await ctx.answerCbQuery();
        return;
      }

      await ctx.reply(
        '📢 <b>Рассылка сообщений</b>\n\n' +
        'Отправьте сообщение, которое хотите разослать всем пользователям.\n\n' +
        'Поддерживается:\n• Текст\n• Фото\n• Документы\n\n' +
        'Для отмены отправьте /broadcast_cancel',
        { parse_mode: 'HTML' }
      );
      
      this.broadcastState.set(userId, { waiting: true });
    });

    // Команда /broadcast_cancel - отменить рассылку
    this.bot.command('broadcast_cancel', async (ctx) => {
      const userId = ctx.from?.id;
      
      if (this.broadcastState.has(userId)) {
        this.broadcastState.delete(userId);
        await ctx.reply('✅ Рассылка отменена');
      } else {
        await ctx.reply('ℹ️ Активных рассылок нет');
      }
    });

    // Команда /stats - статистика пользователей
    this.bot.command('stats', async (ctx) => {
      const userId = ctx.from?.id;
      
      if (userId !== this.adminChatId) {
        await ctx.reply('❌ Доступ запрещен');
        return;
      }

      try {
        const response = await axios.get(`${this.workerUrl}/api/users/stats`);
        
        if (response.data.ok) {
          const stats = response.data;
          await ctx.reply(
            `📊 <b>Статистика пользователей</b>\n\n` +
            `👥 Всего пользователей: ${stats.totalUsers || 0}\n` +
            `🖥️ Всего устройств: ${stats.totalDevices || 0}\n` +
            `🟢 Онлайн устройств: ${stats.onlineDevices || 0}\n` +
            `🔴 Офлайн устройств: ${stats.offlineDevices || 0}`,
            { parse_mode: 'HTML' }
          );
        }
      } catch (error) {
        await ctx.reply(`❌ Ошибка получения статистики: ${error.message}`);
      }
    });

    // Обработчик текстовых сообщений для рассылки
    this.bot.on('text', async (ctx) => {
      const userId = ctx.from?.id;
      const state = this.broadcastState.get(userId);
      
      if (state?.waiting) {
        const messageText = ctx.message.text;
        
        // Проверка на команды
        if (messageText === '/broadcast_cancel') {
          this.broadcastState.delete(userId);
          await ctx.reply('✅ Рассылка отменена');
          return;
        }
        
        await this.performBroadcast(ctx, 'text', messageText);
      }
    });

    // Обработчик фото для рассылки
    this.bot.on('photo', async (ctx) => {
      const userId = ctx.from?.id;
      const state = this.broadcastState.get(userId);
      
      if (state?.waiting) {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const caption = ctx.message.caption || '';
        
        await this.performBroadcast(ctx, 'photo', {
          fileId: photo.file_id,
          caption: caption
        });
      }
    });

    // Обработчик документов для рассылки
    this.bot.on('document', async (ctx) => {
      const userId = ctx.from?.id;
      const state = this.broadcastState.get(userId);
      
      if (state?.waiting) {
        const document = ctx.message.document;
        
        await this.performBroadcast(ctx, 'document', {
          fileId: document.file_id,
          fileName: document.file_name
        });
      }
    });
  }

  /**
   * Perform broadcast to all users
   */
  async performBroadcast(ctx, type, content) {
    const adminUserId = ctx.from?.id;
    
    await ctx.reply('⏳ Начинаю рассылку...\n\nЭто может занять некоторое время.');

    try {
      // Отправляем запрос на Worker для получения списка пользователей
      const response = await axios.get(`${this.workerUrl}/api/users/list`);
      
      if (!response.data.ok) {
        await ctx.reply('❌ Ошибка получения списка пользователей');
        this.broadcastState.delete(adminUserId);
        return;
      }

      const users = response.data.users || [];
      
      if (users.length === 0) {
        await ctx.reply('ℹ️ Нет пользователей для рассылки');
        this.broadcastState.delete(adminUserId);
        return;
      }

      let successCount = 0;
      let failCount = 0;

      // Отправляем сообщение каждому пользователю
      for (const user of users) {
        try {
          // Пропускаем администратора
          if (user.telegramUserId === this.adminChatId) {
            continue;
          }

          switch (type) {
            case 'text':
              await this.bot.telegram.sendMessage(
                user.telegramUserId,
                `📢 <b>Сообщение от администрации</b>\n\n${content}`,
                { parse_mode: 'HTML' }
              );
              break;
              
            case 'photo':
              await this.bot.telegram.sendPhoto(
                user.telegramUserId,
                content.fileId,
                { 
                  caption: `📢 <b>Сообщение от администрации</b>\n\n${content.caption}`,
                  parse_mode: 'HTML'
                }
              );
              break;
              
            case 'document':
              await this.bot.telegram.sendDocument(
                user.telegramUserId,
                content.fileId,
                { caption: `📢 Сообщение от администрации` }
              );
              break;
          }
          
          successCount++;
          
          // Небольшая задержка чтобы не спамить
          await new Promise(resolve => setTimeout(resolve, 50));
          
        } catch (error) {
          console.error(`[Broadcast] Error sending to user ${user.telegramUserId}:`, error.message);
          failCount++;
        }
      }

      // Отчет администратору
      await ctx.reply(
        `✅ <b>Рассылка завершена!</b>\n\n` +
        `📬 Отправлено: ${successCount}\n` +
        `❌ Ошибок: ${failCount}\n` +
        `👥 Всего: ${users.length - 1}`, // -1 потому что исключили админа
        { parse_mode: 'HTML' }
      );

      this.broadcastState.delete(adminUserId);

    } catch (error) {
      console.error('[Broadcast] Error:', error.message);
      await ctx.reply(`❌ Ошибка рассылки: ${error.message}`);
      this.broadcastState.delete(adminUserId);
    }
  }
}

module.exports = {
  BroadcastHandler,
  registerBroadcastHandler: (bot, workerUrl, adminChatId) => {
    return new BroadcastHandler(bot, workerUrl, adminChatId);
  }
};
