import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { getEconomyData, addMoney, removeMoney, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import EconomyService from '../../services/economyService.js';

// ============================================================
// 🎨 Different Embed Styles for Pay
// ============================================================

function getRandomPayStyle(sender, receiver, amount, senderBalance, receiverBalance, interaction) {
    const styles = [
        // Style 1: Simple & Clean
        () => ({
            embeds: [{
                title: '✅ Payment Successful',
                description: `💸 You successfully paid **${receiver.username}** **$${amount.toLocaleString()}**!`,
                color: 0x00FF00,
                fields: [
                    { name: '💵 Amount', value: `$${amount.toLocaleString()}`, inline: true },
                    { name: '💼 Your Balance', value: `$${senderBalance.toLocaleString()}`, inline: true },
                    { name: '👤 Receiver', value: `<@${receiver.id}>`, inline: true }
                ],
                footer: {
                    text: `Paid to ${receiver.tag}`,
                    icon_url: receiver.displayAvatarURL()
                },
                timestamp: new Date()
            }],
            components: []
        }),

        // Style 2: Premium Style
        () => ({
            embeds: [{
                title: '💎 Payment Sent!',
                description: `🌟 **${sender.username}** sent **$${amount.toLocaleString()}** to **${receiver.username}**`,
                color: 0x9B59B6,
                fields: [
                    { name: '💵 Amount Sent', value: `**$${amount.toLocaleString()}**`, inline: true },
                    { name: '💼 Your New Balance', value: `**$${senderBalance.toLocaleString()}**`, inline: true },
                    { name: '👤 Receiver', value: `<@${receiver.id}>`, inline: true },
                    { name: '📊 Receiver\'s Balance', value: `**$${receiverBalance.toLocaleString()}**`, inline: true },
                    { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                ],
                thumbnail: {
                    url: receiver.displayAvatarURL()
                },
                footer: {
                    text: `💰 Transaction ID: #${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                    icon_url: interaction.guild.iconURL()
                },
                timestamp: new Date()
            }],
            components: []
        }),

        // Style 3: With Animation Emojis
        () => ({
            embeds: [{
                title: '💸 Payment Complete!',
                description: `💰 **${amount.toLocaleString()}** coins sent to **${receiver.username}**`,
                color: 0x00FF00,
                fields: [
                    { name: '💵 Amount', value: `$${amount.toLocaleString()}`, inline: true },
                    { name: '💼 Your Balance', value: `$${senderBalance.toLocaleString()}`, inline: true },
                    { name: '👤 Receiver', value: `<@${receiver.id}>`, inline: true },
                    { name: '📊 Receiver\'s Balance', value: `$${receiverBalance.toLocaleString()}`, inline: true }
                ],
                image: {
                    url: 'https://media.discordapp.net/attachments/123456789/123456789/payment.gif'
                },
                footer: {
                    text: `Transaction by ${interaction.user.tag}`,
                    icon_url: interaction.user.displayAvatarURL()
                },
                timestamp: new Date()
            }],
            components: []
        }),

        // Style 4: With Buttons
        () => ({
            embeds: [{
                title: '✅ Payment Confirmed!',
                description: `💸 **${sender.username}** → **${receiver.username}**`,
                color: 0x00FF00,
                fields: [
                    { name: '💵 Amount', value: `**$${amount.toLocaleString()}**`, inline: true },
                    { name: '💼 Your Balance', value: `$${senderBalance.toLocaleString()}`, inline: true },
                    { name: '👤 Receiver', value: `<@${receiver.id}>`, inline: true },
                    { name: '📊 Status', value: '✅ Completed', inline: true }
                ],
                footer: {
                    text: `Transaction ID: #${Date.now().toString(36).toUpperCase()}`,
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
                            .setCustomId('transaction_history')
                            .setLabel('📊 History')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('pay_again')
                            .setLabel('💸 Pay Again')
                            .setStyle(ButtonStyle.Success)
                    )
            ]
        }),

        // Style 5: Detailed Receipt
        () => ({
            embeds: [{
                title: '🧾 Payment Receipt',
                description: `**Transaction Details**`,
                color: 0x2B2D31,
                fields: [
                    { name: '📌 From', value: `<@${sender.id}>`, inline: true },
                    { name: '📌 To', value: `<@${receiver.id}>`, inline: true },
                    { name: '💵 Amount', value: `**$${amount.toLocaleString()}**`, inline: true },
                    { name: '💼 Sender Balance', value: `$${senderBalance.toLocaleString()}`, inline: true },
                    { name: '💼 Receiver Balance', value: `$${receiverBalance.toLocaleString()}`, inline: true },
                    { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '🆔 Transaction ID', value: `\`#${Date.now().toString(36).toUpperCase()}\``, inline: false }
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
                            .setCustomId('leaderboard')
                    )
            ]
        }),

        // Style 6: Minimal
        () => ({
            embeds: [{
                title: '✅ Payment Sent!',
                description: `💸 **${amount.toLocaleString()}** → ${receiver.username}\n💼 New Balance: **$${senderBalance.toLocaleString()}**`,
                color: 0x00FF00,
                footer: {
                    text: `Paid to ${receiver.tag}`,
                    icon_url: receiver.displayAvatarURL()
                }
            }],
            components: []
        }),

        // Style 7: Colorful Celebration
        () => ({
            embeds: [{
                title: '🎉 Payment Successful!',
                description: `✨ **${sender.username}** sent **${amount.toLocaleString()}** coins to **${receiver.username}**`,
                color: 0xFF6B6B,
                fields: [
                    { name: '💵 Amount', value: `**$${amount.toLocaleString()}**`, inline: true },
                    { name: '💼 Your Balance', value: `**$${senderBalance.toLocaleString()}**`, inline: true },
                    { name: '👤 Receiver', value: `<@${receiver.id}>`, inline: true },
                    { name: '📊 Receiver\'s Balance', value: `**$${receiverBalance.toLocaleString()}**`, inline: true },
                    { name: '✅ Status', value: 'Completed Successfully!', inline: true }
                ],
                thumbnail: {
                    url: receiver.displayAvatarURL()
                },
                footer: {
                    text: `💰 Transaction by ${interaction.user.tag}`,
                    icon_url: interaction.user.displayAvatarURL()
                },
                timestamp: new Date()
            }],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('balance_check')
                            .setLabel('💰 Check Balance')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId('pay_again')
                            .setLabel('💸 Pay Again')
                            .setStyle(ButtonStyle.Primary)
                    )
            ]
        }),

        // Style 8: Professional
        () => ({
            embeds: [{
                title: '📋 Transaction Confirmed',
                description: `**Payment Processing Complete** ✅`,
                color: 0x2B2D31,
                fields: [
                    { name: '💵 Amount', value: `$${amount.toLocaleString()}`, inline: true },
                    { name: '👤 Sender', value: `<@${sender.id}>`, inline: true },
                    { name: '👤 Receiver', value: `<@${receiver.id}>`, inline: true },
                    { name: '💼 Sender Balance', value: `$${senderBalance.toLocaleString()}`, inline: true },
                    { name: '💼 Receiver Balance', value: `$${receiverBalance.toLocaleString()}`, inline: true },
                    { name: '📅 Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
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
                            .setLabel('📈 Stats')
                            .setStyle(ButtonStyle.Secondary)
                            .setCustomId('stats'),
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

export default {
    data: new SlashCommandBuilder()
        .setName('pay')
        .setDescription('💸 Pay another user some of your cash')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('User to pay')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('Amount to pay')
                .setRequired(true)
                .setMinValue(1)
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;
            
        const senderId = interaction.user.id;
        const receiver = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("amount");
        const guildId = interaction.guildId;

        logger.debug(`[ECONOMY] Pay command initiated`, { 
            senderId, 
            receiverId: receiver.id,
            amount,
            guildId
        });

        if (receiver.bot) {
            throw createError(
                "Cannot pay bot",
                ErrorTypes.VALIDATION,
                "🤖 You cannot pay a bot.",
                { receiverId: receiver.id, isBot: true }
            );
        }
        
        if (receiver.id === senderId) {
            throw createError(
                "Cannot pay self",
                ErrorTypes.VALIDATION,
                "❌ You cannot pay yourself.",
                { senderId, receiverId: receiver.id }
            );
        }
        
        if (amount <= 0) {
            throw createError(
                "Invalid payment amount",
                ErrorTypes.VALIDATION,
                "❌ Amount must be greater than zero.",
                { amount, senderId }
            );
        }

        const [senderData, receiverData] = await Promise.all([
            getEconomyData(client, guildId, senderId),
            getEconomyData(client, guildId, receiver.id)
        ]);

        if (!senderData) {
            throw createError(
                "Failed to load sender economy data",
                ErrorTypes.DATABASE,
                "❌ Failed to load your economy data. Please try again later.",
                { userId: senderId, guildId }
            );
        }
        
        if (!receiverData) {
            throw createError(
                "Failed to load receiver economy data",
                ErrorTypes.DATABASE,
                "❌ Failed to load the receiver's economy data. Please try again later.",
                { userId: receiver.id, guildId }
            );
        }

        // Check if sender has enough money
        if ((senderData.wallet || 0) < amount) {
            throw createError(
                "Insufficient funds",
                ErrorTypes.VALIDATION,
                `❌ You don't have enough money! You have **$${(senderData.wallet || 0).toLocaleString()}** but need **$${amount.toLocaleString()}**.`,
                { senderId, wallet: senderData.wallet, amount }
            );
        }

        const result = await EconomyService.transferMoney(
            client, 
            guildId, 
            senderId, 
            receiver.id, 
            amount
        );

        const updatedSenderData = await getEconomyData(client, guildId, senderId);
        const updatedReceiverData = await getEconomyData(client, guildId, receiver.id);

        // ============================================================
        // 🎨 Get Random Style
        // ============================================================
        const response = getRandomPayStyle(
            interaction.user, 
            receiver, 
            amount, 
            updatedSenderData.wallet, 
            updatedReceiverData.wallet, 
            interaction
        );

        await InteractionHelper.safeEditReply(interaction, response);

        logger.info(`[ECONOMY] Payment sent successfully`, {
            senderId,
            receiverId: receiver.id,
            amount,
            senderBalance: updatedSenderData.wallet,
            receiverBalance: updatedReceiverData.wallet
        });

        // ============================================================
        // 📧 Send DM to receiver (if possible)
        // ============================================================
        try {
            const receiverEmbed = {
                title: '💸 Incoming Payment!',
                description: `**${interaction.user.username}** paid you **$${amount.toLocaleString()}**!`,
                color: 0x00FF00,
                fields: [
                    {
                        name: '💼 Your New Balance',
                        value: `**$${updatedReceiverData.wallet.toLocaleString()}**`,
                        inline: true
                    },
                    {
                        name: '👤 From',
                        value: `<@${senderId}>`,
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
            await receiver.send({ embeds: [receiverEmbed] });
        } catch (e) {
            logger.warn(`Could not DM user ${receiver.id}: ${e.message}`);
        }
    }, { command: 'pay' })
};
