import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { getEconomyData, getMaxBankCapacity } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

// ============================================================
// 🎨 Different Embed Styles for Balance
// ============================================================

function getRandomBalanceStyle(targetUser, wallet, bank, maxBank, total, interaction) {
    const styles = [
        // Style 1: Simple & Clean
        () => ({
            embeds: [{
                title: `💰 ${targetUser.username}'s Balance`,
                description: `📊 Here is the current financial status for ${targetUser.username}.`,
                color: 0x00FF00,
                fields: [
                    { name: '💵 Cash', value: `$${wallet.toLocaleString()}`, inline: true },
                    { name: '🏦 Bank', value: `$${bank.toLocaleString()} / $${maxBank.toLocaleString()}`, inline: true },
                    { name: '💰 Total', value: `$${total.toLocaleString()}`, inline: true }
                ],
                footer: {
                    text: `Requested by ${interaction.user.tag}`,
                    icon_url: interaction.user.displayAvatarURL()
                },
                timestamp: new Date()
            }],
            components: []
        }),

        // Style 2: Premium Style
        () => ({
            embeds: [{
                title: `👑 ${targetUser.username}'s Wallet`,
                description: `🌟 Financial overview for **${targetUser.username}**`,
                color: 0x9B59B6,
                fields: [
                    { name: '💵 Cash', value: `**$${wallet.toLocaleString()}**`, inline: true },
                    { name: '🏦 Bank', value: `**$${bank.toLocaleString()}** / $${maxBank.toLocaleString()}`, inline: true },
                    { name: '💰 Total Wealth', value: `**$${total.toLocaleString()}**`, inline: true },
                    { name: '📊 Bank Usage', value: `${Math.round((bank / maxBank) * 100)}%`, inline: true },
                    { name: '📅 Last Updated', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                ],
                thumbnail: {
                    url: targetUser.displayAvatarURL()
                },
                footer: {
                    text: `💰 Economy System • ${interaction.guild.name}`,
                    icon_url: interaction.guild.iconURL()
                },
                timestamp: new Date()
            }],
            components: []
        }),

        // Style 3: With Progress Bar
        () => ({
            embeds: [{
                title: `📊 ${targetUser.username}'s Balance`,
                description: `💳 **Financial Status**`,
                color: 0x00FF00,
                fields: [
                    { 
                        name: '💵 Cash', 
                        value: `$${wallet.toLocaleString()}`, 
                        inline: true 
                    },
                    { 
                        name: '🏦 Bank', 
                        value: `$${bank.toLocaleString()} / $${maxBank.toLocaleString()}`, 
                        inline: true 
                    },
                    { 
                        name: '💰 Total', 
                        value: `$${total.toLocaleString()}`, 
                        inline: true 
                    },
                    {
                        name: '📊 Bank Progress',
                        value: getProgressBar(bank, maxBank),
                        inline: false
                    }
                ],
                thumbnail: {
                    url: targetUser.displayAvatarURL()
                },
                footer: {
                    text: `Requested by ${interaction.user.tag}`,
                    icon_url: interaction.user.displayAvatarURL()
                },
                timestamp: new Date()
            }],
            components: []
        }),

        // Style 4: With Buttons
        () => ({
            embeds: [{
                title: `💳 ${targetUser.username}'s Balance`,
                description: `✅ Current financial status`,
                color: 0x00FF00,
                fields: [
                    { name: '💵 Cash', value: `$${wallet.toLocaleString()}`, inline: true },
                    { name: '🏦 Bank', value: `$${bank.toLocaleString()} / $${maxBank.toLocaleString()}`, inline: true },
                    { name: '💰 Total', value: `$${total.toLocaleString()}`, inline: true },
                    { name: '📊 Status', value: total > 100000 ? '🟢 Rich' : total > 50000 ? '🟡 Well-off' : '🔰 Normal', inline: true }
                ],
                footer: {
                    text: `Requested by ${interaction.user.tag}`,
                    icon_url: interaction.user.displayAvatarURL()
                },
                timestamp: new Date()
            }],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('balance_refresh')
                            .setLabel('🔄 Refresh')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('daily_claim')
                            .setLabel('🎁 Daily')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId('leaderboard')
                            .setLabel('🏆 Leaderboard')
                            .setStyle(ButtonStyle.Secondary)
                    )
            ]
        }),

        // Style 5: Detailed Stats
        () => ({
            embeds: [{
                title: `📈 ${targetUser.username}'s Financial Report`,
                description: `📊 Complete balance overview`,
                color: 0x2B2D31,
                fields: [
                    { name: '💵 Cash', value: `$${wallet.toLocaleString()}`, inline: true },
                    { name: '🏦 Bank', value: `$${bank.toLocaleString()} / $${maxBank.toLocaleString()}`, inline: true },
                    { name: '💰 Total Wealth', value: `$${total.toLocaleString()}`, inline: true },
                    { name: '📊 Bank Capacity', value: `${Math.round((bank / maxBank) * 100)}% used`, inline: true },
                    { name: '👤 User', value: `<@${targetUser.id}>`, inline: true },
                    { name: '📅 Checked', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                ],
                thumbnail: {
                    url: targetUser.displayAvatarURL()
                },
                footer: {
                    text: `💰 Economy System • ${interaction.guild.name}`,
                    icon_url: interaction.guild.iconURL()
                },
                timestamp: new Date()
            }],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('📊 Stats')
                            .setStyle(ButtonStyle.Secondary)
                            .setCustomId('stats_check'),
                        new ButtonBuilder()
                            .setLabel('🎁 Daily')
                            .setStyle(ButtonStyle.Success)
                            .setCustomId('daily_claim')
                    )
            ]
        }),

        // Style 6: Minimal
        () => ({
            embeds: [{
                title: `💰 ${targetUser.username}'s Balance`,
                description: `💵 Cash: **$${wallet.toLocaleString()}**\n🏦 Bank: **$${bank.toLocaleString()}** / $${maxBank.toLocaleString()}\n💰 Total: **$${total.toLocaleString()}**`,
                color: 0x00FF00,
                footer: {
                    text: `Requested by ${interaction.user.tag}`,
                    icon_url: interaction.user.displayAvatarURL()
                }
            }],
            components: []
        }),

        // Style 7: Colorful
        () => ({
            embeds: [{
                title: `🌈 ${targetUser.username}'s Balance`,
                description: `✨ Here's your current financial status!`,
                color: 0xFF6B6B,
                fields: [
                    { 
                        name: '💵 Cash', 
                        value: `**$${wallet.toLocaleString()}**`, 
                        inline: true 
                    },
                    { 
                        name: '🏦 Bank', 
                        value: `**$${bank.toLocaleString()}** / $${maxBank.toLocaleString()}`, 
                        inline: true 
                    },
                    { 
                        name: '💰 Total', 
                        value: `**$${total.toLocaleString()}**`, 
                        inline: true 
                    },
                    {
                        name: '🏆 Rank',
                        value: getRank(total),
                        inline: true
                    },
                    {
                        name: '📊 Progress',
                        value: getProgressBar(bank, maxBank),
                        inline: false
                    }
                ],
                thumbnail: {
                    url: targetUser.displayAvatarURL()
                },
                footer: {
                    text: `Requested by ${interaction.user.tag}`,
                    icon_url: interaction.user.displayAvatarURL()
                },
                timestamp: new Date()
            }],
            components: []
        }),

        // Style 8: Professional with Buttons
        () => ({
            embeds: [{
                title: `📋 Balance Report: ${targetUser.username}`,
                description: `**Transaction Summary** ✅`,
                color: 0x2B2D31,
                fields: [
                    { name: '💵 Cash', value: `$${wallet.toLocaleString()}`, inline: true },
                    { name: '🏦 Bank', value: `$${bank.toLocaleString()} / $${maxBank.toLocaleString()}`, inline: true },
                    { name: '💰 Total', value: `$${total.toLocaleString()}`, inline: true },
                    { name: '📊 Bank Usage', value: `${Math.round((bank / maxBank) * 100)}%`, inline: true },
                    { name: '👤 User ID', value: `\`${targetUser.id}\``, inline: true },
                    { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                ],
                thumbnail: {
                    url: targetUser.displayAvatarURL()
                },
                footer: {
                    text: `💰 Economy System • ${interaction.guild.name}`,
                    icon_url: interaction.guild.iconURL()
                },
                timestamp: new Date()
            }],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('📊 Dashboard')
                            .setStyle(ButtonStyle.Primary)
                            .setCustomId('dashboard'),
                        new ButtonBuilder()
                            .setLabel('🎁 Daily')
                            .setStyle(ButtonStyle.Success)
                            .setCustomId('daily_claim'),
                        new ButtonBuilder()
                            .setLabel('🏆 Leaderboard')
                            .setStyle(ButtonStyle.Secondary)
                            .setCustomId('leaderboard')
                    )
            ]
        })
    ];

    const randomIndex = Math.floor(Math.random() * styles.length);
    return styles[randomIndex]();
}

// ============================================================
// 🛠️ Helper Functions
// ============================================================

function getProgressBar(value, max, length = 20) {
    const percentage = Math.min((value / max) * 100, 100);
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `\`${bar}\` **${Math.round(percentage)}%**`;
}

function getRank(total) {
    if (total >= 1000000) return '👑 Billionaire';
    if (total >= 500000) return '💎 Millionaire';
    if (total >= 100000) return '🌟 Rich';
    if (total >= 50000) return '💪 Well-off';
    if (total >= 10000) return '💰 Comfortable';
    if (total >= 1000) return '🪙 Average';
    return '🔰 Starting Out';
}

export default {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription("💰 Check your or someone else's balance")
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('User to check balance for')
                .setRequired(false)
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const userOption = interaction.options.getUser("user");
        const targetUser = userOption || interaction.user;
        const guildId = interaction.guildId;

        logger.info(`[ECONOMY] Balance check - userOption: ${userOption?.id || 'null'}, targetUser: ${targetUser.id}, guildId: ${guildId}`);

        logger.debug(`[ECONOMY] Balance check for ${targetUser.id}`, { userId: targetUser.id, guildId });

        if (targetUser.bot) {
            throw createError(
                "Bot user queried for balance",
                ErrorTypes.VALIDATION,
                "🤖 Bots don't have an economy balance."
            );
        }

        const userData = await getEconomyData(client, guildId, targetUser.id);

        logger.info(`[ECONOMY] Economy data retrieved - userData:`, userData);

        if (!userData) {
            throw createError(
                "Failed to load economy data",
                ErrorTypes.DATABASE,
                "❌ Failed to load economy data. Please try again later.",
                { userId: targetUser.id, guildId }
            );
        }

        const maxBank = getMaxBankCapacity(userData);

        const wallet = typeof userData.wallet === 'number' ? userData.wallet : 0;
        const bank = typeof userData.bank === 'number' ? userData.bank : 0;
        const total = wallet + bank;

        // ============================================================
        // 🎨 Get Random Style
        // ============================================================
        const response = getRandomBalanceStyle(targetUser, wallet, bank, maxBank, total, interaction);

        logger.info(`[ECONOMY] Balance retrieved`, { userId: targetUser.id, wallet, bank, total });

        await InteractionHelper.safeEditReply(interaction, response);
    }, { command: 'balance' })
};
