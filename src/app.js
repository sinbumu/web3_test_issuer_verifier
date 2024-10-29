// src/app.js
require('dotenv').config();
const express = require('express');

const app = express();
const port = 3000;

// 기본 JSON 파싱 미들웨어 설정
app.use(express.json());

// 간단한 라우트 예제
app.get('/', (req, res) => {
   res.send('Issuer/Verifier API 서버가 실행 중입니다.');
});

// 발행(mint), 검증(verify) 관련 라우트
const issuerRoutes = require('./routes/issuerRoutes');
const verifierRoutes = require('./routes/verifierRoutes');

app.use('/api/issuer', issuerRoutes);
app.use('/api/verifier', verifierRoutes);

// 서버 시작
app.listen(port, () => {
   console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});

module.exports = app;
