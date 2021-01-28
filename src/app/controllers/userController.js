const { pool } = require("../../../config/database");
const { logger } = require("../../../config/winston");

const jwt = require("jsonwebtoken");
const regexEmail = require("regex-email");
const crypto = require("crypto");
const secret_config = require("../../../config/secret");

const userDao = require("../dao/userDao");
const postDao = require("../dao/postDao");
const { constants } = require("buffer");

/**
 01.signUp API = 회원가입
 */
exports.signUp = async function (req, res) {
  const { userName, profileImageUrl, phoneNumber } = req.body;
  if (!userName)
    return res.json({
      isSuccess: false,
      code: 411,
      message: "닉네임을 입력 해주세요.",
    });
  if (typeof userName !== "string")
    return res.json({
      isSuccess: false,
      code: 412,
      message: "닉네임은 문자열을 입력하세요.",
    });
  if (!/^([a-zA-Z0-9ㄱ-ㅎ|ㅏ-ㅣ|가-힣]).{1,10}$/.test(userName))
    return res.json({
      isSuccess: false,
      code: 413,
      message: "닉네임은 한글, 영문, 숫자만 가능하며 2-10자리 가능합니다. ",
    });

  if (!/(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/.test(profileImageUrl))
    return res.json({
      isSuccess: false,
      code: 433,
      message: "url형식에 맞게 입력해주세요.",
    });

  if (!phoneNumber)
    return res.json({
      isSuccess: false,
      code: 421,
      message: "전화번호를 입력 해주세요.",
    });
  if (typeof phoneNumber !== "string") {
    return res.json({
      isSuccess: false,
      code: 422,
      message: "전화번호는 문자열을 입력하세요.",
    });
  }
  if (!/^[0-9]{3}-[0-9]{3,4}-[0-9]{4}/.test(phoneNumber))
    return res.json({
      isSuccess: false,
      code: 423,
      message: "숫자, -을 포함해 휴대전화 형식에 맞게 입력해주세요.",
    });
  try {
    // 닉네임 중복 확인
    const userNameRows = await userDao.userNameCheck(userName);
    if (userNameRows.length > 0) {
      return res.json({
        isSuccess: false,
        code: 431,
        message: "중복된 닉네임입니다.",
      });
    }
    // 휴대폰 번호 중복 확인
    const phoneNumberRows = await userDao.phoneNumberCheck(phoneNumber);
    if (phoneNumberRows.length > 0) {
      return res.json({
        isSuccess: false,
        code: 432,
        message: "중복된 전화번호입니다.",
      });
    }

    // TRANSACTION : advanced
    // await connection.beginTransaction(); // START TRANSACTION
    // const hashedPassword = await crypto
    //   .createHash("sha512")
    //   .update(password)
    //   .digest("hex");
    // const insertUserInfoParams = [email, hashedPassword, nickname];
    const insertUserInfoParams = [userName, profileImageUrl, phoneNumber];
    const insertUserRows = await userDao.insertUserInfo(insertUserInfoParams);
    console.log(insertUserRows[0].insertId);
    if (insertUserRows.length > 0) {
      return res.json({
        userId: insertUserRows[0].insertId,
        isSuccess: true,
        code: 200,
        message: "회원가입 성공",
      });
    }
    return res.json({
      isSuccess: false,
      code: 400,
      message: "회원가입 실패",
    });
    //  await connection.commit(); // COMMIT
    // connection.release();
  } catch (err) {
    // await connection.rollback(); // ROLLBACK
    // connection.release();
    logger.error(`App - SignUp Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

/**
 update : 2020.10.4
 02.signIn API = 로그인
 **/
exports.signIn = async function (req, res) {
  const { phoneNumber } = req.body;

  if (!/^[0-9]{3}-[0-9]{3,4}-[0-9]{4}/.test(phoneNumber))
    return res.json({
      isSuccess: false,
      code: 422,
      message: "숫자, -을 포함해 휴대전화 형식에 맞게 입력해주세요.",
    });

  try {
    const [userInfoRows] = await userDao.selectUserInfo(phoneNumber);

    if (userInfoRows.length < 1) {
      connection.release();
      return res.json({
        isSuccess: false,
        code: 400,
        message: "로그인 실패. 휴대폰 번호를 확인해주세요.",
      });
    }

    if (userInfoRows.userStatus === "N") {
      connection.release();
      return res.json({
        isSuccess: false,
        code: 413,
        message: "탈퇴 된 계정입니다. 고객센터에 문의해주세요.",
      });
    }

    //토큰 생성
    let token = await jwt.sign(
      {
        id: userInfoRows.userId,
        locationId: userInfoRows.locationId,
        location: userInfoRows.location,
        latitude: userInfoRows.latitude,
        longitude: userInfoRows.longitude,
        nearbyPost: userInfoRows.nearbyPost,
      }, // 토큰의 내용(payload)
      secret_config.jwtsecret, // 비밀 키
      {
        expiresIn: "365d",
        subject: "userInfo",
      } // 유효 시간은 365일
    );

    res.json({
      jwt: token,
      isSuccess: true,
      code: 200,
      message: "jwt발급 성공",
    });
  } catch (err) {
    logger.error(`App - SignIn Query error\n: ${JSON.stringify(err)}`);
    connection.release();
    return false;
  }
};

/**
 03.check API = token 검증
 **/
exports.isValidJWT = async function (req, res) {
  res.json({
    isSuccess: true,
    code: 200,
    message: "검증 성공",
    info: req.verifiedToken,
  });
};

// 04.deleteUser API = 회원 탈퇴
exports.deleteUser = async function (req, res) {
  const { id } = req.verifiedToken;
  const { userId } = req.params;
  if (id != userId) {
    return res.json({
      isSucess: false,
      code: 411,
      message: "권한이 없습니다.",
    });
  }
  try {
    const userProfileRows = await userDao.selectUserProfile(id);
    if (userProfileRows.length === 0) {
      return res.json({
        isSucess: false,
        code: 412,
        message: "존재하지 않는 userid입니다.",
      });
    }

    const deleteUserRow = await userDao.deleteUser(id);
    if (deleteUserRow.length > 0) {
      return res.json({
        isSuccess: true,
        code: 200,
        message: "회원탈퇴 성공",
      });
    }
    return res.json({
      isSuccess: true,
      code: 400,
      message: "회원탈퇴 실패",
    });
  } catch (err) {
    logger.error(`App - deleteUser Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

// 05.update API = 회원정보 수정
exports.update = async function (req, res) {
  const { id } = req.verifiedToken;
  const { userId } = req.params;
  let { userName, profileImageUrl, phoneNumber, email } = req.body;

  if (id != userId) {
    return res.json({
      isSucess: false,
      code: 411,
      message: "권한이 없습니다.",
    });
  }

  if (userName) {
    if (typeof userName !== "string")
      return res.json({
        isSuccess: false,
        code: 412,
        message: "닉네임은 문자열을 입력하세요.",
      });
    if (!/^([a-zA-Z0-9ㄱ-ㅎ|ㅏ-ㅣ|가-힣]).{1,10}$/.test(userName))
      return res.json({
        isSuccess: false,
        code: 413,
        message: "닉네임은 한글, 영문, 숫자만 가능하며 2-10자리 가능합니다.",
      });
  }
  if (profileImageUrl) {
    if (!/(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/.test(profileImageUrl))
      return res.json({
        isSuccess: false,
        code: 421,
        message: "url형식에 맞게 입력해주세요.",
      });
  }
  if (phoneNumber) {
    if (typeof phoneNumber !== "string") {
      return res.json({
        isSuccess: false,
        code: 422,
        message: "전화번호는 문자열을 입력하세요.",
      });
    }
    if (!/^[0-9]{3}-[0-9]{3,4}-[0-9]{4}/.test(phoneNumber))
      return res.json({
        isSuccess: false,
        code: 423,
        message: "숫자, -을 포함해 휴대전화 형식에 맞게 입력해주세요.",
      });
  }
  if (email) {
    if (email.length > 50)
      return res.json({
        isSuccess: false,
        code: 431,
        message: "이메일은 50자리 미만으로 입력해주세요.",
      });
    if (!regexEmail.test(email))
      return res.json({
        isSuccess: false,
        code: 432,
        message: "이메일형식을 정확하게 입력해주세요.",
      });
  }

  try {
    // 닉네임 중복 확인
    const userNameRows = await userDao.userNameCheck(userName);
    console.log(userNameRows[0].userName);
    if (userNameRows.length > 0 && userNameRows[0].userName !== userName) {
      return res.json({
        isSuccess: false,
        code: 433,
        message: "중복된 닉네임입니다.",
      });
    }
    // 휴대폰번호 중복 확인
    const phoneNumberRows = await userDao.phoneNumberCheck(phoneNumber);
    if (phoneNumberRows.length > 0 && phoneNumberRows[0].phoneNumber !== phoneNumber) {
      return res.json({
        isSuccess: false,
        code: 441,
        message: "중복된 휴대폰번호입니다.",
      });
    }
    // 이메일 중복 확인
    const emailRows = await userDao.userEmailCheck(email, id);
    if (emailRows.length > 0 && emailRows[0].email !== email) {
      return res.json({
        isSuccess: false,
        code: 442,
        message: "중복된 이메일입니다.",
      });
    }

    const userProfileRows = await userDao.selectUserProfile(id);
    userName ? (userName = userName) : (userName = userProfileRows[0].userName);
    profileImageUrl ? (profileImageUrl = profileImageUrl) : (profileImageUrl = userProfileRows[0].profileImageUrl);
    phoneNumber ? (phoneNumber = phoneNumber) : (phoneNumber = userProfileRows[0].phoneNumber);
    email ? (email = email) : (email = userProfileRows[0].email);

    const updateUserInfoRows = await userDao.updateUserInfo(userName, profileImageUrl, phoneNumber, email, id);
    if (updateUserInfoRows.length > 0) {
      return res.json({
        isSuccess: true,
        code: 200,
        message: "회원정보 수정 성공",
      });
    }
    return res.json({
      isSuccess: false,
      code: 400,
      message: "회원정보 수정 실패",
    });
    //  await connection.commit(); // COMMIT
    // connection.release();
  } catch (err) {
    // await connection.rollback(); // ROLLBACK
    // connection.release();
    logger.error(`App - updateUserInfo Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

// 06.profile API = 유저 프로필 조회
exports.profile = async function (req, res) {
  const { id } = req.verifiedToken;
  const { userId } = req.params;
  if (id != userId) {
    return res.json({
      isSucess: false,
      code: 411,
      message: "권한이 없습니다.",
    });
  }
  try {
    const userProfileRows = await userDao.selectUserProfile(id);
    if (userProfileRows.length === 0) {
      return res.json({
        isSucess: false,
        code: 412,
        message: "존재하지 않는 userid입니다.",
      });
    }
    return res.json({
      result: userProfileRows,
      isSuccess: true,
      code: 200,
      message: "유저프로필 정보 검색 성공",
    });
  } catch (err) {
    logger.error(`App - selectUserProfile Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

// 06.like API = 유저 관심목록 조회
exports.like = async function (req, res) {
  const { id } = req.verifiedToken;
  const userLocationRows = await postDao.selectUserLocation(id);
  if (userLocationRows.length === 0) {
    return res.json({
      isSuccess: false,
      code: 411,
      message: "사용자의 위치정보가 없습니다.",
    });
  }

  try {
    const userLikeRows = await userDao.selectUserLike(id, userLocationRows);
    console.log(userLikeRows);
    if (userLikeRows.length === 0) {
      return res.json({
        data: [],
        isSucess: false,
        code: 412,
        message: "userid에 관심목록이 존재하지 않습니다.",
      });
    }

    // 사용자 상품에 대한 관심상품 헤제 여부
    for (let i = 0; i < userLikeRows.length; i++) {
      let postIdx = userLikeRows[i].postIdx;
      const LikeStatusRows = await postDao.selectLikeStatus(id, postIdx);
      if (LikeStatusRows.length === 0 || LikeStatusRows[0].LikeStatus === 0) {
        userLikeRows[i].LikeStatus = false;
      } else {
        userLikeRows[i].LikeStatus = true;
      }
    }

    return res.json({
      liked: userLikeRows,
      isSuccess: true,
      code: 200,
      message: "사용자 관심목록 조회 성공",
    });
  } catch (err) {
    logger.error(`App - like Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

// 07.block API = 차단 사용자목록 조회
exports.block = async function (req, res) {
  const { id } = req.verifiedToken;
  try {
    const blockRows = await userDao.selectUserBlock(id);
    if (blockRows.length === 0) {
      return res.json({
        isSuccess: false,
        code: 400,
        message: "userid에 조회할 차단 사용자가 없습니다.",
      });
    }
    return res.json({
      blocked: blockRows,
      isSuccess: true,
      code: 200,
      message: "차단 사용자목록 조회 성공",
    });
  } catch (err) {
    logger.error(`App - block Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

// 08.changeBlock API = 차단 사용자 추가, 헤제
exports.changeBlock = async function (req, res) {
  const { id } = req.verifiedToken;
  const { targetUserIdx } = req.body;

  try {
    const deleteUserBlockRows = await userDao.deleteUserBlock(id, targetUserIdx);
    if (deleteUserBlockRows.affectedRows === 0) {
      const insertUserBlockRows = await userDao.insertUserBlock(id, targetUserIdx);
      if (insertUserBlockRows.length === 0) {
        return res.json({
          isSuccess: false,
          code: 411,
          message: "잘못된 targetUserIdx입니다.",
        });
      }
    }

    const blocktatus = await userDao.selectBlockStatus(targetUserIdx);
    if (blocktatus[0].blockStatus === "Y") {
      return res.json({
        isSuccess: true,
        code: 200,
        message: "차단 사용자 추가 성공",
      });
    } else {
      return res.json({
        isSuccess: true,
        code: 201,
        message: "차단 사용자 헤제 성공",
      });
    }
  } catch (err) {
    logger.error(`App - addBlock Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};
