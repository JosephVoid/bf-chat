import { RowDataPacket } from "mysql2";

export interface Messages extends RowDataPacket {
    id: number,
    from_user: number,
    text: string,
    to_user: number,
    sent_date: Date,
    seen: number,
    db_room: string,
    first_name?: string,
    last_name?: string
}

export interface Users extends RowDataPacket{
    USER_ID: number,
    first_name: string,
    last_name: string
}