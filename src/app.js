// src/app.js
require('dotenv').config();
const express = require('express');
const Web3 = require('web3');

const app = express();
const port = 3000;

// 기본 JSON 파싱 미들웨어 설정
app.use(express.json());

// 이더리움 네트워크 설정
const network = process.env.USE_DEVNET === 'true' ? process.env.ETHEREUM_DEVNET : process.env.ETHEREUM_MAINNET;
const web3 = new Web3(network);
console.log(`Connected to Ethereum network: ${network}`);

// 간단한 라우트 예제
app.get('/', (req, res) => {
   res.send('Issuer/Verifier API 서버가 실행 중입니다.');
});

// 발행(mint), 검증(verify) 관련 라우트
// src/routes/issuerRoutes.js와 src/routes/verifierRoutes.js를 생성 후 import
const issuerRoutes = require('./routes/issuerRoutes');
const verifierRoutes = require('./routes/verifierRoutes');

app.use('/api/issuer', issuerRoutes);
app.use('/api/verifier', verifierRoutes);

// 서버 시작
app.listen(port, () => {
   console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});

module.exports = app;
