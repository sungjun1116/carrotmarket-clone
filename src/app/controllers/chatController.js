const { pool } = require("../../../config/database");
const { logger } = require("../../../config/winston");

const chatDao = require("../dao/chatDao");

// 채팅목록 조회
exports.selectChat = async function (req, res) {
  const { id, location } = req.verifiedToken;
  const { userId } = req.params;

  if (id != userId) {
    return res.json({
      isSucess: false,
      code: 411,
      message: "권한이 없습니다.",
    });
  }

  try {
    const chatRows = await chatDao.selectChat(id, location);
    return res.json({
      isSuccess: true,
      code: 200,
      message: "채팅목록조회 성공",
      result: chatRows,
    });
  } catch (err) {
    logger.error(`App - selectChat Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

// 채팅 상세조회
exports.selectRoom = async function (req, res) {
  const { id } = req.verifiedToken;
  const { userId, roomId } = req.params;

  if (id != userId) {
    return res.json({
      isSucess: false,
      code: 411,
      message: "권한이 없습니다.",
    });
  }

  try {
    const messageRows = await chatDao.selectMessageInfo(id, roomId);
    return res.json({
      isSuccess: true,
      code: 200,
      message: "채팅상세조회 성공",
      result: messageRows,
    });
  } catch (err) {
    logger.error(`App - selectMessageInfo Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

// 채팅메세지 보내기
exports.sendMessage = async function (req, res) {
  const { id } = req.verifiedToken;
  const { contents } = req.body;
  const { roomId } = req.params;

  if (!contents)
    return res.json({
      isSuccess: false,
      code: 411,
      message: "contents를 입력하세요.",
    });
  if (typeof contents !== "string")
    return res.json({
      isSuccess: false,
      code: 412,
      message: "contents는 문자열을 입력하세요",
    });

  try {
    const checkRoomRows = await chatDao.checkRoom(roomId);
    if (checkRoomRows.length == 0)
      return res.json({
        isSuccess: false,
        code: 421,
        message: "roomId에 존재하는 정보가 없습니다.",
      });
    if (checkRoomRows[0].postId !== id && checkRoomRows[0].buyerId !== id) {
      return res.json({
        isSuccess: true,
        code: 422,
        message: "권한이 없습니다.",
      });
    }
    const messageRows = await chatDao.insertMessage(roomId, id, contents);
    if (messageRows.length > 0)
      return res.json({
        isSuccess: true,
        code: 200,
        message: "채팅메세지 보내기 성공",
      });
    return res.json({
      isSuccess: false,
      code: 400,
      message: "채팅메세지 보내기 실패",
    });
  } catch (err) {
    logger.error(`App - sendMessage Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};
