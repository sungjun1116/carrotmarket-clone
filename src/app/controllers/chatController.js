const { pool } = require("../../../config/database");
const { logger } = require("../../../config/winston");

const chatDao = require("../dao/chatDao");

// 채팅 조회
exports.selectChat = async function (req, res) {
  const { id } = req.verifiedToken;

  try {
  } catch (err) {
    logger.error(`App - selectChat Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};
