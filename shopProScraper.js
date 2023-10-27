const axios = require('axios');
const qs = require('qs');
const cheerio = require('cheerio');
const tough = require('tough-cookie');
const axiosCookieJarSupport = require('axios-cookiejar-support').wrapper;
const fs = require('fs');
const iconv = require('iconv-lite');
const encoding = require('encoding-japanese');

axiosCookieJarSupport(axios);

const LOGIN_URL = 'https://admin.shop-pro.jp/?mode=login&exec=1';
const BASE_URL = 'https://admin.shop-pro.jp/?mode=design_tmpl_edt&smode=HTCS';
const BASE_CSS_URL = 'https://admin.shop-pro.jp/?mode=design_tmpl_edt&smode=CSS';

const cookieJar = new tough.CookieJar();

const instance = axios.create({
  baseURL: 'https://admin.shop-pro.jp/',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': '*/*'
  },
  responseType: 'arraybuffer',
  maxRedirects: 0,
  jar: cookieJar,
  withCredentials: true,
  transformResponse: [(data) => {
    return iconv.decode(data, 'EUC-JP');
  }]
});

async function login(loginId, loginPassword) {
  try {
    const loginResponse = await instance.post(LOGIN_URL, qs.stringify({
      login_id: loginId,
      password: loginPassword
    }));

    if (loginResponse.status !== 302) {
      throw new Error('Expected a 302 response but did not receive one.');
    }

    console.log('Login successful.');
    return true;
  } catch (error) {
    if (error.response) {
      if (error.response.status === 302) {
        console.log('Login successful (received a 302 response).');
        return true;
      } else {
        const loginHtml = error.response.data;
        const $ = cheerio.load(loginHtml);
        const errorMessage = $("#login_form > div.block_login_error > p > span.gn_txt_16px.gn_txt_fwb.gn_dp_block.gn_mg_b_10").text();
        console.error('Login failed:', errorMessage);
        return false;
      }
    } else {
      console.error('Login failed:', error.message);
      return false;
    }
  }
}

async function fetchData(loginId, loginPassword, tmplUid) {
  console.log('Attempting to login...');
  if (!await login(loginId, loginPassword)) return;

  // HTMLとCSSがペアになっているテンプレート
  for (let tmplType = 0; tmplType <= 7; tmplType++) {
    const targetUrl = `${BASE_URL}&tmpl_uid=${tmplUid}&tmpl_type=${tmplType}`;
    console.log('Fetching content from:', targetUrl);

    const contentResponse = await instance.get(targetUrl);
    console.log(`Content response status: ${contentResponse.status}`);

    if (contentResponse.status !== 200) {
      console.error('Failed to fetch target content.');
      continue;
    }

    const contentHtml = contentResponse.data;
    const $ = cheerio.load(contentHtml, { decodeEntities: false });

    const textareaHtmlContent = $('textarea#html').text();
    const htmlFileName = `${tmplType}.html`;
    fs.writeFileSync(htmlFileName, textareaHtmlContent, 'utf-8');
    console.log(`Saved content to ${htmlFileName}`);

    const textareaCssContent = $('textarea#css').text();
    const cssFileName = `${tmplType}.css`;
    fs.writeFileSync(cssFileName, textareaCssContent, 'utf-8');
    console.log(`Saved CSS to ${cssFileName}`);
  }

  // CSSのみ
  for (let tmplType = 51; tmplType <= 55; tmplType++) {
    const targetUrl = `${BASE_CSS_URL}&tmpl_uid=${tmplUid}&tmpl_type=${tmplType}`;
    console.log('Fetching CSS content from:', targetUrl);

    const cssResponse = await instance.get(targetUrl);

    if (cssResponse.status !== 200) {
      console.error('Failed to fetch target CSS content.');
      continue;
    }

    const cssContentHtml = cssResponse.data;
    const $ = cheerio.load(cssContentHtml, { decodeEntities: false });
    const textareaCSSContent = $('textarea#css').text();

    const fileName = `${tmplType}.css`;
    fs.writeFileSync(fileName, textareaCSSContent, 'utf-8');
    console.log(`Saved CSS content to ${fileName}`);
  }

  console.log('Program finished.');
}

async function uploadTemplates(loginId, loginPassword, tmplUid) {
  console.log('Attempting to login...');
  if (!await login(loginId, loginPassword)) return;

  console.log('Attempting to upload templates...');

  const targetUrl = `https://admin.shop-pro.jp/?mode=design_tmpl_edt&smode=HTCS&tmpl_uid=${tmplUid}&tmpl_type=0`;
  const pageResponse = await instance.get(targetUrl);

  if (pageResponse.status !== 200) {
    console.error('Failed to fetch the template edit page.');
    return;
  }

  const pageHtml = pageResponse.data;
  const $ = cheerio.load(pageHtml, { decodeEntities: false });

  // POSTデータ取得, 置き換え
  const postData = {};
  $('#design_edit input, #design_edit select, #design_edit textarea').each((i, elem) => {
    const name = $(elem).attr('name');
    if (name) {
      postData[name] = $(elem).val();
    }
  });

  const localHtml = fs.readFileSync('0.html', 'utf-8');
  const localCss = fs.readFileSync('0.css', 'utf-8');

  // EUC-JPへ変換
  const encodedHtml = encoding.convert(localHtml, {
    to: 'EUCJP',
    from: 'UNICODE',
    type: 'array'
  });

  const encodedCss = encoding.convert(localCss, {
    to: 'EUCJP',
    from: 'UNICODE',
    type: 'array'
  });

  postData.html = encoding.urlEncode(encodedHtml);
  postData.css = encoding.urlEncode(encodedCss);

  let postString = Object.keys(postData)
    .filter(key => key !== 'html' && key !== 'css')
    .map(key => `${key}=${encodeURIComponent(postData[key])}`)
    .join('&');

  postString += `&html=${postData.html}&css=${postData.css}`;

  const uploadUrl = 'https://admin.shop-pro.jp/?mode=design_tmpl_edt&smode=HTCS&type=TBLUPD';
  const uploadResponse = await instance.post(uploadUrl, postString, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=EUC-JP'
    }
  });

  if (uploadResponse.status === 200) {
    console.log('Templates uploaded successfully.');
  } else {
    console.error('Failed to upload templates.');
  }
}

module.exports = {
  fetchData,
  uploadTemplates
};
