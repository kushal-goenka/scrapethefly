const path = require('path');

const puppeteer = require('puppeteer');
const moment = require('moment-timezone');
const {
  writeFile,
  appendFile
} = require('fs').promises;


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
  page,
  targetHour = 16,
  targetMinute = 00,
  targetDaysBehind = 1
) {
  let items = [];

  var time = moment();
  time.tz('America/New_York').format();
  // var time = now;
  // console.log(now);
  var target = time.subtract(targetDaysBehind, "days");
  target.set({
    h: targetHour,
    m: targetMinute
  });

  dateTime = moment();
  dateTime.tz('America/New_York').format();

  console.log("Current Time: ", dateTime);
  console.log("Target Time: ", target)


  try {
    let previousHeight;
    while (dateTime > target) {
      // console.log("Inside Functin");

      const [time, date] = await page.evaluate(eval.checkScroll);

      console.log("Current Latest Time Reached:", date, time);

      var dateTime = moment.tz(date + ' ' + time, 'MM/DD/YYYY hh:mm', 'America/New_York');

      previousHeight = await page.evaluate('document.body.scrollHeight');
      await page.evaluate('window.scrollTo(0, -document.body.scrollHeight)');
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);

    }
  } catch (e) {
    console.log("Failed While Trying to Infinite Scroll");
    console.log(e);
  }

  return items;
}


function arrayToCSV(data) {
  csv = data.map(row => Object.values(row));
  csv.unshift(Object.keys(data[0]));
  return `"${csv.join('"\n"').replace(/,/g, '","')}"`;
}

async function writeCSV(fileName, data1,data2) {
  try {
    await writeFile(fileName, data1, 'utf8');
    await appendFile(fileName, "\n", 'utf8');
    await appendFile(fileName, "\n", 'utf8');
    await appendFile(fileName, data2, 'utf8');
    
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
}


(async () => {

  const browser = await puppeteer.launch({
    executablePath: chromiumExecutablePath,
    headless: true
  });

  // const browser = await puppeteer.launch();
  const page = await browser.newPage();

  try {

    const targetHour = 16, targetMinute = 00, targetDaysBehind = 1,minOccurrences = 3;

    await page.goto('https://thefly.com/news.php');

    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36');

    await page.setViewport({
      width: 1366,
      height: 768
    });

    const items = await scrapeInfiniteScrollItems(page,targetHour,targetMinute,targetDaysBehind);

    const [data1, time, date] = await page.evaluate(eval.getData);

    // https://stackoverflow.com/questions/35974976/json-group-by-count-output-to-key-value-pair-json-result

    // Count the number of occurences of a particular ticker
    var occurences = data1.reduce(function (r, row) {
      r[row.ticker] = ++r[row.ticker] || 1;
      return r;
    }, {});

    // Filter out the occurrences that are less than the minOccurrences number
    var result = Object.keys(occurences).map(function (key) {
      if (occurences[key] >= minOccurrences) {
        return {
          ticker: key,
          Count: occurences[key]
        };
      } else {
        return;
      }
    });

    // https://stackoverflow.com/questions/24806772/how-to-skip-over-an-element-in-map
    // Above block returns null values for dont-care tickers, we filter these out and return the ones that are not null
    result = result.filter(function (element) {
      if (element == null) {
        return false;
      } else {
        return true;
      }
    }).map(function (element) {
      return element;
    });

    console.log("result:",result);

    // get a list of tickers we're interested in
    var tickers = []
    for (const symbol of result) {
      tickers.push(symbol.ticker);
    }

    // use the list of tickers we are intersted in to filter out the irrelevant tickers from the ORIGINAL data (Because we want other data)
    var combined = data1.filter(item => tickers.includes(item.ticker));

    // Assign the number of occurrences to every data element
    combined = combined.map(x => Object.assign(x, result.find(y => y.ticker == x.ticker)));
    // Sort by ticker

    // combined = combined.sort((a, b) => (a.ticker > b.ticker) ? 1 : -1);


        // generic comparison function
    cmp = function(x, y){
      return x > y ? 1 : x < y ? -1 : 0; 
    };

    //sort by count and then by ticker symbol
    combined.sort(function(a, b){
      //note the minus before -cmp, for descending order
      return cmp( 
          [-cmp(a.Count, b.Count), cmp(a.ticker, b.ticker)], 
          [-cmp(b.Count, a.Count), cmp(b.ticker, a.ticker)]
      );
    });

    result.sort(function(a,b){
        return -cmp(a.Count,b.Count)
    });

    console.log(combined);

    const summaryCSV = arrayToCSV(result);
    const dataCSV = arrayToCSV(combined);
    

    if (isPkg) {
      await writeCSV(path.dirname(process.execPath) + "/output.csv", summaryCSV,dataCSV);
    } else {
      await writeCSV("output.csv", summaryCSV,dataCSV);
    }

  } catch (e) {

    console.log(e);
    console.log("Error Occurred When trying to process the data");
  } finally {
    await page.close();
    await browser.close();

  }

})();