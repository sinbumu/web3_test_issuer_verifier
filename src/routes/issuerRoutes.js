const express = require('express');
const Web3 = require('web3').Web3;
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const router = express.Router();

require('dotenv').config();
const MONGODB_API_URL = process.env.MONGODB_API_URL;

// Web3 설정
const web3 = new Web3('http://127.0.0.1:8545');
const account = web3.eth.accounts.privateKeyToAccount(
    process.env.PRIVATE_KEY.startsWith('0x') ? process.env.PRIVATE_KEY : '0x' + process.env.PRIVATE_KEY
);
web3.eth.accounts.wallet.add(account);

// ABI 및 컨트랙트 설정
const contractABI = JSON.parse(fs.readFileSync('./src/abi/VCNFT.json', 'utf-8'));
const CONTRACT_ADDRESS = '0xcF08954861219bA9269Ca9825ae0fC5a7a59C6af'; // 배포된 컨트랙트 주소로 업데이트 필요
const contract = new web3.eth.Contract(contractABI, CONTRACT_ADDRESS);

// 하드코딩된 기본 Credential 데이터
const exampleCredential = {
    name: 'Example Credential',
    type: 'ExampleType'
};

// 해시 생성 함수
const generateHash = (data) => {
    return web3.utils.sha3(JSON.stringify(data));
};

// Mint (발행) API
router.post('/mint', async (req, res) => {
    const { uri, tokenId, pTokenId } = req.body;

    if (!uri || !tokenId) {
        return res.status(400).json({ error: 'uri와 tokenId는 필수값입니다.' });
    }

    try {
        const credentialData = { ...exampleCredential, tokenId };
        const hash = generateHash(credentialData);
        const password = crypto.randomBytes(4).toString('hex');

        // MongoDB API 서버에 데이터 저장 요청
        await axios.post(`${MONGODB_API_URL}/api/credentials`, {
            uri,
            tokenId,
            pTokenId: pTokenId || null,
            credential: credentialData,
            password: password,
            hash: hash
        });

        const certifyTx = contract.methods.certify(account.address, tokenId, uri, hash, pTokenId || 0);
        const gas = await certifyTx.estimateGas({ from: account.address });
        const certifyTxData = certifyTx.encodeABI();

        const tx = {
            from: account.address,
            to: CONTRACT_ADDRESS,
            data: certifyTxData,
            gas
        };

        const receipt = await web3.eth.sendTransaction(tx);
        
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

// Burn (소각) API
router.post('/burn', async (req, res) => {
    const { tokenId } = req.body;

    try {
        await axios.delete(`${MONGODB_API_URL}/api/credentials/${tokenId}`);

        const revokeTx = contract.methods.revoke(tokenId);
        const gas = await revokeTx.estimateGas({ from: account.address });
        const revokeTxData = revokeTx.encodeABI();

        const tx = {
            from: account.address,
            to: CONTRACT_ADDRESS,
            data: revokeTxData,
            gas
        };

        const receipt = await web3.eth.sendTransaction(tx);
        res.status(200).json({ message: 'Burn 성공', tokenId, transactionHash: receipt.transactionHash });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Burn 실패' });
    }
});

// ClaimURI 조회 API
router.get('/claimURI/:tokenId', async (req, res) => {
    const { tokenId } = req.params;

    try {
        const claimURI = await contract.methods.claimURI(tokenId).call();
        res.status(200).json({ tokenId, claimURI });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ClaimURI 조회 실패' });
    }
});

// ClaimHash 조회 API
router.get('/claimHash/:tokenId', async (req, res) => {
    const { tokenId } = req.params;

    try {
        const claimHash = await contract.methods.claimHash(tokenId).call();
        res.status(200).json({ tokenId, claimHash });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ClaimHash 조회 실패' });
    }
});

module.exports = router;
