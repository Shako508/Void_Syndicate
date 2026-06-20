import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder } from 'discord.js';
import { createEmbed, successEmbed, errorEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

// ============================================================
// 🛒 Shop Categories & Items
// ============================================================

const SHOP_ITEMS = {
    '🔧 Tools': [
        { id: 'pickaxe', name: '⛏️ Pickaxe', price: 500, description: 'Mine faster!' },
        { id: 'axe', name: '🪓 Axe', price: 500, description: 'Chop wood faster!' },
        { id: 'fishing_rod', name: '🎣 Fishing Rod', price: 300, description: 'Catch rare fish!' },
        { id: 'shovel', name: '🪠 Shovel', price: 400, description: 'Dig for treasures!' },
        { id: 'hoe', name: '🌾 Hoe', price: 300, description: 'Farm better crops!' },
    ],
    '🛡️ Protection': [
        { id: 'helmet', name: '⛑️ Helmet', price: 800, description: 'Protects your head!' },
        { id: 'chestplate', name: '🛡️ Chestplate', price: 1200, description: 'Protects your body!' },
        { id: 'leggings', name: '👖 Leggings', price: 1000, description: 'Protects your legs!' },
        { id: 'boots', name: '👢 Boots', price: 600, description: 'Protects your feet!' },
        { id: 'shield', name: '🛡️ Shield', price: 1500, description: 'Blocks all damage!' },
    ],
    '🎮 Boosts': [
        { id: 'xp_boost', name: '📈 XP Boost', price: 1000, description: '2x XP for 1 hour!' },
        { id: 'coin_boost', name: '💰 Coin Boost', price: 800, description: '2x coins for 1 hour!' },
        { id: 'luck_boost', name: '🍀 Luck Boost', price: 600, description: 'Better loot drops!' },
        { id: 'speed_boost', name: '⚡ Speed Boost', price: 500, description: 'Move faster!' },
        { id: 'strength_boost', name: '💪 Strength Boost', price: 700, description: 'Deal more damage!' },
    ],
    '💎 Special': [
        { id: 'personal_safe', name: '🔒 Personal Safe', price: 5000, description: 'Protects your money from robbers!' },
        { id: 'golden_ticket', name: '🎫 Golden Ticket', price: 10000, description: 'Special access to premium items!' },
        { id: 'vip_pass', name: '👑 VIP Pass', price: 25000, description: 'VIP status for 30 days!' },
        { id: 'mystery_box', name: '🎁 Mystery Box', price: 2000, description: 'Random surprise item!' },
        { id: 'legendary_key', name: '🗝️ Legendary Key', price: 15000, description: 'Opens legendary chests!' },
    ],
    '🎨 Cosmetics': [
        { id: 'hat', name: '🧢 Hat', price: 300, description: 'Stylish hat!' },
        { id: 'glasses', name: '👓 Glasses', price: 200, description: 'Cool shades!' },
        { id: 'cape', name: '🦸 Cape', price: 1000, description: 'Superhero cape!' },
        { id: 'pet', name: '🐾 Pet', price: 2000, description: 'Cute pet companion!' },
        { id: 'trail', name: '✨ Trail', price: 1500, description: 'Leaves a sparkly trail!' },
    ]
};

// ============================================================
// 🎨 Shop Embed Styles
// ============================================================

function getShopStyle(interaction, items, selectedCategory = null) {
    const totalItems = Object.values(items).flat().length;
    const categories = Object.keys(items);
    
    const styles = [
        // Style 1: Simple & Clean
        () => ({
            embeds: [{
                title: '🛒 Economy Shop',
                description: `💰 Browse items available for purchase.`,
                color: 0x00FF00,
                fields: [
                    { 
                        name: '📊 Total Items', 
                        value: `${totalItems}`, 
                        inline: true 
                    },
                    { 
                        name: '📂 Categories', 
                        value: `${categories.length}`, 
                        inline: true 
                    },
                    { 
                        name: 'ℹ️ Instructions', 
                        value: 'Use the menu below to browse categories.', 
                        inline: false 
                    }
                ],
                footer: {
                    text: `🛒 Shop • ${interaction.guild.name}`,
                    icon_url: interaction.guild.iconURL()
                },
                timestamp: new Date()
            }],
            components: []
        }),

        // Style 2: Premium Style
        () => ({
            embeds: [{
                title: '👑 Premium Shop',
                description: `✨ Welcome to the **Premium Economy Shop**!`,
                color: 0x9B59B6,
                fields: [
                    { 
                        name: '📊 Items Available', 
                        value: `**${totalItems}** items`, 
                        inline: true 
                    },
                    { 
                        name: '📂 Categories', 
                        value: `**${categories.length}** categories`, 
                        inline: true 
                    },
                    { 
                        name: '💡 Tip', 
                        value: 'Use the dropdown menu to browse items.\nUse `/balance` to check your coins.', 
                        inline: false 
                    }
                ],
                thumbnail: {
                    url: interaction.guild.iconURL()
                },
                footer: {
                    text: `👑 Premium Shop • ${interaction.guild.name}`,
                    icon_url: interaction.guild.iconURL()
                },
                timestamp: new Date()
            }],
            components: []
        }),

        // Style 3: With Category Highlight
        () => ({
            embeds: [{
                title: selectedCategory ? `🛒 ${selectedCategory}` : '🛒 Shop Categories',
                description: selectedCategory 
                    ? `📦 **${selectedCategory}** items available for purchase.` 
                    : '💰 Select a category below to browse items!',
                color: 0x00FF00,
                fields: selectedCategory ? 
                    items[selectedCategory].map(item => ({
                        name: `${item.name}`,
                        value: `💰 $${item.price.toLocaleString()}\n📝 ${item.description}`,
                        inline: true
                    })) : 
                    [
                        { 
                            name: '📊 Total Items', 
                            value: `${totalItems}`, 
                            inline: true 
                        },
                        { 
                            name: '📂 Categories', 
                            value: `${categories.length}`, 
                            inline: true 
                        }
                    ],
                footer: {
                    text: selectedCategory 
                        ? `🛒 ${selectedCategory} • ${interaction.guild.name}` 
                        : `🛒 Shop • ${interaction.guild.name}`,
                    icon_url: interaction.guild.iconURL()
                },
                timestamp: new Date()
            }],
            components: []
        })
    ];

    const randomIndex = Math.floor(Math.random() * styles.length);
    return styles[randomIndex]();
}

// ============================================================
// 🛒 Shop Browse Function
// ============================================================

export const shopBrowse = {
    async execute(interaction, config, client) {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const userId = interaction.user.id;
        const guildId = interaction.guildId;

        logger.info(`[SHOP] Shop opened by ${userId}`, { userId, guildId });

        // Get user data
        const userData = await getEconomyData(client, guildId, userId);
        if (!userData) {
            throw createError(
                "Failed to load economy data",
                ErrorTypes.DATABASE,
                "❌ Failed to load your economy data. Please try again later.",
                { userId, guildId }
            );
        }

        // ============================================================
        // 🎨 Create Shop Embed
        // ============================================================
        const embed = {
            title: '🛒 Economy Shop',
            description: `💰 Welcome to the shop, <@${userId}>!\n💼 Your balance: **$${(userData.wallet || 0).toLocaleString()}**`,
            color: 0x00FF00,
            fields: [
                {
                    name: '🔧 Tools',
                    value: SHOP_ITEMS['🔧 Tools'].map(i => `${i.name}: $${i.price.toLocaleString()}`).join('\n'),
                    inline: true
                },
                {
                    name: '🛡️ Protection',
                    value: SHOP_ITEMS['🛡️ Protection'].map(i => `${i.name}: $${i.price.toLocaleString()}`).join('\n'),
                    inline: true
                },
                {
                    name: '🎮 Boosts',
                    value: SHOP_ITEMS['🎮 Boosts'].map(i => `${i.name}: $${i.price.toLocaleString()}`).join('\n'),
                    inline: true
                },
                {
                    name: '💎 Special',
                    value: SHOP_ITEMS['💎 Special'].map(i => `${i.name}: $${i.price.toLocaleString()}`).join('\n'),
                    inline: true
                },
                {
                    name: '🎨 Cosmetics',
                    value: SHOP_ITEMS['🎨 Cosmetics'].map(i => `${i.name}: $${i.price.toLocaleString()}`).join('\n'),
                    inline: true
                },
                {
                    name: '💡 How to Buy',
                    value: 'Use `/buy <item>` to purchase an item!',
                    inline: false
                }
            ],
            footer: {
                text: `🛒 Shop • ${interaction.guild.name}`,
                icon_url: interaction.guild.iconURL()
            },
            timestamp: new Date()
        };

        // ============================================================
        // 🎛️ Create Dropdown Menu
        // ============================================================
        const categories = Object.keys(SHOP_ITEMS);
        
        const selectMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('shop_browse_category')
                    .setPlaceholder('📂 Select a category to browse')
                    .addOptions(
                        categories.map(cat => ({
                            label: cat,
                            description: `${SHOP_ITEMS[cat].length} items available`,
                            value: cat,
                            emoji: cat.split(' ')[0] || '🛒'
                        }))
                    )
            );

        // ============================================================
        // 🔘 Create Buttons
        // ============================================================
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('shop_refresh')
                    .setLabel('🔄 Refresh')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('balance_check')
                    .setLabel('💰 Balance')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('shop_buy')
                    .setLabel('🛒 Buy Item')
                    .setStyle(ButtonStyle.Secondary)
            );

        // ============================================================
        // 📤 Send Response
        // ============================================================
        await InteractionHelper.safeEditReply(interaction, { 
            embeds: [embed],
            components: [selectMenu, buttons]
        });

        // ============================================================
        // 🎲 Random Style (for variety)
        // ============================================================
        const randomStyle = getShopStyle(interaction, SHOP_ITEMS);
        // Note: We already sent the main embed, this is for future use
        // Could be used for a "/shop browse" subcommand
    }
};

// ============================================================
// 🛒 Shop Buy Function (Placeholder)
// ============================================================

export const shopBuy = {
    async execute(interaction, config, client) {
        // This would handle buying items
        // For now, just a placeholder
        await InteractionHelper.safeDefer(interaction);
        
        const embed = {
            title: '🛒 Buy Item',
            description: 'Use `/buy <item>` to purchase an item!',
            color: 0x00FF00,
            fields: [
                {
                    name: 'Available Items',
                    value: Object.values(SHOP_ITEMS).flat().map(i => 
                        `${i.name}: $${i.price.toLocaleString()} - ${i.description}`
                    ).join('\n'),
                    inline: false
                }
            ],
            footer: {
                text: '🛒 Shop System',
                icon_url: interaction.guild.iconURL()
            },
            timestamp: new Date()
        };
        
        await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }
};

// ============================================================
// 🛒 Main Shop Command
// ============================================================

export default {
    slashOnly: true,
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('🛒 Browse the economy shop.'),

    async execute(interaction, config, client) {
        return shopBrowse.execute(interaction, config, client);
    },
};
