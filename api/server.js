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
    data.append("file", blob, { filename: req.file.originalnam })
    data.append("isSync", "true");

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

    const ipfsImgData = await uploadImageOnIpfs();
    const ipfsMetadata = await uploadMetadataOnIpfs(ipfsImgData.cid);
    
    res.status(201).json({
        cid: ipfsImgData.cid
    })
})
app.listen(port, () => {
    console.log('Server is running on port ' + port);
})