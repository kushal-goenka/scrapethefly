const express = require('express'); // Adding Express
const app = express(); // Initializing Express



const puppeteer = require('puppeteer');
const moment = require('moment-timezone');
const { readFile, writeFile } = require('fs').promises;

// https://intoli.com/blog/scrape-infinite-scroll/
function getData(){
    // console.log("Elements");
    // console.log('hello', 5, {foo: 'bar'});

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
    getData
  ) {
    let items = [];

    var time = moment();
    time.tz('America/New_York').format();
    // var time = now;
    // console.log(now);
    var target = time.subtract(1, "days");
    target.set({h: 4, m: 00});

    dateTime = moment();
    dateTime.tz('America/New_York').format();

    // console.log("Time,Target",dateTime,target);

    
    try {
      let previousHeight;
      while (dateTime > target) {
        // console.log("Inside Functin");

        const [data,time,date] = await page.evaluate(getData);
        
        // console.log("Inside Time:",date,time);
        // console.log(date);
        // var converted = moment.tz(date+' '+time,'America/New_York').format();

        var dateTime = moment.tz(date+' '+time,'MM/DD/YYYY hh:mm','America/New_York');
        // console.log("Moment format",dateTime);

        previousHeight = await page.evaluate('document.body.scrollHeight');
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);
        // await page.waitForTimer(1000);
      }
    } catch(e) { }
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
            const browser = await puppeteer.launch({args: [
              '--no-sandbox',
              '--no--zygote',
              "--single-process",
              "--disable-dev-shm-usage",
            ],headless: true,defaultViewport: null,});
          // const browser = await puppeteer.launch();
            const page = await browser.newPage();
            
            // await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36');

            // await page.setViewport({width:1366,height:768});
      
      try{
        

        await page.goto('https://thefly.com/news.php');
      //   await page.screenshot({path: 'output.png'});
          
          // console.log("HERE");
      
          // page.evaluate(() => console.log('hello', 5));
      
      
          const items = await scrapeInfiniteScrollItems(page, getData);
      
          const [data1,time,date] = await page.evaluate(getData);
      
          // console.log(time,date)
      
          // console.log(data1.length);
      
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
          await writeCSV("output.csv", CSV);
      
      

      
        // https://dev.to/waqasabbasi/building-a-search-engine-api-with-node-express-and-puppeteer-using-google-search-4m21
        // https://dev.to/heyshadowsmith/how-to-make-an-api-from-scraped-data-using-express-puppeteer-2n7e
          

        res.type('text/csv');
        res.attachment('thefly.csv');
        res.send(CSV);



        } catch(e){
          console.log(e);
          console.log("ERROR Occurred Try Catch");
          
        } finally {
          await page.close();
          await browser.close();

        }


      })();



});

// start the server listening for requests
app.listen(process.env.PORT || 3000, 
  () => console.log("Server is running..."));
  

module.exports = {
    app
};