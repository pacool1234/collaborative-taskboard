export interface CardMovedPayload {
  boardId: string;
  cardId: string;
  listId: string;
  position: number;
}

export interface ClientToServerEvents {
  join_board: (boardId: string) => void;
  card_moved: (payload: CardMovedPayload) => void;
}

export interface ServerToClientEvents {
  card_moved: (payload: Omit<CardMovedPayload, "boardId">) => void;
}
