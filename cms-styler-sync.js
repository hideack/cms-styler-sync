const program = require('commander');
const { fetchData, uploadTemplates } = require('./shopProScraper');

program
  .version('1.0.0')
  .option('-i, --id <id>', 'Login ID')
  .option('-p, --password <password>', 'Login Password')
  .option('-u, --uid <uid>', 'Template UID')
  .option('--import', 'Import templates from admin.shop-pro.jp')
  .option('--export', 'Export local templates to admin.shop-pro.jp')
  .action((options) => {
    if (!options.id || !options.password || !options.uid) {
      console.error('ID, PASSWORD, and UID are all required.');
      program.help();
      process.exit(1);
    }

    if (options.import) {
      fetchData(options.id, options.password, options.uid);
    } else if (options.export) {
      uploadTemplates(options.id, options.password, options.uid);
    } else {
      console.error('Either --import or --export must be specified.');
      program.help();
      process.exit(1);
    }
  })
  .parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
