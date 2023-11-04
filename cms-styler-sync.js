const program = require('commander');
const readline = require('readline');

const { fetchData, uploadTemplates, fetchTemplate, fetchDefaultTemplateUid } = require('./shopProScraper');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function promptForInput(promptText) {
  return new Promise((resolve) => {
    rl.question(promptText, (answer) => {
      resolve(answer);
    });
  });
}

program
  .version('1.0.0')
  .option('-i, --id <id>', 'Login ID')
  .option('-p, --password <password>', 'Login Password')
  .option('-u, --uid [uid]', 'Template UID')
  .option('--import', 'Import templates from admin.shop-pro.jp')
  .option('--export', 'Export local templates to admin.shop-pro.jp')
  .action(async (options) => {
    if (!options.id) {
      options.id = await promptForInput('Please enter your Login ID: ');
    }
    if (!options.password) {
      options.password = await promptForInput('Please enter your Login Password: ');
    }

    let tmplUid = options.uid;
    if (!tmplUid) {
      console.log('UID not provided. Fetching default template UID...');
      tmplUid = await fetchDefaultTemplateUid(options.id, options.password);
      console.log(`Fetched UID: ${tmplUid}`);
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

    rl.close();
  })
  .parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
