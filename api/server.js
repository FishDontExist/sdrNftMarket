const express = require('express')
const multer = require('multer') //handles image uploading
const cors = require('cors');
const axios = require('axios')
const app = express()
const port = process.env.PORT || 5000

app.use(express.json())

const upload = multer({
    limits: {
        fileSize: 1000000
    }
})

const starton = axios.create({
    baseURL: "https://api.starton.io/v3",
    headers: {
        "x-api-key": "sk_live_15a866d2-58aa-4820-855d-8642e10af31c",
    },
})

app.post('/upload', cors(), upload.single('file'), async (req, res) => {

    let data = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    data.append("file", blob, { filename: req.file.originalname })
    data.append("isSync", "true");

    try {
        async function uploadImageOnIpfs() {
            const ipfsImg = await starton.post("/ipfs/file", data, {
                headers: { "Content-Type": `multipart/form-data; boundary=${data._boundary}` },
            })
            return ipfsImg.data;
        }
        async function uploadMetadataOnIpfs(imgCid) {
            const metadataJson = {
                name: `A Wonderful NFT`,
                description: `Probably the most awesome NFT ever created !`,
                image: `ipfs://ipfs/${imgCid}`,
            }
            const ipfsMetadata = await starton.post("/ipfs/json", {
                name: "My NFT metadata Json",
                content: metadataJson,
                isSync: true,
            })
            return ipfsMetadata.data;
        }

        const RECEIVER_ADDRESS = "0xBaB4e6ca8FbB737D02Ca9D5d68dC1B169d496631"
        const SMART_CONTRACT_NETWORK = "polygon-mumbai"
        const SMART_CONTRACT_ADDRESS = "0x8BAfF04349b66B5eE84729878092F92DBA7DcE85"
        const WALLET_IMPORTED_ON_STARTON = "0x18d02bB2Fafe4Aa31Ec8EC70127d1efe79699e23"

        async function mintNFT(receiverAddress, metadataCid) {
            const nft = await starton.post(`/smart-contract/${SMART_CONTRACT_NETWORK}/${SMART_CONTRACT_ADDRESS}/call`, {
                functionName: "mint",
                signerWallet: WALLET_IMPORTED_ON_STARTON,
                speed: "low",
                params: [receiverAddress, metadataCid],
            })
            return nft.data;
        }

        const ipfsImgData = await uploadImageOnIpfs();
        const ipfsMetadata = await uploadMetadataOnIpfs(ipfsImgData.cid);
        const nft = await mintNFT("0xBaB4e6ca8FbB737D02Ca9D5d68dC1B169d496631", ipfsMetadata.cid)
        res.status(201).json({
            transactionHash: nft.transactionHash,
            cid: ipfsImgData.cid,
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while processing your request.' });
    }
})
app.listen(port, () => {
    console.log('Server is running on port ' + port);
})
