const program = require('commander');
const fs = require('fs');
const readlineSync = require('readline-sync');

const { fetchData, uploadTemplates, fetchTemplate, fetchDefaultTemplateUid } = require('./shopProScraper');

async function promptForInput(promptText) {
  return new Promise((resolve) => {
    rl.question(promptText, (answer) => {
      resolve(answer);
    });
  });
}

async function watchFilesAndUploadOnChange(loginId, loginPassword, tmplUid) {
  console.log('Watching for file changes...');
  let lastUploadTime = 0;
  fs.watch('.', { encoding: 'utf-8' }, (eventType, filename) => {
      if (filename.endsWith('.html') || filename.endsWith('.css')) {
          const currentTime = Date.now();
          if (currentTime - lastUploadTime > 10000) { // 10秒以上経過している場合
              console.log(`File changed: ${filename}. Uploading templates...`);
              uploadTemplates(loginId, loginPassword, tmplUid).then(() => {
                  lastUploadTime = Date.now();
              });
          }
      }
  });
}

program
  .version('1.0.0')
  .option('-i, --id <id>', 'Login ID')
  .option('-p, --password <password>', 'Login Password')
  .option('-u, --uid [uid]', 'Template UID')
  .option('--import', 'Import templates from admin.shop-pro.jp')
  .option('--export', 'Export local templates to admin.shop-pro.jp')
  .option('--watch', 'Watch for local changes and export templates automatically')
  .action(async (options) => {
    if (!options.id) {
      options.id = readlineSync.question('Please enter your Login ID: ');
    }
    if (!options.password) {
      options.password = readlineSync.question('Please enter your Login Password: ', {
        hideEchoBack: true
      });
    }

    let tmplUid = options.uid;
    if (!tmplUid) {
      console.log('UID not provided. Fetching default template UID...');
      tmplUid = await fetchDefaultTemplateUid(options.id, options.password);
      console.log(`Fetched UID: ${tmplUid}`);
    }

    if (options.watch) {
      if (!tmplUid) {
          console.error('Template UID is required for the watch mode.');
          process.exit(1);
      }
      await watchFilesAndUploadOnChange(options.id, options.password, tmplUid);
      return;
    }

    if (options.import) {
      fetchTemplate(options.id, options.password, tmplUid);
    } else if (options.export) {
      uploadTemplates(options.id, options.password, tmplUid);
    } else {
      console.error('Either --import or --export must be specified.');
      program.help();
      process.exit(1);
    }
  });

if (!process.argv.slice(2).length) {
  program.outputHelp();
  process.exit(1);
}

program.parse(process.argv);