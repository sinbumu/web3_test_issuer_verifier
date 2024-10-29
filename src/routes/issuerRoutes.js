const express = require('express');
const Web3 = require('web3');
const axios = require('axios');
const crypto = require('crypto');
const router = express.Router();

require('dotenv').config();
const MONGODB_API_URL = process.env.MONGODB_API_URL;

const CONTRACT_ADDRESS = '0xYourContractAddressHere'; // ERC-721 컨트랙트 주소 (추후 업데이트 예정)

// Web3 설정
const network = process.env.USE_DEVNET === 'true' ? process.env.ETHEREUM_DEVNET : process.env.ETHEREUM_MAINNET;
const web3 = new Web3(network);
const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
web3.eth.accounts.wallet.add(account);

// 하드코딩된 기본 Credential 데이터
const exampleCredential = {
    name: 'Example Credential',
    type: 'ExampleType'
};

// 해시 생성 함수
const generateHash = (data) => {
    return web3.utils.sha3(JSON.stringify(data));
};

// 1. Mint (발행) API
router.post('/mint', async (req, res) => {
    const { uri, tokenId, pTokenId } = req.body;

    // 필수값 검사
    if (!uri || !tokenId) {
        return res.status(400).json({ error: 'uri와 tokenId는 필수값입니다.' });
    }

    try {
        // Credential 데이터 생성
        const credentialData = { ...exampleCredential, tokenId };
        const hash = generateHash(credentialData);

        // 임의의 난수로 비밀번호 생성 (8자리)
        const password = crypto.randomBytes(4).toString('hex');

        // MongoDB API 서버에 데이터 저장 요청
        await axios.post(`${MONGODB_API_URL}/api/credentials`, {
            uri,
            tokenId,
            pTokenId: pTokenId || null,
            credential: credentialData,
            password: password, // 비밀번호도 함께 전송
            hash: hash
        });

        // ERC-721 컨트랙트의 mint 함수 호출
        const mintTx = contract.methods.mint(account.address, tokenId);
        const gas = await mintTx.estimateGas({ from: account.address });
        const mintTxData = mintTx.encodeABI();

        const tx = {
            from: account.address,
            to: CONTRACT_ADDRESS,
            data: mintTxData,
            gas
        };

        const receipt = await web3.eth.sendTransaction(tx);
        
        // 클라이언트에 tokenId, transactionHash, password, hash를 반환
        res.status(200).json({ 
            message: 'Mint 성공', 
            tokenId, 
            transactionHash: receipt.transactionHash,
            password,
            hash 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Mint 실패' });
    }
});


// 2. Burn (소각) API
router.post('/burn', async (req, res) => {
    const { tokenId } = req.body;

    try {
        // MongoDB API 서버에 논리 삭제 요청
        await axios.delete(`${MONGODB_API_URL}/api/credentials/${tokenId}`);

        // ERC-721 컨트랙트의 burn 함수 호출
        const burnTx = contract.methods.burn(tokenId);
        const gas = await burnTx.estimateGas({ from: account.address });
        const burnTxData = burnTx.encodeABI();

        const tx = {
            from: account.address,
            to: CONTRACT_ADDRESS,
            data: burnTxData,
            gas
        };

        const receipt = await web3.eth.sendTransaction(tx);
        res.status(200).json({ message: 'Burn 성공', tokenId, transactionHash: receipt.transactionHash });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Burn 실패' });
    }
});

module.exports = router;
