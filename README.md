

## 해쉬 무결성 체크 관련
```
//issuerRoutes.js 에서
const credentialData = { ...exampleCredential, tokenId };
//이 변수에 대해서
const hash = generateHash(credentialData);
//이렇게 해쉬화 하기 때문에
//나중에 데이터 무결성 체크 검증이 필요해 진다면 위와 같은 절차를 밟으면 됨.
```
