from collections import defaultdict
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, filters, CallbackQueryHandler

# A dictionary to store chat rooms
chat_rooms = defaultdict(set)  # key: room name, value: set of user ids in the room
user_chatting_status = {}  # key: user id, value: current room they are chatting in


# Command to start the bot and show a welcome message
async def start(update: Update, context):
    await update.message.reply_text("Welcome to the Chat Room Bot! Use /create <room_name> to create a room.")


# Command to create a new chat room
async def create_room(update: Update, context):
    room_name = ' '.join(context.args)
    if not room_name:
        await update.message.reply_text("Please provide a room name. Usage: /create <room_name>")
        return

    # Check if the room already exists
    if room_name in chat_rooms:
        await update.message.reply_text(f"Room '{room_name}' already exists.")
    else:
        chat_rooms[room_name].add(update.message.from_user.id)
        await update.message.reply_text(f"Room '{room_name}' created successfully! Use /join {room_name} to join it.")


# Command to join an existing chat room
async def join_room(update: Update, context):
    room_name = ' '.join(context.args)
    if not room_name:
        await update.message.reply_text("Please provide a room name. Usage: /join <room_name>")
        return

    if room_name in chat_rooms:
        chat_rooms[room_name].add(update.message.from_user.id)
        await update.message.reply_text(f"You joined the room '{room_name}'.",
                                        reply_markup=InlineKeyboardMarkup([
                                            [InlineKeyboardButton("Chat", callback_data=f"chat_{room_name}"),
                                             InlineKeyboardButton("Leave", callback_data=f"leave_{room_name}")]
                                        ]))
    else:
        await update.message.reply_text(f"Room '{room_name}' does not exist.")


# Callback handler for button clicks (Chat and Leave)
async def button_click(update: Update, context):
    query = update.callback_query
    room_name = query.data.split("_")[1]
    user_id = query.from_user.id

    if query.data.startswith("chat"):
        # Mark the user as chatting in the room
        user_chatting_status[user_id] = room_name
        await query.edit_message_text(
            f"You're now chatting in room '{room_name}'. Type your message and I'll broadcast it to the room.")
    elif query.data.startswith("leave"):
        # Remove the user from the room
        chat_rooms[room_name].remove(user_id)
        if user_id in user_chatting_status and user_chatting_status[user_id] == room_name:
            del user_chatting_status[user_id]
        await query.edit_message_text(f"You left the room '{room_name}'.")


# Handle normal messages (sent by users who are in chat mode)
async def handle_message(update: Update, context):
    user_id = update.message.from_user.id
    if user_id in user_chatting_status:
        room_name = user_chatting_status[user_id]
        if room_name in chat_rooms:
            # Send the message to all users in the room
            for user in chat_rooms[room_name]:
                if user != user_id:  # Don't send the message back to the sender
                    try:
                        await context.bot.send_message(chat_id=user,
                                                       text=f"[{room_name}] {update.message.from_user.first_name}: {update.message.text}")
                    except Exception as e:
                        print(f"Failed to send message to {user}: {e}")


# Command to list all available rooms
async def list_rooms(update: Update, context):
    if chat_rooms:
        rooms = "\n".join(chat_rooms.keys())
        await update.message.reply_text(f"Available rooms:\n{rooms}")
    else:
        await update.message.reply_text("No rooms available yet. Create a room using /create <room_name>")


# Command to exit a room
async def exit_room(update: Update, context):
    room_name = ' '.join(context.args)
    if not room_name:
        await update.message.reply_text("Usage: /exit <room_name>")
        return

    if room_name in chat_rooms and update.message.from_user.id in chat_rooms[room_name]:
        chat_rooms[room_name].remove(update.message.from_user.id)
        if update.message.from_user.id in user_chatting_status and user_chatting_status[
            update.message.from_user.id] == room_name:
            del user_chatting_status[update.message.from_user.id]
        await update.message.reply_text(f"You have left the room '{room_name}'.")
    else:
        await update.message.reply_text(f"You are not a member of room '{room_name}'.")


# Main function to set up the bot
def main():
    # Replace 'YOUR_TOKEN' with your bot's API token
    application = Application.builder().token("6827002659:AAF4WWX28rSu8cieORW1Avr1SDUW4ngnMU4").build()

    # Register command handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("create", create_room))
    application.add_handler(CommandHandler("join", join_room))
    application.add_handler(CommandHandler("list", list_rooms))
    application.add_handler(CommandHandler("exit", exit_room))
    application.add_handler(CallbackQueryHandler(button_click))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    # Start the bot
    application.run_polling()


if __name__ == '__main__':
    main()
