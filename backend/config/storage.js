require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pwfgmesjakmcemubnjrx.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_yqu64_Ll0rEHp-2WX8k3ww_iuX_laNB';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function uploadFile(bucketName, fileName, fileBuffer, mimeType) {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, fileBuffer, {
      contentType: mimeType,
      upsert: true
    });
  
  if (error) {
    throw new Error('文件上传失败: ' + error.message);
  }
  
  const { data: { publicUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path);
  
  return publicUrl;
}

module.exports = { uploadFile };