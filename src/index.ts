import express from 'express';
import { createServer } from 'node:http';
import dotenv from "dotenv"; dotenv.config();
import { Server } from 'socket.io';
import { allChatMessageController, allMessageController, newMessageCountController } from './controllers';
import { getRoomId } from './helpers';

const app = express();
const server = createServer(app);
const sockio = new Server(server, {
    cors: {
        origin: "*",
        credentials: true
    }
});

let activeUsers: {roomId: string, userId: number}[] = [];

sockio.on('connection', (socket) => {
    /* Get all the active users in the connection, and store in array */
    for (const [id, socket] of sockio.of("/").sockets) {
        if (activeUsers.filter((usr) => usr.roomId == id).length == 0) {
            activeUsers.push({
                roomId: id,
                userId: socket.handshake.auth.id
            });
        }
    }
    console.log("User Id: ", socket.handshake.auth.id, " connected | ", 
    activeUsers.length, ": Connected users");
    /* Send the active users list to client */
    socket.emit('active-users', activeUsers);
    /* Listen to private chats and send to appopriate room*/
    socket.on('private-chat', ({text, to}) => {
        console.log("User Id: ",socket.handshake.auth.id, " sent: "+text, " to user "+to);
        // TODO: store to DB
        socket.to(getRoomId(to, activeUsers)).emit('private-chat-response', {
            text, 
            from: socket.id
        })
    })
    /* Send the the list of active users, when a new user connects */
    socket.broadcast.emit("user-connected", activeUsers);
    /* Send the active users list to client, when a user disconnects */
    socket.on('disconnect', () => {
        activeUsers = activeUsers.filter((usr) => usr.roomId !== socket.id)
        console.log('User disconnected |', activeUsers.length, ": Connected users");
        socket.broadcast.emit("user-disconnected", activeUsers);
    });
})

app.get('/new-msg-count/:userId', newMessageCountController);

app.get('/all-msg/:userId', allMessageController);

app.get('/all-chat-msg/:userId/:otherUserId', allChatMessageController);

const port = process.env.PORT;
server.listen(port, () => {
    console.log(`server running at ${port}`)
});