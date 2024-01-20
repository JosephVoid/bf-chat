import express from 'express';
import { createServer } from 'node:http';
import dotenv from "dotenv"; dotenv.config();
import { Server } from 'socket.io';
import { allChatMessageController, lastMessageController, newMessageCountController, seenChatController } from './controllers';
import { getRoomId, getUserId, saveChat, verifyToken } from './helpers';
import bodyParser from 'body-parser';
import cors from 'cors';

const app = express();
const server = createServer(app);
const sockio = new Server(server, {
    cors: {
        origin: "*",
        credentials: true
    }
});

app.use(bodyParser.json());
app.use(cors());

/* Securing API */
app.use((req, res, next) => {
    let header = <string> req.headers.authorization;
    if(!verifyToken(header)) {
        return res.status(401).send("Unauthorized");
    }
    next();
})

let activeUsers: {roomId: string, userId: number}[] = [];

/* Securing socket */
sockio.use((socket, next) => {
    if (!verifyToken(socket.handshake.auth.jwt))
        next(new Error("Unauthorized"));
})

sockio.on('connection', (socket) => {
    /* Get all the active users in the connection, and store in array */
    for (const [id, socket] of sockio.of("/").sockets) {
        if (activeUsers.filter((usr) => usr.roomId == id).length == 0) {
            activeUsers.push({
                roomId: id,
                userId: <number> verifyToken(socket.handshake.auth.jwt)
            });
        }
    }
    console.log("User Id: ", verifyToken(socket.handshake.auth.jwt), " connected | ", 
    activeUsers.length, ": Connected users");
    /* Send the active users list to client */
    socket.emit('active-users', activeUsers);
    /* Listen to private chats and send to appopriate room*/
    socket.on('private-chat', ({text, to}) => {
        console.log("User Id: ",verifyToken(socket.handshake.auth.jwt), " sent: "+text, " to user "+to);
        if (getRoomId(to, activeUsers) === '') {
            /* If user is inactive, store to DB as not seen */
            saveChat({
                text: text,
                from_user: getUserId(socket.id, activeUsers),
                to_user: to,
                sent_date: new Date(),
                seen: 0,
                db_room: getUserId(socket.id, activeUsers)+"-"+to
            })
        } else {
            /* If user is active */
            socket.to(getRoomId(to, activeUsers)).emit('private-chat-response', {
                text, 
                from_user: getUserId(socket.id, activeUsers),
                sent_date: new Date(),
                seen: 1
            })
            saveChat({
                text: text,
                from_user: getUserId(socket.id, activeUsers),
                to_user: to,
                sent_date: new Date(),
                seen: 1,
                db_room: getUserId(socket.id, activeUsers)+"-"+to
            })
        }

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

app.get('/last-msgs/:userId', lastMessageController);

app.get('/all-chat-msg/:userId/:otherUserId', allChatMessageController);

app.post('/seen-chat', seenChatController);

const port = process.env.PORT;
server.listen(port, () => {
    console.log(`server running at ${port}`)
});