const { pool } = require("../../../config/database");

// selectChat
async function selectChat(userId, location) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectChatQuery = `
    select PostRoom.roomNo   as roomId, 
    userName        as targetName,
    profileImageUrl as targetProfileImageUrl,
    if(SUBSTRING_INDEX(location, ' ', 1) = SUBSTRING_INDEX('용인시', ' ', 1),
       SUBSTRING_INDEX(location, ' ', -1), location)
                    as targetLocation,
    IF(TIMESTAMPDIFF(HOUR, lastChatMessageTime, current_timestamp()) > 24,
       if(YEAR(current_timestamp()) - YEAR(lastChatMessageTime) > 0,
          DATE_FORMAT(lastChatMessageTime, '%Y년 %m월 %d일'),
          DATE_FORMAT(lastChatMessageTime, '%m월 %d일')), DATE_FORMAT(lastChatMessageTime, '%p %l시 %i분'))
                    as lastChatMessageTime,
    lastChatMessage
from (select roomNo, sellerId, buyerId
   from Room
            inner join Post on Post.postId = Room.postId) PostRoom
      inner join (select User.userId, username, profileImageUrl, location, locationOrder
                  from User
                           inner join (select userId, location, locationOrder from Location) UserLocation
                                      on User.userId = UserLocation.userId) UserLocationTable
                 on PostRoom.sellerId = UserLocationTable.userId
      inner join (select Chat.roomNo, createdAt as lastChatMessageTime, contents as lastChatMessage
                  from Chat
                           inner join (select roomNo, max(messageNo) as lastchatNo from Chat group by roomNo) LastChat
                                      on Chat.messageNo = LastChat.lastchatNo
                  where Chat.chatStatus = 'Y') LastChatMessageTable
                 on PostRoom.roomNo = LastChatMessageTable.roomNo
    where PostRoom.sellerId = ? or PostRoom.buyerId = ?;
        `;
  const selectChatParams = [location, userId, userId];
  const [chatRows] = await connection.query(selectChatQuery, selectChatParams);
  connection.release();
  return chatRows;
}

// 채팅 상세조회
async function selectMessageInfo(userId, roomId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectMessageQuery = `
  select messageNo                                                    as messageId,
    if(Chat.senderId = ?, -1, profileImageUrl)                        as targetProfileImageUrl,
    contents,
    if(DATE_FORMAT(Chat.updatedAt, '%H') < 12, concat(DATE_FORMAT(Chat.updatedAt, '%Y년 %m월 %d일 %l시 %i분'), ' 오전'),
      concat(DATE_FORMAT(Chat.updatedAt, '%Y년 %m월 %d일 %l시 %i분'), ' 오후')) as messageUpdatedTime,
    if(ViewRoom.updatedAt - Chat.updatedAt > 0, "true", "false") as readStatus
  from Chat
      inner join User on User.userId = Chat.senderId
      inner join ViewRoom on ViewRoom.roomId = Chat.roomNo
  where roomNo = ? and ViewRoom.userId != ?
        `;
  const selectMessageParams = [userId, roomId, userId];
  const [messageRows] = await connection.query(selectMessageQuery, selectMessageParams);
  connection.release();
  return messageRows;
}

// 채팅 메세지 보내기
async function insertMessage(roomId, userId, contents) {
  const connection = await pool.getConnection(async (conn) => conn);
  const insertMessageQuery = `
            INSERT INTO Chat (roomNo, senderId, contents) VALUES (?, ?, ?)
        `;
  const insertMessageParams = [roomId, userId, contents];
  const [insertMessageRows] = await connection.query(insertMessageQuery, insertMessageParams);
  connection.release();
  return [insertMessageRows];
}

// 채팅방 권한 확인
async function checkRoom(roomId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const checkRoomQuery = `
              select postId, buyerId from Room where roomNo = ?;
        `;
  const checkRoomParams = [roomId];
  const [checkRoomRows] = await connection.query(checkRoomQuery, checkRoomParams);
  connection.release();
  return checkRoomRows;
}

module.exports = {
  selectChat,
  selectMessageInfo,
  insertMessage,
  checkRoom,
};
