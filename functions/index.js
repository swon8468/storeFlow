/**
 * Firebase Cloud Functions
 * 매장 생성 이메일 발송 및 이메일 중복 확인
 */

const {onCall} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();
setGlobalOptions({ maxInstances: 10 });

// 이메일 전송 설정
let transporter = null;

function getTransporter() {
  if (!transporter) {
    const mailUser = process.env.MAIL_USER;
    const mailPassword = process.env.MAIL_PASSWORD;
    const mailHost = process.env.MAIL_HOST || "smtp.gmail.com";
    const mailPort = process.env.MAIL_PORT || 587;
    const mailSecure = process.env.MAIL_SECURE === "true";
    
    if (!mailUser || !mailPassword) {
      throw new Error("이메일 설정이 완료되지 않았습니다. MAIL_USER와 MAIL_PASSWORD 환경 변수를 설정하세요.");
    }
    
    // Gmail 또는 Google Workspace 사용 시
    if (mailHost === "smtp.gmail.com" || mailUser.includes("@gmail.com") || mailUser.includes("@storeflow.kr")) {
      transporter = nodemailer.createTransport({
        service: "gmail",
        host: mailHost,
        port: parseInt(mailPort),
        secure: mailSecure, // true for 465, false for other ports
        auth: {
          user: mailUser,
          pass: mailPassword,
        },
      });
    } else {
      // 다른 SMTP 서비스 사용 시
      transporter = nodemailer.createTransport({
        host: mailHost,
        port: parseInt(mailPort),
        secure: mailSecure,
        auth: {
          user: mailUser,
          pass: mailPassword,
        },
      });
    }
  }
  return transporter;
}

/**
 * 비밀번호 설정 이메일 발송 (매장 생성 시)
 */
exports.sendPasswordSetupEmail = onCall({
  cors: true,
}, async (request) => {
  const { storeName, managerEmail, storeId } = request.data;
  
  if (!managerEmail || !storeName || !storeId) {
    throw new Error("필수 정보가 누락되었습니다.");
  }

  try {
    // 비밀번호 설정 링크 생성
    const appUrl = process.env.APP_URL || "https://your-app-url.com";
    const passwordResetLink = `${appUrl}/auth/set-password?email=${encodeURIComponent(managerEmail)}&storeId=${storeId}&token=${Date.now()}`;

    // 비밀번호 설정 이메일
    const passwordSetupEmail = {
      from: process.env.MAIL_FROM || "noreply@storeflow.kr",
      to: managerEmail,
      subject: `[storeFlow] ${storeName} 매장 비밀번호 설정 안내`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 30px; background: #1890ff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>storeFlow</h1>
              <p>매장 관리 시스템</p>
            </div>
            <div class="content">
              <h2>비밀번호 설정 안내</h2>
              <p>안녕하세요,</p>
              <p><strong>${storeName}</strong> 매장의 담당자로 지정되었습니다.</p>
              
              <h3>다음 단계: 비밀번호 설정</h3>
              <p>아래 버튼을 클릭하여 비밀번호를 설정하세요.</p>
              <p style="text-align: center;">
                <a href="${passwordResetLink}" class="button">비밀번호 설정하기</a>
              </p>
              
              <p style="font-size: 12px; color: #666; margin-top: 30px;">
                링크가 작동하지 않으면 아래 URL을 복사하여 브라우저에 붙여넣으세요:<br>
                <a href="${passwordResetLink}" style="color: #1890ff; word-break: break-all;">${passwordResetLink}</a>
              </p>

              <p style="font-size: 12px; color: #666; margin-top: 20px;">
                이 링크는 24시간 동안 유효합니다.
              </p>

              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              
              <p style="font-size: 12px; color: #999;">
                이 이메일은 storeFlow 시스템에서 자동으로 발송되었습니다.<br>
                문의사항이 있으시면 관리자에게 연락하세요.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    // 이메일 발송
    const emailTransporter = getTransporter();
    await emailTransporter.sendMail(passwordSetupEmail);
    
    return {
      success: true,
      message: "비밀번호 설정 이메일이 성공적으로 발송되었습니다.",
    };
  } catch (error) {
    console.error("이메일 발송 오류:", error);
    throw new Error(`이메일 발송 실패: ${error.message}`);
  }
});

/**
 * 매장 생성 완료 이메일 발송 (매장 상태가 "운영"으로 변경될 때)
 */
exports.sendStoreCreationEmail = onCall({
  cors: true,
}, async (request) => {
  const { storeName, managerEmail, businessNumber, storeId } = request.data;
  
  if (!managerEmail || !storeName) {
    throw new Error("필수 정보가 누락되었습니다.");
  }

  try {
    const appUrl = process.env.APP_URL || "https://your-app-url.com";

    // 매장 생성 완료 이메일
    const storeCreationEmail = {
      from: process.env.MAIL_FROM || "noreply@storeflow.kr",
      to: managerEmail,
      subject: `[storeFlow] ${storeName} 매장 생성 완료 안내`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background: white; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #1890ff; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>storeFlow</h1>
              <p>매장 관리 시스템</p>
            </div>
            <div class="content">
              <h2>매장 생성 완료 안내</h2>
              <p>안녕하세요,</p>
              <p><strong>${storeName}</strong> 매장이 성공적으로 생성되어 운영을 시작할 수 있습니다.</p>
              
              <div class="info-box">
                <h3>매장 정보</h3>
                <p><strong>매장명:</strong> ${storeName}</p>
                <p><strong>사업자 등록번호:</strong> ${businessNumber || "-"}</p>
                <p><strong>담당자 이메일:</strong> ${managerEmail}</p>
              </div>

              <p>이제 매장 관리 시스템에 로그인하여 매장을 운영하실 수 있습니다.</p>
              <p>로그인 URL: <a href="${appUrl}/auth/login">${appUrl}/auth/login</a></p>

              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              
              <p style="font-size: 12px; color: #999;">
                이 이메일은 storeFlow 시스템에서 자동으로 발송되었습니다.<br>
                문의사항이 있으시면 관리자에게 연락하세요.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    // 이메일 발송
    const emailTransporter = getTransporter();
    await emailTransporter.sendMail(storeCreationEmail);
    
    return {
      success: true,
      message: "매장 생성 완료 이메일이 성공적으로 발송되었습니다.",
    };
  } catch (error) {
    console.error("이메일 발송 오류:", error);
    throw new Error(`이메일 발송 실패: ${error.message}`);
  }
});

/**
 * 매장 생성 및 계정 생성 (Cloud Functions로 처리하여 자동 로그인 방지)
 */
exports.createStoreWithAccount = onCall({
  cors: true,
}, async (request) => {
  const { storeName, managerEmail, businessNumber, logoUrl } = request.data;
  
  if (!managerEmail || !storeName) {
    throw new Error("필수 정보가 누락되었습니다.");
  }

  try {
    // 1. 이메일 중복 확인
    const storesRef = admin.firestore().collection("stores");
    const existingStores = await storesRef.where("managerEmail", "==", managerEmail).get();
    if (!existingStores.empty) {
      throw new Error("이미 사용 중인 담당자 이메일입니다.");
    }

    // 2. Firebase Auth 계정 생성
    const tempPassword = `Temp@${Date.now()}!`; // 임시 비밀번호 (특수문자 포함)
    let userRecord;
    try {
      userRecord = await admin.auth().createUser({
        email: managerEmail,
        password: tempPassword,
        emailVerified: false,
      });
    } catch (authError) {
      if (authError.code === "auth/email-already-in-use") {
        throw new Error("이 이메일은 이미 사용 중입니다.");
      }
      throw authError;
    }

    // 3. 매장 생성 (Firestore)
    const storeData = {
      name: storeName,
      businessNumber: businessNumber || null,
      managerEmail: managerEmail,
      logoUrl: logoUrl || null,
      status: "initial",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const storeRef = await admin.firestore().collection("stores").add(storeData);
    const storeId = storeRef.id;

    // 4. Firestore accounts 문서 생성
    const accountData = {
      role: "storeAdmin",
      username: managerEmail.split("@")[0],
      uid: userRecord.uid,
      storeId: storeId,
      name: `${storeName} 매장 관리자`,
      email: managerEmail,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await admin.firestore().collection("accounts").doc(userRecord.uid).set(accountData);

    // 5. 비밀번호 설정 이메일 발송
    const appUrl = process.env.APP_URL || "https://your-app-url.com";
    const passwordResetLink = `${appUrl}/auth/set-password?email=${encodeURIComponent(managerEmail)}&storeId=${storeId}&token=${Date.now()}`;

    const passwordSetupEmail = {
      from: process.env.MAIL_FROM || "noreply@storeflow.kr",
      to: managerEmail,
      subject: `[storeFlow] ${storeName} 매장 비밀번호 설정 안내`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 30px; background: #1890ff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>storeFlow</h1>
              <p>매장 관리 시스템</p>
            </div>
            <div class="content">
              <h2>비밀번호 설정 안내</h2>
              <p>안녕하세요,</p>
              <p><strong>${storeName}</strong> 매장의 담당자로 지정되었습니다.</p>
              
              <h3>다음 단계: 비밀번호 설정</h3>
              <p>아래 버튼을 클릭하여 비밀번호를 설정하세요.</p>
              <p style="text-align: center;">
                <a href="${passwordResetLink}" class="button">비밀번호 설정하기</a>
              </p>
              
              <p style="font-size: 12px; color: #666; margin-top: 30px;">
                링크가 작동하지 않으면 아래 URL을 복사하여 브라우저에 붙여넣으세요:<br>
                <a href="${passwordResetLink}" style="color: #1890ff; word-break: break-all;">${passwordResetLink}</a>
              </p>

              <p style="font-size: 12px; color: #666; margin-top: 20px;">
                이 링크는 24시간 동안 유효합니다.
              </p>

              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              
              <p style="font-size: 12px; color: #999;">
                이 이메일은 storeFlow 시스템에서 자동으로 발송되었습니다.<br>
                문의사항이 있으시면 관리자에게 연락하세요.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const emailTransporter = getTransporter();
    await emailTransporter.sendMail(passwordSetupEmail);

    return {
      success: true,
      storeId: storeId,
      message: "매장이 생성되었고 담당자에게 비밀번호 설정 이메일이 발송되었습니다.",
    };
  } catch (error) {
    console.error("매장 생성 오류:", error);
    throw new Error(`매장 생성 실패: ${error.message}`);
  }
});

/**
 * 비밀번호 설정 이메일 재발송
 */
exports.resendPasswordSetupEmail = onCall({
  cors: true,
}, async (request) => {
  const { storeName, managerEmail, storeId } = request.data;
  
  if (!managerEmail || !storeName || !storeId) {
    throw new Error("필수 정보가 누락되었습니다.");
  }

  try {
    // 비밀번호 설정 링크 생성
    const appUrl = process.env.APP_URL || "https://your-app-url.com";
    const passwordResetLink = `${appUrl}/auth/set-password?email=${encodeURIComponent(managerEmail)}&storeId=${storeId}&token=${Date.now()}`;

    // 비밀번호 설정 이메일
    const passwordSetupEmail = {
      from: process.env.MAIL_FROM || "noreply@storeflow.kr",
      to: managerEmail,
      subject: `[storeFlow] ${storeName} 매장 비밀번호 설정 안내 (재발송)`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 30px; background: #1890ff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>storeFlow</h1>
              <p>매장 관리 시스템</p>
            </div>
            <div class="content">
              <h2>비밀번호 설정 안내 (재발송)</h2>
              <p>안녕하세요,</p>
              <p><strong>${storeName}</strong> 매장의 담당자로 지정되었습니다.</p>
              
              <p style="color: #ff4d4f; font-weight: bold;">이 이메일은 재발송된 이메일입니다.</p>
              
              <h3>다음 단계: 비밀번호 설정</h3>
              <p>아래 버튼을 클릭하여 비밀번호를 설정하세요.</p>
              <p style="text-align: center;">
                <a href="${passwordResetLink}" class="button">비밀번호 설정하기</a>
              </p>
              
              <p style="font-size: 12px; color: #666; margin-top: 30px;">
                링크가 작동하지 않으면 아래 URL을 복사하여 브라우저에 붙여넣으세요:<br>
                <a href="${passwordResetLink}" style="color: #1890ff; word-break: break-all;">${passwordResetLink}</a>
              </p>

              <p style="font-size: 12px; color: #666; margin-top: 20px;">
                이 링크는 24시간 동안 유효합니다.
              </p>

              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              
              <p style="font-size: 12px; color: #999;">
                이 이메일은 storeFlow 시스템에서 자동으로 발송되었습니다.<br>
                문의사항이 있으시면 관리자에게 연락하세요.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const emailTransporter = getTransporter();
    await emailTransporter.sendMail(passwordSetupEmail);
    
    return {
      success: true,
      message: "비밀번호 설정 이메일이 재발송되었습니다.",
    };
  } catch (error) {
    console.error("이메일 재발송 오류:", error);
    throw new Error(`이메일 재발송 실패: ${error.message}`);
  }
});

/**
 * 사원 계정 생성 (매장 관리자용)
 */
exports.createStaffAccount = onCall({
  cors: true,
}, async (request) => {
  console.log("createStaffAccount 호출됨:", request.data);
  
  const { storeId, name, username } = request.data;
  
  if (!storeId || !name || !username) {
    console.error("필수 정보 누락:", { storeId, name, username });
    throw new Error("필수 정보가 누락되었습니다.");
  }

  try {
    console.log("아이디 중복 확인 시작:", { storeId, username });
    // 1. 아이디 중복 확인
    const accountsRef = admin.firestore().collection("accounts");
    const existingAccounts = await accountsRef
      .where("storeId", "==", storeId)
      .where("username", "==", username)
      .where("role", "==", "staff")
      .get();
    
    console.log("중복 확인 결과:", existingAccounts.size, "개 발견");
    
    if (!existingAccounts.empty) {
      throw new Error("이미 사용 중인 아이디입니다.");
    }

    console.log("사원 계정 데이터 생성 시작");
    // 2. Firestore에 accounts 문서만 생성 (Firebase Auth 없이)
    // 사원 계정은 비밀번호 없이 로그인하므로 Firebase Auth 계정 생성 불필요
    const accountData = {
      role: "staff",
      username: username,
      storeId: storeId,
      name: name,
      uid: null, // Firebase Auth 없이 생성
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    console.log("Firestore에 문서 추가 시작:", accountData);
    const accountRef = await admin.firestore().collection("accounts").add(accountData);
    console.log("문서 추가 완료, ID:", accountRef.id);
    
    // uid를 문서 ID로 설정
    console.log("uid 업데이트 시작");
    await admin.firestore().collection("accounts").doc(accountRef.id).update({
      uid: accountRef.id,
    });
    console.log("uid 업데이트 완료");

    const result = {
      success: true,
      accountId: accountRef.id,
      message: "사원 계정이 생성되었습니다.",
    };
    console.log("사원 계정 생성 성공:", result);
    return result;
  } catch (error) {
    console.error("사원 계정 생성 오류:", error);
    console.error("오류 스택:", error.stack);
    throw new Error(`사원 계정 생성 실패: ${error.message}`);
  }
});

/**
 * 이메일 중복 확인
 */
exports.checkEmailDuplicate = onCall({
  cors: true,
}, async (request) => {
  const { email } = request.data;
  
  if (!email) {
    throw new Error("이메일이 필요합니다.");
  }

  try {
    const storesRef = admin.firestore().collection("stores");
    const snapshot = await storesRef.where("managerEmail", "==", email).get();
    
    return {
      isDuplicate: !snapshot.empty,
      count: snapshot.size,
    };
  } catch (error) {
    console.error("이메일 중복 확인 오류:", error);
    throw new Error(`이메일 중복 확인 실패: ${error.message}`);
  }
});
