const axios = require('axios');
const qs = require('qs');
const cheerio = require('cheerio');
const tough = require('tough-cookie');
const axiosCookieJarSupport = require('axios-cookiejar-support').wrapper;
const fs = require('fs');
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
    return encoding.convert(data, { to: 'UNICODE', from: 'EUCJP', type: 'string' });
  }]
});

const FILE_NAME_MAPPING = {
  0: "common",
  1: "top",
  2: "product_detail",
  3: "product_list",
  4: "trade_act",
  5: "product_search_results",
  6: "option_stock_price",
  7: "privacy_policy",
  51: "inquiry",
  52: "my_account_login",
  53: "tell_a_friend",
  54: "newsletter_subscribe_unsubscribe",
  55: "review"
};

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

async function fetchTemplate(loginId, loginPassword, tmplUid) {
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
    const htmlFileName = `${tmplType}_${FILE_NAME_MAPPING[tmplType]}.html`;
    fs.writeFileSync(htmlFileName, textareaHtmlContent, 'utf-8');
    console.log(`Saved content to ${htmlFileName}`);

    const textareaCssContent = $('textarea#css').text();
    const cssFileName = `${tmplType}_${FILE_NAME_MAPPING[tmplType]}.css`;
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

    const fileName = `${tmplType}_${FILE_NAME_MAPPING[tmplType]}.css`;
    fs.writeFileSync(fileName, textareaCSSContent, 'utf-8');
    console.log(`Saved CSS content to ${fileName}`);
  }

  console.log('Program finished.');
}

async function uploadTemplates(loginId, loginPassword, tmplUid) {
  console.log('Attempting to login...');
  if (!await login(loginId, loginPassword)) return;

  console.log('Attempting to upload templates...');

  // HTMLとCSSがペアになっているテンプレート
  for (let tmplType = 0; tmplType <= 7; tmplType++) {
    const htmlFileName = `${tmplType}_${FILE_NAME_MAPPING[tmplType]}.html`;
    const cssFileName = `${tmplType}_${FILE_NAME_MAPPING[tmplType]}.css`;

    if (!fs.existsSync(htmlFileName) || !fs.existsSync(cssFileName)) {
      console.log(`Skipping upload for ${htmlFileName} and ${cssFileName} as one or both files do not exist.`);
      continue;
    }

    console.log(`Check for ${htmlFileName} and ${cssFileName} `);

    const localHtml = fs.readFileSync(htmlFileName, 'utf-8');
    const localCss = fs.readFileSync(cssFileName, 'utf-8');

    const targetUrl = `${BASE_URL}&tmpl_uid=${tmplUid}&tmpl_type=${tmplType}`;
    const pageResponse = await instance.get(targetUrl);

    if (pageResponse.status !== 200) {
      console.error('Failed to fetch the template edit page.');
      return;
    }

    const pageHtml = pageResponse.data;
    const $ = cheerio.load(pageHtml, { decodeEntities: false });

    const postData = buildPostData($);
    encodeAndSetData(localHtml, localCss, postData);

    const postString = buildPostString(postData);
    const uploadUrl = 'https://admin.shop-pro.jp/?mode=design_tmpl_edt&smode=HTCS&type=TBLUPD';
    const uploadResponse = await instance.post(uploadUrl, postString, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=EUC-JP'
      }
    });

    if (uploadResponse.status === 200) {
      console.log(`Templates for ${htmlFileName} and ${cssFileName} uploaded successfully.`);
    } else {
      console.error(`Failed to upload templates for ${htmlFileName} and ${cssFileName}.`);
    }
  }

  // CSSのみ
  for (let tmplType = 51; tmplType <= 55; tmplType++) {
    const cssFileName = `${tmplType}_${FILE_NAME_MAPPING[tmplType]}.css`;

    if (!fs.existsSync(cssFileName)) {
      console.log(`Skipping upload for ${cssFileName} as the file does not exist.`);
      continue;
    }

    const localCss = fs.readFileSync(cssFileName, 'utf-8');

    const targetUrl = `${BASE_CSS_URL}&tmpl_uid=${tmplUid}&tmpl_type=${tmplType}`;
    const pageResponse = await instance.get(targetUrl);

    if (pageResponse.status !== 200) {
      console.error('Failed to fetch the CSS edit page.');
      return;
    }

    const pageHtml = pageResponse.data;
    const $ = cheerio.load(pageHtml, { decodeEntities: false });

    const postData = buildPostData($);
    encodeAndSetCss(localCss, postData);

    const postString = buildPostString(postData);
    const uploadUrl = 'https://admin.shop-pro.jp/?mode=design_tmpl_edt&smode=HTCS&type=TBLUPD';
    const uploadResponse = await instance.post(uploadUrl, postString, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=EUC-JP'
      }
    });

    if (uploadResponse.status === 200) {
      console.log(`CSS for ${cssFileName} uploaded successfully.`);
    } else {
      console.error(`Failed to upload CSS for ${cssFileName}.`);
    }
  }

  console.log('Templates upload process finished.');
}

function buildPostData($) {
  const postData = {};
  $('#design_edit input, #design_edit select, #design_edit textarea').each((i, elem) => {
    const name = $(elem).attr('name');
    if (name) {
      postData[name] = $(elem).val();
    }
  });
  return postData;
}

function encodeAndSetData(localHtml, localCss, postData) {
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
}

function encodeAndSetCss(localCss, postData) {
  // EUC-JPへ変換
  const encodedCss = encoding.convert(localCss, {
    to: 'EUCJP',
    from: 'UNICODE',
    type: 'array'
  });

  postData.css = encoding.urlEncode(encodedCss);
}

function buildPostString(postData) {
  let postString = Object.keys(postData)
    .filter(key => key !== 'html' && key !== 'css')
    .map(key => `${key}=${encodeURIComponent(postData[key])}`)
    .join('&');

  postString += `&html=${postData.html}&css=${postData.css}`;
  return postString;
}

async function fetchDefaultTemplateUid(loginId, loginPassword) {
  if (!await login(loginId, loginPassword)) {
      console.error('Failed to login for fetching default template UID.');
      return;
  }

  const LIST_URL = 'https://admin.shop-pro.jp/?mode=design_tmpl_lst';
  const response = await instance.get(LIST_URL);

  if (response.status !== 200) {
      console.error('Failed to fetch the templates list.');
      return;
  }

  const html = response.data;
  const $ = cheerio.load(html);
  const link = $('#pt_admin > div.MAIN_center > div > div > div > div.layout-content__main_cont > div.l-page > div.l-page__inner.l-page__inner--sm.u-mar-b-60 > div > div.design-tmpl-lst__tmp-data-text > div.design-tmpl-lst__tmp-data-buttons > a').attr('href');

  const tmplUid = link.match(/tmpl_uid=(\d+)/)[1];
  return tmplUid;
}

module.exports = {
  fetchTemplate,
  uploadTemplates,
  fetchDefaultTemplateUid
};
