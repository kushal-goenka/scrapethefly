const path = require('path');

const puppeteer = require('puppeteer');
const moment = require('moment-timezone');
const { readFile, writeFile } = require('fs').promises;

var eval = require('./eval');


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

console.log(path.dirname(process.execPath));
console.log(puppeteer.executablePath());

function checkScroll(){
  // console.log("Elements");
  // console.log('hello', 5, {foo: 'bar'});
  // https://stackoverflow.com/questions/39223343/shortest-way-to-get-last-element-by-class-name-in-javascript
  // https://stackoverflow.com/questions/35231489/get-the-last-item-from-node-list-without-using-length
  let r = document.querySelectorAll(".news_table:nth-last-of-type(2)")[0].querySelectorAll('tr')[0];
  

  let time = r.getElementsByClassName('fpo_overlay soloHora')[0].innerText;
  let date = r.getElementsByClassName('fpo_overlay soloHora')[0].querySelector('div').innerText;


  return [time,date];
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

    console.log("Time,Target",dateTime,target);

    
    try {
      let previousHeight;
      while (dateTime > target) {
        // console.log("Inside Functin");

        const [time,date] = await page.evaluate(`
        (() => {
          let r = document.querySelectorAll(".news_table:nth-last-of-type(2)")[0].querySelectorAll('tr')[0];
  

          let time = r.getElementsByClassName('fpo_overlay soloHora')[0].innerText;
          let date = r.getElementsByClassName('fpo_overlay soloHora')[0].querySelector('div').innerText;
        
        
          return [time,date];
         })()`);
        
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
      console.log("DOESNT WORK");
      console.log(e); }
  
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
//   await page.screenshot({path: 'output.png'});
    
    // console.log("HERE");

    // page.evaluate(() => console.log('hello', 5));


    const items = await scrapeInfiniteScrollItems(page);

    const [data1,time,date] = await page.evaluate(eval.getData);

    // console.log(time,date)

    // console.log(data1.length);
    console.log(data1);
    console.log(time,date);

    // https://stackoverflow.com/questions/35974976/json-group-by-count-output-to-key-value-pair-json-result

    var occurences = data1.reduce(function (r, row) {
        r[row.ticker] = ++r[row.ticker] || 1;
        // r[row.ticker] = ++r[row.ticker];
        return r;
    }, {});
    // Test
    console.log("Occurences:",occurences);
    
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

    
    // var result = Object.keys(occurences).reduce(function(key) {
    //     if(occurences[key] >= 3){
    //         return { key: key, value: occurences[key] };
    //     } else{
    //         return;
    //     }
    // },[]);

    console.log(result);
    // console.log(result.length);



    // var combined = result.map(x => Object.assign(x, data1.find(y => y.ticker == x.ticker)));

    // console.log(combined);

    // var matches = data1.filter(item =>
    //   filterParams.every(paramItem =>
    //     item[paramItem.param] === paramItem.value));

    var tickers = []
    for(const symbol of result){
      tickers.push(symbol.ticker);
    }

    console.log(tickers);

  //   var combined = result.filter(function(element){
  //     console.log(element.ticker);
  //     if(element.ticker in tickers){
  //         return true;
  //     }
  //     else{
  //         return false;
  //     }

  // }).map(function(element){
  //     return element;
  // });

  var combined = data1.filter(item => tickers.includes(item.ticker));


    // console.log(combined);

  combined = combined.map(x => Object.assign(x, result.find(y => y.ticker == x.ticker)));
  

  combined = combined.sort((a, b) => (a.ticker > b.ticker) ? 1 : -1);
  console.log(combined);


    // console.log(data1);
    const CSV = arrayToCSV(combined);
  	await writeCSV(path.dirname(process.execPath)+"/output.csv", CSV);


  await browser.close();

})();