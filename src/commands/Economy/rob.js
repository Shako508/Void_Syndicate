import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { successEmbed, warningEmbed, buildUserErrorEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const ROB_COOLDOWN = 4 * 60 * 60 * 1000;
const BASE_ROB_SUCCESS_CHANCE = 0.25;
const ROB_PERCENTAGE = 0.15;
const FINE_PERCENTAGE = 0.1;

// ============================================================
// 🎨 Different Embed Styles for Rob
// ============================================================

function getRobStyle(isSuccessful, robber, victim, amountStolen, fineAmount, robberBalance, victimBalance, interaction) {
    const styles = [
        // Style 1: Simple & Clean
        () => ({
            embeds: [{
                title: isSuccessful ? '✅ Robbery Successful!' : '❌ Robbery Failed!',
                description: isSuccessful 
                    ? `💸 You successfully stole **$${amountStolen.toLocaleString()}** from ${victim.username}!`
                    : `😅 You failed the robbery and were caught! You were fined **$${fineAmount.toLocaleString()}**!`,
                color: isSuccessful ? 0x00FF00 : 0xFF0000,
                fields: [
                    { 
                        name: isSuccessful ? '💰 Stolen' : '💸 Fine', 
                        value: isSuccessful ? `$${amountStolen.toLocaleString()}` : `$${fineAmount.toLocaleString()}`, 
                        inline: true 
                    },
                    { 
                        name: '💼 Your Balance', 
                        value: `$${robberBalance.toLocaleString()}`, 
                        inline: true 
                    },
                    { 
                        name: '👤 Victim', 
                        value: `<@${victim.id}>`, 
                        inline: true 
                    }
                ],
                footer: {
                    text: `⏳ Next robbery available in 4 hours`,
                    icon_url: interaction.user.displayAvatarURL()
                },
                timestamp: new Date()
            }],
            components: []
        }),

        // Style 2: Premium Style
        () => ({
            embeds: [{
                title: isSuccessful ? '💎 Heist Successful!' : '💀 Heist Failed!',
                description: isSuccessful 
                    ? `🕵️ **${robber.username}** successfully robbed **${victim.username}**!`
                    : `🚨 **${robber.username}** got caught robbing **${victim.username}**!`,
                color: isSuccessful ? 0x9B59B6 : 0xFF4444,
                fields: [
                    { 
                        name: isSuccessful ? '💰 Amount Stolen' : '💸 Fine Paid', 
                        value: isSuccessful ? `**$${amountStolen.toLocaleString()}**` : `**$${fineAmount.toLocaleString()}**`, 
                        inline: true 
                    },
                    { 
                        name: '💼 Robber Balance', 
                        value: `**$${robberBalance.toLocaleString()}**`, 
                        inline: true 
                    },
                    { 
                        name: '👤 Victim', 
                        value: `<@${victim.id}>`, 
                        inline: true 
                    },
                    { 
                        name: '💼 Victim Balance', 
                        value: `**$${victimBalance.toLocaleString()}**`, 
                        inline: true 
                    },
                    { 
                        name: '📊 Success Rate', 
                        value: `${Math.round(BASE_ROB_SUCCESS_CHANCE * 100)}%`, 
                        inline: true 
                    }
                ],
                thumbnail: {
                    url: isSuccessful 
                        ? 'https://cdn.discordapp.com/emojis/123456789.png' 
                        : 'https://cdn.discordapp.com/emojis/987654321.png'
                },
                footer: {
                    text: `🏷️ Robbery ID: #${Date.now().toString(36).toUpperCase()}`,
                    icon_url: interaction.guild.iconURL()
                },
                timestamp: new Date()
            }],
            components: []
        }),

        // Style 3: With Buttons
        () => ({
            embeds: [{
                title: isSuccessful ? '🎉 Robbery Complete!' : '😅 Oops! Robbery Failed!',
                description: isSuccessful 
                    ? `💸 **${amountStolen.toLocaleString()}** coins stolen from ${victim.username}!`
                    : `🚨 You got caught! Lost **$${fineAmount.toLocaleString()}**!`,
                color: isSuccessful ? 0x00FF00 : 0xFF0000,
                fields: [
                    { 
                        name: isSuccessful ? '💰 Profit' : '💸 Loss', 
                        value: isSuccessful ? `+$${amountStolen.toLocaleString()}` : `-$${fineAmount.toLocaleString()}`, 
                        inline: true 
                    },
                    { 
                        name: '💼 Balance', 
                        value: `$${robberBalance.toLocaleString()}`, 
                        inline: true 
                    },
                    { 
                        name: '👤 Victim', 
                        value: `<@${victim.id}>`, 
                        inline: true 
                    }
                ],
                footer: {
                    text: `⏳ Next robbery: 4 hours`,
                    icon_url: interaction.user.displayAvatarURL()
                },
                timestamp: new Date()
            }],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('balance_check')
                            .setLabel('💰 Balance')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('rob_again')
                            .setLabel('🔫 Rob Again')
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId('leaderboard')
                            .setLabel('🏆 Leaderboard')
                            .setStyle(ButtonStyle.Secondary)
                    )
            ]
        }),

        // Style 4: Detailed Stats
        () => ({
            embeds: [{
                title: isSuccessful ? '📊 Robbery Report: Success' : '📊 Robbery Report: Failure',
                description: `**Transaction Details**`,
                color: isSuccessful ? 0x2B2D31 : 0x2B2D31,
                fields: [
                    { name: '🕵️ Robber', value: `<@${robber.id}>`, inline: true },
                    { name: '👤 Victim', value: `<@${victim.id}>`, inline: true },
                    { 
                        name: isSuccessful ? '💰 Amount Stolen' : '💸 Fine', 
                        value: isSuccessful ? `+$${amountStolen.toLocaleString()}` : `-$${fineAmount.toLocaleString()}`, 
                        inline: true 
                    },
                    { 
                        name: '💼 Robber Balance', 
                        value: `$${robberBalance.toLocaleString()}`, 
                        inline: true 
                    },
                    { 
                        name: '💼 Victim Balance', 
                        value: `$${victimBalance.toLocaleString()}`, 
                        inline: true 
                    },
                    { 
                        name: '📅 Date', 
                        value: `<t:${Math.floor(Date.now() / 1000)}:F>`, 
                        inline: true 
                    },
                    { 
                        name: '🎯 Success Chance', 
                        value: `${Math.round(BASE_ROB_SUCCESS_CHANCE * 100)}%`, 
                        inline: true 
                    }
                ],
                thumbnail: {
                    url: interaction.guild.iconURL()
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
                            .setLabel('🏆 Leaderboard')
                            .setStyle(ButtonStyle.Secondary)
                            .setCustomId('leaderboard')
                    )
            ]
        }),

        // Style 5: Minimal
        () => ({
            embeds: [{
                title: isSuccessful ? '✅ Success!' : '❌ Failed!',
                description: isSuccessful 
                    ? `Stole **$${amountStolen.toLocaleString()}** from ${victim.username}!`
                    : `Caught! Lost **$${fineAmount.toLocaleString()}**!`,
                color: isSuccessful ? 0x00FF00 : 0xFF0000,
                footer: {
                    text: `Balance: $${robberBalance.toLocaleString()}`,
                    icon_url: interaction.user.displayAvatarURL()
                }
            }],
            components: []
        }),

        // Style 6: Dramatic Style
        () => ({
            embeds: [{
                title: isSuccessful ? '🔥 HEIST SUCCESSFUL!' : '💀 HEIST FAILED!',
                description: isSuccessful 
                    ? `🎯 **${robber.username}** pulled off the perfect heist!`
                    : `🚨 **${robber.username}** got caught red-handed!`,
                color: isSuccessful ? 0xFFD700 : 0xFF0000,
                fields: [
                    { 
                        name: '💰 Loot', 
                        value: `**$${amountStolen.toLocaleString()}**`, 
                        inline: true 
                    },
                    { 
                        name: '💼 Balance', 
                        value: `**$${robberBalance.toLocaleString()}**`, 
                        inline: true 
                    },
                    { 
                        name: '👤 Victim', 
                        value: `<@${victim.id}>`, 
                        inline: true 
                    },
                    { 
                        name: '📊 Status', 
                        value: isSuccessful ? '✅ Completed' : '❌ Failed', 
                        inline: true 
                    }
                ],
                image: {
                    url: isSuccessful 
                        ? 'https://media.discordapp.net/attachments/123456789/heist_success.gif'
                        : 'https://media.discordapp.net/attachments/123456789/heist_fail.gif'
                },
                footer: {
                    text: `🔫 Robbery ID: #${Date.now().toString(36).toUpperCase()}`,
                    icon_url: interaction.user.displayAvatarURL()
                },
                timestamp: new Date()
            }],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('balance_check')
                            .setLabel('💰 Balance')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('rob_again')
                            .setLabel('🔫 Try Again')
                            .setStyle(ButtonStyle.Danger)
                    )
            ]
        }),

        // Style 7: Professional
        () => ({
            embeds: [{
                title: `📋 Robbery ${isSuccessful ? 'Success' : 'Failure'}`,
                description: `**Transaction Report**`,
                color: isSuccessful ? 0x00FF00 : 0xFF0000,
                fields: [
                    { name: '🕵️ Robber', value: `<@${robber.id}>`, inline: true },
                    { name: '👤 Victim', value: `<@${victim.id}>`, inline: true },
                    { 
                        name: isSuccessful ? '💰 Amount' : '💸 Fine', 
                        value: isSuccessful ? `+$${amountStolen.toLocaleString()}` : `-$${fineAmount.toLocaleString()}`, 
                        inline: true 
                    },
                    { 
                        name: '💼 New Balance', 
                        value: `$${robberBalance.toLocaleString()}`, 
                        inline: true 
                    },
                    { 
                        name: '📅 Time', 
                        value: `<t:${Math.floor(Date.now() / 1000)}:R>`, 
                        inline: true 
                    },
                    { 
                        name: '🎯 Chance', 
                        value: `${Math.round(BASE_ROB_SUCCESS_CHANCE * 100)}%`, 
                        inline: true 
                    }
                ],
                thumbnail: {
                    url: interaction.guild.iconURL()
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
                            .setLabel('🏆 Leaderboard')
                            .setStyle(ButtonStyle.Secondary)
                            .setCustomId('leaderboard'),
                        new ButtonBuilder()
                            .setLabel('🔫 Rob Again')
                            .setStyle(ButtonStyle.Danger)
                            .setCustomId('rob_again')
                    )
            ]
        })
    ];

    const randomIndex = Math.floor(Math.random() * styles.length);
    return styles[randomIndex]();
}

export default {
    data: new SlashCommandBuilder()
        .setName('rob')
        .setDescription('🔫 Attempt to rob another user (very risky)')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('User to rob')
                .setRequired(true)
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;
            
        const robberId = interaction.user.id;
        const victimUser = interaction.options.getUser("user");
        const guildId = interaction.guildId;
        const now = Date.now();

        if (robberId === victimUser.id) {
            throw createError(
                "Cannot rob self",
                ErrorTypes.VALIDATION,
                "❌ You cannot rob yourself. Try robbing someone else!",
                { robberId, victimId: victimUser.id }
            );
        }
        
        if (victimUser.bot) {
            throw createError(
                "Cannot rob bot",
                ErrorTypes.VALIDATION,
                "🤖 You cannot rob a bot. They don't have money!",
                { victimId: victimUser.id, isBot: true }
            );
        }

        const robberData = await getEconomyData(client, guildId, robberId);
        const victimData = await getEconomyData(client, guildId, victimUser.id);
        
        if (!robberData || !victimData) {
            throw createError(
                "Failed to load economy data",
                ErrorTypes.DATABASE,
                "❌ Failed to load economy data. Please try again later.",
                { robberId: !!robberData, victimId: !!victimData, guildId }
            );
        }
        
        const lastRob = robberData.lastRob || 0;

        if (now < lastRob + ROB_COOLDOWN) {
            const remaining = lastRob + ROB_COOLDOWN - now;
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

            throw createError(
                "Robbery cooldown active",
                ErrorTypes.RATE_LIMIT,
                `⏳ You need to lay low. Wait **${hours}h ${minutes}m** before attempting another robbery.`,
                { remaining, hours, minutes, cooldownType: 'rob' }
            );
        }

        // Check if victim has enough money
        if ((victimData.wallet || 0) < 500) {
            throw createError(
                "Victim too poor",
                ErrorTypes.VALIDATION,
                `😅 ${victimUser.username} is too poor. They need at least **$500** cash to be worth robbing.`,
                { victimWallet: victimData.wallet, required: 500 }
            );
        }

        // Check if robber has enough money for fine
        if ((robberData.wallet || 0) < 50) {
            throw createError(
                "Robber too poor",
                ErrorTypes.VALIDATION,
                `😅 You need at least **$50** to attempt a robbery (in case you get caught).`,
                { robberWallet: robberData.wallet, required: 50 }
            );
        }

        // Check for safe
        const hasSafe = victimData.inventory?.["personal_safe"] || 0;

        if (hasSafe > 0) {
            robberData.lastRob = now;
            await setEconomyData(client, guildId, robberId, robberData);

            const safeEmbed = {
                title: '🛡️ Robbery Blocked!',
                description: `🔒 ${victimUser.username} has a **Personal Safe**! Your attempt failed, but you got away clean.`,
                color: 0xFFA500,
                fields: [
                    { name: '🛡️ Protection', value: 'Personal Safe', inline: true },
                    { name: '👤 Victim', value: `<@${victimUser.id}>`, inline: true },
                    { name: '📊 Result', value: '❌ Failed (No Loss)', inline: true }
                ],
                footer: {
                    text: `⏳ Next robbery available in 4 hours`,
                    icon_url: interaction.user.displayAvatarURL()
                },
                timestamp: new Date()
            };

            return await InteractionHelper.safeEditReply(interaction, { embeds: [safeEmbed] });
        }

        // ============================================================
        // 💰 Execute Robbery
        // ============================================================
        const isSuccessful = Math.random() < BASE_ROB_SUCCESS_CHANCE;
        let amountStolen = 0;
        let fineAmount = 0;

        if (isSuccessful) {
            amountStolen = Math.floor(victimData.wallet * ROB_PERCENTAGE);
            robberData.wallet = (robberData.wallet || 0) + amountStolen;
            victimData.wallet = (victimData.wallet || 0) - amountStolen;
        } else {
            fineAmount = Math.floor((robberData.wallet || 0) * FINE_PERCENTAGE);
            if ((robberData.wallet || 0) < fineAmount) {
                robberData.wallet = 0;
            } else {
                robberData.wallet = (robberData.wallet || 0) - fineAmount;
            }
        }

        robberData.lastRob = now;

        await setEconomyData(client, guildId, robberId, robberData);
        await setEconomyData(client, guildId, victimUser.id, victimData);

        // ============================================================
        // 🎨 Get Random Style
        // ============================================================
        const response = getRobStyle(
            isSuccessful,
            interaction.user,
            victimUser,
            amountStolen,
            fineAmount,
            robberData.wallet,
            victimData.wallet,
            interaction
        );

        await InteractionHelper.safeEditReply(interaction, response);

        // ============================================================
        // 📧 DM Victim (if possible)
        // ============================================================
        try {
            const victimEmbed = {
                title: isSuccessful ? '🔫 You Got Robbed!' : '🛡️ Robbery Attempt Failed!',
                description: isSuccessful 
                    ? `**${interaction.user.username}** stole **$${amountStolen.toLocaleString()}** from you!`
                    : `**${interaction.user.username}** tried to rob you but failed!`,
                color: isSuccessful ? 0xFF0000 : 0x00FF00,
                fields: [
                    {
                        name: '💼 Your New Balance',
                        value: `**$${victimData.wallet.toLocaleString()}**`,
                        inline: true
                    },
                    {
                        name: '👤 Robber',
                        value: `<@${robberId}>`,
                        inline: true
                    },
                    {
                        name: '📅 Date',
                        value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                        inline: true
                    }
                ],
                footer: {
                    text: `💰 Economy System • ${interaction.guild.name}`,
                    icon_url: interaction.guild.iconURL()
                },
                timestamp: new Date()
            };
            await victimUser.send({ embeds: [victimEmbed] });
        } catch (e) {
            logger.warn(`Could not DM user ${victimUser.id}: ${e.message}`);
        }
    }, { command: 'rob' })
};
