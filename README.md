# usage
```
const path = require('path')
const Deployer = require('oss-site-deployer')

const deployer = new Deployer({
  region: 'oss-cn-hangzhou',
  accessKeyId: '*',
  accessKeySecret: '*',
  bucket: 'lab-develop'
})

deployer.on('uploadedItem', ({ fileName }) => {
  console.log('uploaded ', fileName)
})

deployer
  .deploySite(path.resolve('../demo/dist'), 'test1')
  .then(() => {
    console.log('uploadedAll')
  })
```

# todo

- [] add cli
