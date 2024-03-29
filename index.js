const { promisify } = require('util');
const glob = require('glob');
const OSS = require('ali-oss');
const path = require('path');
const EventEmitter = require('events');
const fs = require('fs');
const assert = require('assert');

const globAsync = promisify(glob);

const defaultSort = fileName => (!fileName.endsWith('.html') ? -1 : 1);

class Deployer extends EventEmitter {
  constructor(config) {
    super();
    assert(config.region, 'region is required');
    assert(config.accessKeyId, 'accessKeyId is required');
    assert(config.accessKeySecret, 'accessKeySecret is required');
    assert(config.bucket, 'bucket is required');
    this.state = 'wait';
    this.config = config;
    this.pending = new Map();
  }

  get ossClient() {
    this.$client = this.$client || new OSS(this.config);
    return this.$client;
  }

  async uploadFileListByOss(fileList, prefix = '') {
    const startedAt = Date.now();
    this.state = 'pending';
    this.fileList = fileList;
    this.pending.clear();
    await fileList.reduce(async (promise, fileName) => {
      await promise;
      this.pending.set(fileName, 'pending');
      let ossTarget = path.join(prefix, fileName);
      if (this.config.rename) {
        ossTarget = this.config.rename(ossTarget);
      }
      const filePath = path.join(this.uploadDir, fileName);
      const stream = fs.createReadStream(filePath);
      const result = await this.ossClient.putStream(ossTarget, stream);
      this.pending.set(fileName, 'done');
      this.emit('uploadedItem', { result, fileName });
    }, Promise.resolve());
    const ret = { time: Date.now() - startedAt, fileCount: fileList.length };
    this.state = 'done';
    this.fileList = [];
    this.pending.clear();
    this.emit('uploadedAll', ret);
    return { time: Date.now() - startedAt, fileCount: fileList.length };
  }

  async deploySite(uploadDir, prefix = '', { ignore, sort } = {}) {
    this.uploadDir = uploadDir || this.uploadDir;
    const fileList = await globAsync('**/*', { cwd: uploadDir, nodir: true, ignore });
    const sortedFileList = fileList.sort(
      sort || defaultSort
    );
    return this.uploadFileListByOss(sortedFileList, prefix);
  }

  async link (src, dist, prefix = '') {
    return this.ossClient.putSymlink(
      path.join(prefix, dist),
      path.join(prefix, src),
    );
  }
}

module.exports = Deployer;
