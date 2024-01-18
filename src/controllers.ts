import { RowDataPacket } from "mysql2";
import { conn } from "./helpers";

interface Messages extends RowDataPacket {
    id: number,
    from_user: number,
    text: string,
    to_user: number,
    sent_date: Date,
    seen: number
}

export function newMessageCountController (req:any, res:any) {
    const userId = req.params.userId;
    conn.query<Messages[]>('SELECT * from messages WHERE seen = ? AND to_user = ? ORDER BY sent_date DESC',
    ['0', userId], function (err, results) {
        if(err) return res.status(500).send(err);
        return res.status(200).send(results);
    });
}

export function allMessageController (req:any, res:any) {
    const userId = req.params.userId;
    conn.query<Messages[]>('SELECT * from messages WHERE to_user = ? ORDER BY sent_date DESC',
    [userId], function (err, results) {
        if(err) return res.status(500).send(err);
        return res.status(200).send(results);
    });
}

export function allChatMessageController (req:any, res:any) {
    const userId = req.params.userId;
    const otherUserId = req.params.otherUserId;
    conn.query<Messages[]>('SELECT * from messages WHERE (to_user = ? AND from_user = ?) OR (to_user = ? AND from_user = ?) ORDER BY sent_date DESC',
    [userId, otherUserId, otherUserId, userId], function (err, results) {
        if(err) return res.status(500).send(err);
        return res.status(200).send(results);
    });
}

export function seenChatController (req:any, res:any) {
    const chats:number[] = req.body.chats;
    const chat_id: string = chats.join(",");
    conn.query<Messages[]>('UPDATE messages SET seen = 0 WHERE id IN ('+chat_id+')',
    [], function (err, results) {
        if(err) return res.status(500).send(err);
        return res.status(200).send(results);
    });

}