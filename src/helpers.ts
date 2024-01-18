import mysql from 'mysql2';

export const conn = mysql.createConnection({
    host     : process.env.DB_HOST,
    user     : process.env.DB_USER,
    password : process.env.DB_PASS,
    database : process.env.DB_NAME
});

export function getRoomId (userId: number, activeUsers:{roomId: string, userId: number}[]): string {
    if (userId <= 0) return '';
    let usr = activeUsers.filter(usr => usr.userId === userId)[0];
    if (!usr) return ''
    return usr.roomId;
}