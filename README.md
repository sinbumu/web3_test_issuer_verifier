# 프젝 설명
ERC 제의 관련 컨트랙트를 테스트 하기 위한 issuer와 verify역할을 하는 서버

## src/routes/issuerRoutes.js
### 1. Mint API 사용 예시
Endpoint: POST /api/issuer/mint

설명:

mint API는 uri와 tokenId를 필수 파라미터로 받고, 선택적으로 pTokenId를 받을 수 있습니다.
요청이 성공하면 tokenId, transactionHash, password, hash를 반환하여, 클라이언트가 password와 hash 값을 보관하고 이후 검증에 사용할 수 있습니다.
```
curl -X POST http://localhost:3000/api/issuer/mint \
   -H "Content-Type: application/json" \
   -d '{
      "uri": "https://example.com/resource",
      "tokenId": "112345",
      "pTokenId": "67890"
   }'
```
요청 예시:

uri: 인증서 URI (필수)

tokenId: 토큰의 고유 ID (필수)

pTokenId: 부모 토큰 ID (옵셔널)

```
//응답 예
{
   "message": "Mint 성공",
   "tokenId": "112345",
   "transactionHash": "0xabc123...def456",
   "password": "generatedpassword",
   "hash": "hashvalue12345"
}
```

### 2. Burn API 사용 예시
Endpoint: POST /api/issuer/burn

설명:

burn API는 tokenId를 필수로 받습니다.

요청이 성공하면 해당 토큰이 소각되며, transactionHash와 tokenId가 응답됩니다.

```
curl -X POST http://localhost:3000/api/issuer/burn \
   -H "Content-Type: application/json" \
   -d '{
      "tokenId": "112345"
   }'

```

요청 예시:

tokenId: 소각할 토큰의 고유 ID (필수)

```
//성공응답 예
{
   "message": "Burn 성공",
   "tokenId": "112345",
   "transactionHash": "0xabc123...def456"
}
```


## src/routes/verifierRoutes.js
엔드포인트: GET /api/verifier/verify

파라미터:

tokenId (필수): 조회할 토큰 ID

password (선택): 토큰에 접근하기 위한 비밀번호

조회 로직:

tokenId와 선택적인 password를 기반으로 MongoDB API 서버에 조회 요청을 보냅니다.

조회 결과에 pTokenId가 존재하면 부모 tokenId로도 추가 조회를 수행합니다.

```
//비밀번호 없는 경우
curl -X GET "http://localhost:3000/api/verifier/verify?tokenId=112345"

//있는 경우
curl -X GET "http://localhost:3000/api/verifier/verify?tokenId=112345&password=mysecretpassword"
```
```
//응답 예시 
//pTokenId가 있지만, 대응하는 credential을 올려두진 않아서 null로 옴.
blockoxyz@BLOCKOs-MacBook-Pro Downloads % 
curl -X GET "http://localhost:3000/api/verifier/verify?tokenId=9999999&password=mysecretpassword"
{"credential":{"credential":{"_id":"6720927d5b5cb2141cd03bf3","uri":"https://example.com/resource","tokenId":"9999999","pTokenId":"67890","credential":{"name":"Example Credential","type":"ExampleType"},"password":"$2b$10$dL1haEErLfzWoOta3cDz/uxDGfpDzr6Dr9BBT5bLjXAeSgvFYEql2","isDeleted":false,"__v":0}},"parentCredential":null}%  
```

## 해쉬 무결성 체크 관련
```
//issuerRoutes.js 에서
const credentialData = { ...exampleCredential, tokenId };
//이 변수에 대해서
const hash = generateHash(credentialData);
//이렇게 해쉬화 하기 때문에
//나중에 데이터 무결성 체크 검증이 필요해 진다면 위와 같은 절차를 밟으면 됨.
```
