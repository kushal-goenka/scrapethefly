const express = require('express'); // Adding Express
const app = express(); // Initializing Express
const puppeteer = require('puppeteer');
const moment = require('moment-timezone');
const { readFile, writeFile } = require('fs').promises;

function checkScroll(){

  // https://stackoverflow.com/questions/39223343/shortest-way-to-get-last-element-by-class-name-in-javascript
  // https://stackoverflow.com/questions/35231489/get-the-last-item-from-node-list-without-using-length
  let r = document.querySelectorAll(".news_table:nth-last-of-type(2)")[0].querySelectorAll('tr')[0];
  let time = r.getElementsByClassName('fpo_overlay soloHora')[0].innerText;
  let date = r.getElementsByClassName('fpo_overlay soloHora')[0].querySelector('div').innerText;


  return [time,date];
}

// https://intoli.com/blog/scrape-infinite-scroll/
function getData(){

    const data = []

    ele = document.querySelectorAll("[class*=news_table]");
    
    let time;
    let date;
    
    for(const e of ele){
    
        let row = e.querySelectorAll('tr');
        for(const r of row){
            // console.log(r);
    
            try {

                let titleText = r.getElementsByClassName('newsTitleLink')[0].innerText;

                if(titleText.includes("price target raised")){
                    data.push({
                        
                        title:r.getElementsByClassName('newsTitleLink')[0].innerText,
                        ticker:r.getElementsByClassName('ticker fpo_overlay')[0].innerText,
                        time:r.getElementsByClassName('fpo_overlay soloHora')[0].innerText,
                        date:r.getElementsByClassName('fpo_overlay soloHora')[0].querySelector('div').innerText,
                        raisedFrom:[...titleText.matchAll(/\$(\d+)/g)][1][0],
                        raisedTo:[...titleText.matchAll(/\$(\d+)/g)][0][0]
                        
            
                    })

                }

                time = r.getElementsByClassName('fpo_overlay soloHora')[0].innerText;
                date = r.getElementsByClassName('fpo_overlay soloHora')[0].querySelector('div').innerText;

              }
              catch(err) {
                console.log("error");
              }
    
        }
        
    }

    return [data,time,date];
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

      const [time, date] = await page.evaluate(checkScroll);

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

  app.get('/get_csv', function(req, res) {
    // Sending 'Test' back to Postman
    // https://stackoverflow.com/questions/63199136/sending-csv-back-with-express
    console.log("Called the url");

    (async () => {
            //   const browser = await puppeteer.launch({ executablePath: 'puppeteer/.local-chromium/mac-869685/chrome-mac/Chromium.app/Contents/MacOS/Chromium',headless: true,dumpio: false});
            // const browser = await puppeteer.launch({args: [
            //   '--no-sandbox'
            // ],headless: true,defaultViewport: null,});


            const browser = await puppeteer.launch({args: ["--disable-gpu",
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--no-first-run",
            "--no-zygote",
            "--single-process",
            ],headless: true, timeout: 90000,});


          // const browser = await puppeteer.launch();
            const page = await browser.newPage();
            // page.setDefaultNavigationTimeout(0);
      
      try{
        

        const targetHour = 16, targetMinute = 00, targetDaysBehind = 1,minOccurrences = 3;

        await page.goto('https://thefly.com/news.php',{timeout:0});
    
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36');
    
        await page.setViewport({
          width: 1366,
          height: 768
        });
    
        const items = await scrapeInfiniteScrollItems(page,targetHour,targetMinute,targetDaysBehind);
    
        const [data1, time, date] = await page.evaluate(getData);
    
        // https://stackoverflow.com/questions/35974976/json-group-by-count-output-to-key-value-pair-json-result
    
        // Count the number of occurences of a particular ticker
        var occurences = data1.reduce(function (r, row) {
          r[row.ticker] = ++r[row.ticker] || 1;
          return r;
        }, {});
    
    
    
        // const res = Array.from(data1.reduce(
        //   (m, {ticker, Count}) => m.set(ticker, (m.get(ticker) || 0) + Count), new Map
        // ), ([ticker, Count]) => ({ticker, Count}));
        // console.log("RES:",res);
    
    
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
    
        
        // get a list of tickers we're interested in
        var tickers = []
        for (const symbol of result) {
          tickers.push(symbol.ticker);
        }
        // console.log(result);
    
        // use the list of tickers we are intersted in to filter out the irrelevant tickers from the ORIGINAL data (Because we want other data)
        var combined = data1.filter(item => tickers.includes(item.ticker));
    
    
        var averageValueFrom = combined.reduce(function (r, row) {  
          r[row.ticker] = (r[row.ticker] + parseFloat(row.raisedFrom.substring(1,))) || parseFloat(row.raisedFrom.substring(1,));
          return r;
        }, {});
        var averageValueTo = combined.reduce(function (r, row) {
          r[row.ticker] = (r[row.ticker] + parseFloat(row.raisedTo.substring(1,))) || parseFloat(row.raisedTo.substring(1,));
          return r;
        }, {});
    
    
        for (const symbol of result) {
          symbol["averageFrom"] = (averageValueFrom[symbol.ticker]/symbol.Count).toFixed(2) ;
          symbol["averageTo"] = (averageValueTo[symbol.ticker]/symbol.Count).toFixed(2) ;
    
        }
        // console.log("AFTER ADDING:",result);
    
    
        // console.log(averageValueFrom);
    
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
    
        // console.log(combined);
    
        const summaryCSV = arrayToCSV(result);
        const dataCSV = arrayToCSV(combined);
        
    

        res.type('text/csv');
        res.attachment('thefly.csv');
        res.send(summaryCSV+"\n"+dataCSV);



        } catch(e){
          console.log(e);
          console.log("ERROR Occurred Try Catch");
        } finally {
          await page.close();
          await browser.close();

        }


      })();



});

app.get('/test', function(req, res) {
  res.send("Hello");

})

// start the server listening for requests
app.listen(process.env.PORT || 3000, () => {
  console.log(`Example app listening at http://localhost:3000`)
})

// https://itnext.io/google-cloud-functions-node-js-and-express-aea4a2a9ba3a

module.exports = {
  app
};


// https://rominirani.com/using-puppeteer-in-google-cloud-functions-809a14856e14
// gcloud functions deploy scrapethefly --runtime nodejs10 --trigger-http --entry-point app --memory=1024MB


// VERY USEFUL


// https://github.com/vercel/pkg/issues/204#issuecomment-378929002