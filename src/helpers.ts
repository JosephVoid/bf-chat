export function getRoomId (userId: number, activeUsers:{roomId: string, userId: number}[]): string {
    if (userId <= 0) return '';
    let usr = activeUsers.filter(usr => usr.userId === userId)[0];
    if (!usr) return ''
    return usr.roomId;
}