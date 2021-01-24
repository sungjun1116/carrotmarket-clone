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
  // if (!email)
  //   return res.json({
  //     isSuccess: false,
  //     code: 301,
  //     message: "이메일을 입력해주세요.",
  //   });
  // if (email.length > 50)
  //   return res.json({
  //     isSuccess: false,
  //     code: 302,
  //     message: "이메일은 50자리 미만으로 입력해주세요.",
  //   });

  // if (!regexEmail.test(email))
  //   return res.json({
  //     isSuccess: false,
  //     code: 303,
  //     message: "이메일을 형식을 정확하게 입력해주세요.",
  //   });

  if (!userName)
    return res.json({
      isSuccess: false,
      code: 411,
      message: "닉네임을 입력 해주세요.",
    });
  if (userName.length > 20)
    return res.json({
      isSuccess: false,
      code: 412,
      message: "닉네임은 최대 20자리를 입력해주세요.",
    });

  if (!phoneNumber)
    return res.json({
      isSuccess: false,
      code: 421,
      message: "전화번호를 입력 해주세요.",
    });
  if (!phoneNumber.match(/^[0-9]{3}[-]+[0-9]{4}[-]+[0-9]{4}$/))
    return res.json({
      isSuccess: false,
      code: 422,
      message: "전화번호는 (0xx)-xxxx-xxxx 형식으로 입력해주세요.",
    });
  try {
    // // 이메일 중복 확인
    // const emailRows = await userDao.userEmailCheck(email);
    // if (emailRows.length > 0) {
    //   return res.json({
    //     isSuccess: false,
    //     code: 308,
    //     message: "중복된 이메일입니다.",
    //   });
    // }

    // 닉네임 중복 확인
    const userNameRows = await userDao.userNameCheck(userName);
    if (userNameRows.length > 0) {
      return res.json({
        isSuccess: false,
        code: 431,
        message: "중복된 닉네임입니다.",
      });
    }

    // 닉네임 중복 확인
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
    if (insertUserRows.length > 0) {
      return res.json({
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

  if (!phoneNumber.match(/^[0-9]{3}[-]+[0-9]{4}[-]+[0-9]{4}$/))
    return res.json({
      isSuccess: false,
      code: 411,
      message: "휴대폰 번호를 (0xx)-xxxx-xxxx 형식으로 입력해주세요.",
    });

  try {
    const [userInfoRows] = await userDao.selectUserInfo(phoneNumber);

    if (userInfoRows.length < 1) {
      connection.release();
      return res.json({
        isSuccess: false,
        code: 400,
        message: "로그인 실패 휴대폰 번호를 확인해주세요.",
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
exports.check = async function (req, res) {
  res.json({
    isSuccess: true,
    code: 200,
    message: "검증 성공",
    info: req.verifiedToken,
  });
};

// 04.update API = 회원정보 수정
exports.update = async function (req, res) {
  const { id } = req.verifiedToken;
  const { userName, profileImageUrl, phoneNumber, email } = req.body;
  if (email) {
    if (email.length > 50)
      return res.json({
        isSuccess: false,
        code: 411,
        message: "이메일은 50자리 미만으로 입력해주세요.",
      });
    if (!regexEmail.test(email))
      return res.json({
        isSuccess: false,
        code: 412,
        message: "이메일을 형식을 정확하게 입력해주세요.",
      });
  }

  if (userName !== undefined && userName.length > 20)
    return res.json({
      isSuccess: false,
      code: 421,
      message: "닉네임은 최대 20자리를 입력해주세요.",
    });

  try {
    const emailRows = await userDao.userEmailCheck(email, id);
    if (emailRows.length > 0) {
      return res.json({
        isSuccess: false,
        code: 422,
        message: "중복된 이메일입니다.",
      });
    }
    const updateUserInfoRows = await userDao.updateUserInfo(
      userName,
      profileImageUrl,
      phoneNumber,
      email,
      id
    );
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

// 05.deleteUser API = 회원 탈퇴
exports.deleteUser = async function (req, res) {
  const { id } = req.verifiedToken;
  try {
    const userProfileRows = await userDao.selectUserProfile(id);
    if (userProfileRows.length === 0) {
      return res.json({
        isSucess: false,
        code: 411,
        message: "존재하지 않는 userIdx입니다.",
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

// 06.profile API = 유저 프로필 조회
exports.profile = async function (req, res) {
  const { id } = req.verifiedToken;
  const { userIdx } = req.params;
  if (id === Number(userIdx)) {
    try {
      const userProfileRows = await userDao.selectUserProfile(id);
      if (userProfileRows.length === 0) {
        return res.json({
          isSucess: false,
          code: 411,
          message: "존재하지 않는 userIdx입니다.",
        });
      }
      return res.json({
        isSuccess: true,
        code: 200,
        message: "유저프로필 정보 검색 성공",
        data: userProfileRows,
      });
    } catch (err) {
      logger.error(`App - selectUserProfile Query error\n: ${err.message}`);
      return res.status(500).send(`Error: ${err.message}`);
    }
  } else {
    return res.json({
      isSucess: false,
      code: 412,
      message: "권한이 없습니다. 로그인을 먼저 해주세요!",
    });
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
        message: "userIdx에 관심목록이 존재하지 않습니다.",
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
        message: "userIdx에 조회할 차단 사용자가 없습니다.",
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
    const deleteUserBlockRows = await userDao.deleteUserBlock(
      id,
      targetUserIdx
    );
    if (deleteUserBlockRows.affectedRows === 0) {
      const insertUserBlockRows = await userDao.insertUserBlock(
        id,
        targetUserIdx
      );
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
