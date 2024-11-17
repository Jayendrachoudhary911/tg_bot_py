const { Telegraf, Markup } = require("telegraf");
const crypto = require("crypto");

// Replace 'YOUR_TOKEN' with your bot's token
const bot = new Telegraf("6827002659:AAF4WWX28rSu8cieORW1Avr1SDUW4ngnMU4");

// Data storage
const chatRooms = {}; // key: room name, value: { members: Set, joinCode: string }
const userChattingStatus = {}; // key: user ID, value: room name

// Generate unique codes
const generateCode = () => crypto.randomBytes(4).toString("hex");

// Start command
bot.start((ctx) =>
    ctx.reply(
        "Welcome to the Chat Room Bot!\n\n" +
        "Commands:\n" +
        "/create <room_name> - Create a chat room\n" +
        "/join <join_code> - Join a room using its unique code\n" +
        "/list - List all rooms\n" +
        "/members <room_name> - List members of a room\n" +
        "/exit <room_name> - Leave a room"
    )
);

// Create a chat room
bot.command("create", (ctx) => {
    const args = ctx.message.text.split(" ").slice(1);
    const roomName = args.join(" ");

    if (!roomName) {
        return ctx.reply("Please provide a room name. Usage: /create <room_name>");
    }

    if (chatRooms[roomName]) {
        return ctx.reply(`Room '${roomName}' already exists.`);
    }

    const joinCode = generateCode();
    chatRooms[roomName] = { members: new Set([ctx.from.id]), joinCode };
    return ctx.reply(
        `Room '${roomName}' created successfully! Join using the code: ${joinCode}\n\nUse /join ${joinCode} to join it.`
    );
});

// Join a chat room
bot.command("join", (ctx) => {
    const args = ctx.message.text.split(" ").slice(1);
    const joinCode = args[0];

    if (!joinCode) {
        return ctx.reply("Please provide a join code. Usage: /join <join_code>");
    }

    const roomName = Object.keys(chatRooms).find(
        (name) => chatRooms[name].joinCode === joinCode
    );

    if (!roomName) {
        return ctx.reply("Invalid join code.");
    }

    chatRooms[roomName].members.add(ctx.from.id);
    return ctx.reply(
        `You joined the room '${roomName}'.`,
        Markup.inlineKeyboard([
            [Markup.button.callback("Chat", `chat_${roomName}`)],
            [Markup.button.callback("Leave", `leave_${roomName}`)],
        ])
    );
});

// List all chat rooms
bot.command("list", (ctx) => {
    const roomList = Object.keys(chatRooms)
        .map((name) => `${name} (Code: ${chatRooms[name].joinCode})`)
        .join("\n");
    ctx.reply(roomList || "No rooms available.");
});

// List members of a room
bot.command("members", (ctx) => {
    const args = ctx.message.text.split(" ").slice(1);
    const roomName = args.join(" ");

    if (!roomName || !chatRooms[roomName]) {
        return ctx.reply("Invalid room name or room does not exist.");
    }

    const members = Array.from(chatRooms[roomName].members).map(
        (id) => `User ID: ${id}`
    );
    ctx.reply(members.join("\n") || "No members in this room.");
});

// Exit a chat room
bot.command("exit", (ctx) => {
    const args = ctx.message.text.split(" ").slice(1);
    const roomName = args.join(" ");

    if (!roomName || !chatRooms[roomName]?.members.has(ctx.from.id)) {
        return ctx.reply(
            "You are not a member of this room or the room does not exist."
        );
    }

    chatRooms[roomName].members.delete(ctx.from.id);
    if (userChattingStatus[ctx.from.id] === roomName) {
        delete userChattingStatus[ctx.from.id];
    }
    return ctx.reply(`You have left the room '${roomName}'.`);
});

// Handle button clicks
bot.on("callback_query", (ctx) => {
    const [action, roomName] = ctx.callbackQuery.data.split("_");

    if (action === "chat") {
        userChattingStatus[ctx.from.id] = roomName;
        ctx.editMessageText(`You are now chatting in '${roomName}'.`);
    } else if (action === "leave") {
        chatRooms[roomName]?.members.delete(ctx.from.id);
        delete userChattingStatus[ctx.from.id];
        ctx.editMessageText(`You left the room '${roomName}'.`);
    }
});

// Handle normal messages
bot.on("text", (ctx) => {
    const roomName = userChattingStatus[ctx.from.id];

    if (roomName) {
        const room = chatRooms[roomName];
        if (room) {
            room.members.forEach((memberId) => {
                if (memberId !== ctx.from.id) {
                    ctx.telegram.sendMessage(
                        memberId,
                        `[${roomName}] ${ctx.from.first_name}: ${ctx.message.text}`
                    );
                }
            });
        }
    }
});

// Start the bot
bot.launch().then(() => console.log("Bot is running!"));
