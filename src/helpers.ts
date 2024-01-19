import mysql from 'mysql2/promise';
import { Messages } from './interfaces';

export async function connect(): Promise<mysql.Connection>{
    const conn = await mysql.createConnection({
        host     : process.env.DB_HOST,
        user     : process.env.DB_USER,
        password : process.env.DB_PASS,
        database : process.env.DB_NAME
    });
    return conn;
}

export function getRoomId (userId: number, activeUsers:{roomId: string, userId: number}[]): string {
    if (userId <= 0) return '';
    let usr = activeUsers.filter(usr => usr.userId === userId)[0];
    if (!usr) return ''
    return usr.roomId;
}

export function getUserId (roomId: string, activeUsers:{roomId: string, userId: number}[]): number {
    let usr = activeUsers.filter(usr => usr.roomId === roomId)[0];
    if (!usr) return -1
    return usr.userId;
}

export async function saveChat (message: Omit<Messages, "id">): Promise<boolean> {
    try {
        const conn = await connect();
        conn.query<Messages[]>(`INSERT INTO messages (from_user, to_user, sent_date, seen ,text, db_room) VALUES (?, ?, ?, ?, ?, ?)`,
        [message.from_user, message.to_user, message.sent_date, message.seen, message.text, message.from_user+'-'+message.to_user]);
        return true
    } catch (error) {
        return false
    }
}