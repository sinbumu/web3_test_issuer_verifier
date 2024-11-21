// src/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = 3000;

// CORS 미들웨어 추가
app.use(cors({
   origin: 'http://localhost:3030' // React 앱의 주소를 허용
}));

// 기본 JSON 파싱 미들웨어 설정
app.use(express.json());

// 간단한 라우트 예제
app.get('/', (req, res) => {
   res.send('Issuer/Verifier API 서버가 실행 중입니다.');
});

// 발행(mint), 검증(verify) 관련 라우트
const issuerRoutes = require('./routes/issuerRoutes');
const verifierRoutes = require('./routes/verifierRoutes');
const clientRoutes = require('./routes/clientRoutes');

app.use('/api/issuer', issuerRoutes);
app.use('/api/verifier', verifierRoutes);
app.use('/api/client', clientRoutes);

// 서버 시작
app.listen(port, () => {
   console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});

module.exports = app;
