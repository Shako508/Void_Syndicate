import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { getGuildConfig } from '../../services/guildConfig.js';
import { formatDuration } from '../../utils/embeds.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const DAILY_COOLDOWN = 24 * 60 * 60 * 1000;
const DAILY_AMOUNT = 1000;
const PREMIUM_BONUS_PERCENTAGE = 0.1;

// ============================================================
// 🎨 Different Embed Styles
// ============================================================

function getRandomStyle(userId, earned, userData, hasPremiumRole, interaction) {
    const styles = [
        // Style 1: Simple & Clean
        () => ({
            embeds: [{
                title: '💰 Daily Reward',
                description: `You received **${earned.toLocaleString()}** coins!`,
                color: 0x00FF00,
                fields: [
                    { name: '💼 Balance', value: `${userData.wallet.toLocaleString()} coins`, inline: true },
                    { name: '📅 Date', value: new Date().toLocaleDateString('en-US'), inline: true }
                ],
                footer: { text: 'Come back tomorrow for more! 🎯' },
                timestamp: new Date()
            }],
            components: []
        }),

        // Style 2: Premium Style
        () => ({
            embeds: [{
                title: '👑 Daily Reward',
                description: `🌟 Welcome back, <@${userId}>!`,
                color: hasPremiumRole ? 0x9B59B6 : 0x00FF00,
                fields: [
                    { name: '🪙 Amount', value: `${earned.toLocaleString()} coins`, inline: true },
                    { name: '💼 Wallet', value: `${userData.wallet.toLocaleString()} coins`, inline: true },
                    { name: '⏳ Next', value: `24 hours`, inline: true },
                    { name: '👑 Status', value: hasPremiumRole ? 'Premium ✨' : 'Standard', inline: true },
                    { name: '📅 Date', value: new Date().toLocaleDateString('en-US'), inline: true }
                ],
                thumbnail: {
                    url: interaction.user.displayAvatarURL()
                },
                footer: {
                    text: hasPremiumRole ? '✨ Premium bonus applied!' : '💡 Get premium for 10% bonus!',
                    icon_url: interaction.user.displayAvatarURL()
                },
                timestamp: new Date()
            }],
            components: []
        }),

        // Style 3: With Image
        () => ({
            embeds: [{
                title: '🎉 Daily Reward Claimed!',
                description: `You received **${earned.toLocaleString()}** coins!`,
                color: 0x00FF00,
                image: {
                    url: 'https://media.discordapp.net/attachments/123456789/123456789/coins.gif'
                },
                fields: [
                    { name: '💼 New Balance', value: `${userData.wallet.toLocaleString()} coins`, inline: true },
                    { name: '⏳ Next Claim', value: `24 hours`, inline: true }
                ],
                footer: { text: '💰 Enjoy your reward!' },
                timestamp: new Date()
            }],
            components: []
        }),

        // Style 4: With Buttons
        () => ({
            embeds: [{
                title: '🎁 Daily Reward',
                description: `✅ Successfully claimed **${earned.toLocaleString()}** coins!`,
                color: 0x00FF00,
                fields: [
                    { name: '💼 Balance', value: `${userData.wallet.toLocaleString()} coins`, inline: true },
                    { name: '📊 Status', value: hasPremiumRole ? '👑 Premium' : '🔰 Standard', inline: true },
                    { name: '⏳ Next Claim', value: `24 hours`, inline: true }
                ],
                footer: {
                    text: 'Keep coming back daily! 💪',
                    icon_url: interaction.user.displayAvatarURL()
                },
                timestamp: new Date()
            }],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('daily_claim')
                            .setLabel('✅ Claimed')
                            .setStyle(ButtonStyle.Success)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('daily_info')
                            .setLabel('ℹ️ Info')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('balance_check')
                            .setLabel('💰 Balance')
                            .setStyle(ButtonStyle.Primary)
                    )
            ]
        }),

        // Style 5: Detailed Stats
        () => ({
            embeds: [{
                title: '📊 Daily Reward Stats',
                description: `🌟 <@${userId}> claimed their daily reward!`,
                color: 0x00FF00,
                fields: [
                    { name: '🪙 Amount', value: `${earned.toLocaleString()} coins`, inline: true },
                    { name: '💼 Total Balance', value: `${userData.wallet.toLocaleString()} coins`, inline: true },
                    { name: '👑 Premium', value: hasPremiumRole ? '✅ Active' : '❌ Inactive', inline: true },
                    { name: '📅 Claimed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '⏳ Next Claim', value: `<t:${Math.floor((Date.now() + 86400000) / 1000)}:R>`, inline: true },
                    { name: '💡 Tip', value: hasPremiumRole ? '✨ 10% bonus applied!' : 'Upgrade to premium for 10% bonus!', inline: false }
                ],
                thumbnail: {
                    url: interaction.user.displayAvatarURL()
                },
                footer: {
                    text: hasPremiumRole ? '👑 Premium Member' : '🔰 Standard Member',
                    icon_url: interaction.guild.iconURL()
                },
                timestamp: new Date()
            }],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('💰 Balance')
                            .setStyle(ButtonStyle.Primary)
                            .setCustomId('balance_check'),
                        new ButtonBuilder()
                            .setLabel('📊 Stats')
                            .setStyle(ButtonStyle.Secondary)
                            .setCustomId('stats_check')
                    )
            ]
        }),

        // Style 6: Minimal
        () => ({
            embeds: [{
                title: '✅ Daily Claimed!',
                description: `+${earned.toLocaleString()} coins!`,
                color: 0x00FF00,
                fields: [
                    { name: '💼 Balance', value: `${userData.wallet.toLocaleString()} coins`, inline: true }
                ],
                footer: { text: '⏳ Next claim: 24 hours' }
            }],
            components: []
        }),

        // Style 7: Celebration Style
        () => ({
            embeds: [{
                title: '🎊 Congratulations!',
                description: `🎉 <@${userId}> just claimed **${earned.toLocaleString()}** coins!`,
                color: 0xFFD700,
                fields: [
                    { name: '💼 New Balance', value: `**${userData.wallet.toLocaleString()}** coins`, inline: true },
                    { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '⏳ Next', value: `24 hours`, inline: true },
                    { name: '🎯 Streak Bonus', value: hasPremiumRole ? '✨ Active' : '❌ None', inline: true }
                ],
                thumbnail: {
                    url: 'https://cdn.discordapp.com/emojis/123456789.png'
                },
                footer: {
                    text: '🌟 Keep the streak alive!',
                    icon_url: interaction.user.displayAvatarURL()
                },
                timestamp: new Date()
            }],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('🎁 Claim Again')
                            .setStyle(ButtonStyle.Success)
                            .setDisabled(true)
                            .setCustomId('claim_disabled'),
                        new ButtonBuilder()
                            .setLabel('💰 Balance')
                            .setStyle(ButtonStyle.Primary)
                            .setCustomId('balance_check')
                    )
            ]
        }),

        // Style 8: Professional
        () => ({
            embeds: [{
                title: '📋 Daily Reward Summary',
                description: `**Transaction Complete** ✅`,
                color: 0x2B2D31,
                fields: [
                    { name: '📌 User', value: `<@${userId}>`, inline: true },
                    { name: '💰 Amount', value: `+${earned.toLocaleString()} coins`, inline: true },
                    { name: '💼 Total', value: `${userData.wallet.toLocaleString()} coins`, inline: true },
                    { name: '📊 Type', value: hasPremiumRole ? 'Premium Bonus' : 'Standard', inline: true },
                    { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '⏳ Next', value: `24 hours`, inline: true }
                ],
                footer: {
                    text: '💰 Economy System • TitanBot',
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
                            .setLabel('📈 Stats')
                            .setStyle(ButtonStyle.Secondary)
                            .setCustomId('stats')
                    )
            ]
        })
    ];

    // Pick a random style
    const randomIndex = Math.floor(Math.random() * styles.length);
    return styles[randomIndex]();
}

export default {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('🎁 Claim your daily cash reward'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;
            
        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const now = Date.now();

        logger.debug(`[ECONOMY] Daily claimed started for ${userId}`, { userId, guildId });

        const userData = await getEconomyData(client, guildId, userId);
        
        if (!userData) {
            throw createError(
                "Failed to load economy data for daily",
                ErrorTypes.DATABASE,
                "❌ Failed to load your economy data. Please try again later.",
                { userId, guildId }
            );
        }
        
        const lastDaily = userData.lastDaily || 0;

        // ============================================================
        // ⏳ Cooldown
        // ============================================================
        if (now < lastDaily + DAILY_COOLDOWN) {
            const timeRemaining = lastDaily + DAILY_COOLDOWN - now;
            
            const cooldownEmbed = {
                title: '⏳ Hold on!',
                description: `🌙 **Daily reward** is available once every 24 hours`,
                color: 0xFFA500,
                fields: [
                    {
                        name: '⏰ Time Remaining',
                        value: `**${formatDuration(timeRemaining)}**`,
                        inline: true
                    },
                    {
                        name: '🪙 Next Reward',
                        value: `**${DAILY_AMOUNT.toLocaleString()}** coins`,
                        inline: true
                    },
                    {
                        name: '💡 Tip',
                        value: 'Come back after the cooldown to claim your reward!',
                        inline: false
                    }
                ],
                footer: {
                    text: 'Patience is the key to profit 😉',
                    icon_url: interaction.user.displayAvatarURL()
                },
                timestamp: new Date(),
            };
            
            await InteractionHelper.safeEditReply(interaction, { embeds: [cooldownEmbed] });
            return;
        }

        // ============================================================
        // 💰 Calculate Reward
        // ============================================================
        const guildConfig = await getGuildConfig(client, guildId);
        const PREMIUM_ROLE_ID = guildConfig.premiumRoleId;

        let earned = DAILY_AMOUNT;
        let bonusMessage = "";
        let hasPremiumRole = false;

        if (
            PREMIUM_ROLE_ID &&
            interaction.member &&
            interaction.member.roles.cache.has(PREMIUM_ROLE_ID)
        ) {
            const bonusAmount = Math.floor(DAILY_AMOUNT * PREMIUM_BONUS_PERCENTAGE);
            earned += bonusAmount;
            bonusMessage = `\n✨ **Premium Bonus:** +${bonusAmount.toLocaleString()} coins`;
            hasPremiumRole = true;
        }

        userData.wallet = (userData.wallet || 0) + earned;
        userData.lastDaily = now;

        await setEconomyData(client, guildId, userId, userData);

        logger.info(`[ECONOMY_TRANSACTION] Daily claimed`, {
            userId,
            guildId,
            amount: earned,
            newWallet: userData.wallet,
            hasPremium: hasPremiumRole,
            timestamp: new Date().toISOString()
        });

        // ============================================================
        // 🎨 Get Random Style
        // ============================================================
        const response = getRandomStyle(userId, earned, userData, hasPremiumRole, interaction);
        
        await InteractionHelper.safeEditReply(interaction, response);

    }, { command: 'daily' })
};
