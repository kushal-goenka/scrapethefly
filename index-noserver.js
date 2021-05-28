const path = require('path');

const puppeteer = require('puppeteer');
const moment = require('moment-timezone');
const { readFile, writeFile } = require('fs').promises;

var eval = require('./eval');


// This is to make the executable work and define the correct chromium location
const isPkg = typeof process.pkg !== 'undefined';

//mac path replace
let chromiumExecutablePath = (isPkg ?
  puppeteer.executablePath().replace(
    /^.*?\/node_modules\/puppeteer\/\.local-chromium/,
    path.join(path.dirname(process.execPath), 'chromium')
  ) :
  puppeteer.executablePath()
);

console.log(process.platform)
//check win32
if (process.platform == 'win32') {
  chromiumExecutablePath = (isPkg ?
    puppeteer.executablePath().replace(
      /^.*?\\node_modules\\puppeteer\\\.local-chromium/,
      path.join(path.dirname(process.execPath), 'chromium')
    ) :
    puppeteer.executablePath()
  );
}

async function scrapeInfiniteScrollItems(
    page
  ) {
    let items = [];

    var time = moment();
    time.tz('America/New_York').format();
    // var time = now;
    // console.log(now);
    var target = time.subtract(1, "days");
    target.set({h: 16, m: 00});

    dateTime = moment();
    dateTime.tz('America/New_York').format();

    console.log("Current Time: ",dateTime);
    console.log("Target Time: ",target)

    
    try {
      let previousHeight;
      while (dateTime > target) {
        // console.log("Inside Functin");

        const [time,date] = await page.evaluate(eval.checkScroll);
        
        console.log("Inside Time:",date,time);
        // console.log(date);
        // var converted = moment.tz(date+' '+time,'America/New_York').format();

        var dateTime = moment.tz(date+' '+time,'MM/DD/YYYY hh:mm','America/New_York');
        // console.log("Moment format",dateTime);

        previousHeight = await page.evaluate('document.body.scrollHeight');

        console.log(previousHeight);
        await page.evaluate('window.scrollTo(0, -document.body.scrollHeight)');
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);

      }
    } catch(e) {
      console.log("Failed While Trying to Infinite Scroll");
      console.log(e); 
    }
  
    return items;
  }


  function arrayToCSV (data) {
    csv = data.map(row => Object.values(row));
    csv.unshift(Object.keys(data[0]));
    return `"${csv.join('"\n"').replace(/,/g, '","')}"`;
  }


  async function writeCSV (fileName, data) {
    try {
        await writeFile(fileName, data, 'utf8'); 
    } catch (err) {
      console.log(err);
      process.exit(1);
    }
  }



  (async () => {
  // const browser = await puppeteer.launch({ executablePath: 'Chromium',headless: true,dumpio: false});
  // const browser = await puppeteer.launch({ executablePath: 'puppeteer/.local-chromium/mac-869685/chrome-mac/Chromium.app/Contents/MacOS/Chromium',headless: true,dumpio: false});
  // const browser = await puppeteer.launch({headless: false,dumpio: false});


            const browser = await puppeteer.launch({
              executablePath: chromiumExecutablePath,
              headless: true
            });


          // const browser = await puppeteer.launch();
            const page = await browser.newPage();
            await page.goto('https://thefly.com/news.php');

            await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36');

            await page.setViewport({width:1366,height:768});

              const items = await scrapeInfiniteScrollItems(page);

              const [data1,time,date] = await page.evaluate(eval.getData);

              // https://stackoverflow.com/questions/35974976/json-group-by-count-output-to-key-value-pair-json-result

              var occurences = data1.reduce(function (r, row) {
                  r[row.ticker] = ++r[row.ticker] || 1;
                  // r[row.ticker] = ++r[row.ticker];
                  return r;
              }, {});
              
              var result = Object.keys(occurences).map(function (key) {
                  if(occurences[key] >= 3){
                      return { ticker: key, Count: occurences[key] };
                  } else{
                      return;
                  }
                  
              });
              
              // https://stackoverflow.com/questions/24806772/how-to-skip-over-an-element-in-map
              result = result.filter(function(element){
                  if(element == null){
                      return false;
                  }
                  else{
                      return true;
                  }

              }).map(function(element){
                  return element;
              });

              var tickers = []
              for(const symbol of result){
                tickers.push(symbol.ticker);
              }

            var combined = data1.filter(item => tickers.includes(item.ticker));

            combined = combined.map(x => Object.assign(x, result.find(y => y.ticker == x.ticker)));
            
            combined = combined.sort((a, b) => (a.ticker > b.ticker) ? 1 : -1);
            
            console.log(combined);

              // console.log(data1);
            const CSV = arrayToCSV(combined);
            if(isPkg){
              await writeCSV(path.dirname(process.execPath)+"/output.csv", CSV);
            } else{
              await writeCSV("output.csv", CSV);
            }
            


            await browser.close();

})();