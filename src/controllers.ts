import { connect } from "./helpers";
import { Messages, Users } from "./interfaces";

export async function newMessageCountController (req:any, res:any) {
    const conn = await connect();
    const userId = req.params.userId;
    try {
        const [results] = await conn.query<Messages[]>
        ('SELECT * from messages WHERE seen = ? AND to_user = ? ORDER BY sent_date DESC',['0', userId]);
        return res.status(200).send(results);
    } catch (error) {
        return res.status(500).send(error);
    }
}

export async function lastMessageController (req:any, res:any) {
    const conn = await connect();
    const userId:number = Number(req.params.userId);
    try {
        /* Get the latest chat of each user with the current user */
        const [msg_results] = await conn.query<Messages[]>(`
            WITH RankedMessages AS (
            SELECT
                id,
                from_user,
                to_user,
                sent_date,
                text,
                seen,
                db_room,
                ROW_NUMBER() OVER (PARTITION BY from_user ORDER BY sent_date DESC) AS RowNum
            FROM
                messages
                WHERE to_user = ? OR from_user = ?
                ORDER BY sent_date DESC
            )
            SELECT
            id,
            from_user,
            to_user,
            sent_date,
            TEXT,
            seen,
            db_room
            FROM
            RankedMessages
            WHERE
            RowNum = 1`,
        [userId, userId]);
        /* Remove double user entries from db.
           Eg If two user (1 and 2) chatted, the will return two rows while we only need one
         */
        function filterResults () {
            let db_room_id: string[] = [];
            let filteredResults: Messages[] = [];
            for (let i = 0; i < msg_results.length; i++) {
                if (!db_room_id.includes(msg_results[i].db_room)) {
                    db_room_id.push(msg_results[i].db_room);
                    db_room_id.push(msg_results[i].db_room.split('').reverse().join(''));
                    filteredResults.push(msg_results[i]);
                }
            }
            return filteredResults;
        }
        /* Get the users the currrent user has chatted witth */
        const [usr_result] = await conn.query<Users[]>(`
            SELECT DISTINCT users.id AS USER_ID,users.first_name, users.last_name
            FROM messages
            LEFT JOIN users ON messages.to_user = users.id
            WHERE (messages.from_user = ? OR messages.to_user = ?) AND users.id != ?
            
            UNION
            
            SELECT DISTINCT users.id AS USER_ID,users.first_name, users.last_name
            FROM messages
            LEFT JOIN users ON messages.from_user = users.id
            WHERE (messages.from_user = ? OR messages.to_user = ?) AND users.id != ?`,
        [userId, userId, userId, userId, userId, userId]);

        const MsgRes = filterResults();
        /* Add first and last names to the message */
        MsgRes.map(msg => {
            let user;
            if (userId !== msg.from_user)
                user = usr_result.filter(usr => usr.USER_ID === msg.from_user)[0];
            else
                user = usr_result.filter(usr => usr.USER_ID === msg.to_user)[0];
            msg.first_name = user.first_name;
            msg.last_name = user.last_name;
        })

        return res.status(200).send(filterResults());
    } catch (error) {
        console.log(error);
        return res.status(500).send(error);
    }
}

export async function allChatMessageController (req:any, res:any) {
    const conn = await connect();
    const userId = req.params.userId;
    const otherUserId = req.params.otherUserId;
    try {
        const [results] = await conn.query<Messages[]>('SELECT * from messages WHERE (to_user = ? AND from_user = ?) OR (to_user = ? AND from_user = ?) ORDER BY sent_date DESC',
        [userId, otherUserId, otherUserId, userId]);
        return res.status(200).send(results);
    } catch (error) {
        return res.status(500).send(error);
    }
}

export async function seenChatController (req:any, res:any) {
    const conn = await connect();
    const chats:number[] = req.body.chats;
    const chat_id: string = chats.join(",");
    try {
        const [result] = await conn.query<Messages[]>('UPDATE messages SET seen = 0 WHERE id IN ('+chat_id+')',[]);
        return res.status(200).send(result);
    } catch (error) {
        return res.status(500).send(error);
    }
}