// data/rooms.js
let rooms = {}; // In-memory storage for rooms

/**
 * Creates a new room with a unique code.
 * @param {string} roomName - The name of the room.
 * @returns {string} - The generated room code.
 */
function createRoom(roomName) {
    const roomCode = Math.random().toString(36).substring(2, 8); // Generate 6-character unique code
    rooms[roomCode] = {
        name: roomName,
        participants: [],
    };
    return roomCode;
}

/**
 * Adds a user to an existing room.
 * @param {string} roomCode - The code of the room.
 * @param {number} userId - The Telegram user ID.
 * @returns {string} - A message indicating the result.
 */
function joinRoom(roomCode, userId) {
    if (!rooms[roomCode]) {
        return "Room not found! Please provide a valid room code.";
    }
    if (rooms[roomCode].participants.includes(userId)) {
        return "You have already joined this room.";
    }
    rooms[roomCode].participants.push(userId);
    return `Successfully joined the room: ${rooms[roomCode].name}`;
}

module.exports = { createRoom, joinRoom };
