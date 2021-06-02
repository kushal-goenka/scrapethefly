const express = require('express'); // Adding Express
const app = express(); // Initializing Express
const puppeteer = require('puppeteer');
const moment = require('moment-timezone');
const { readFile, writeFile } = require('fs').promises;
// Include custom modules
const sheets = require("./modules/sheets.module");
const fs = require("fs");
const google = require("googleapis").google;


// https://codelabs.developers.google.com/codelabs/cloud-function2sheet#6
function addEmptySheet(sheetsAPI, spreadSheetId,sheetName) {
  return new Promise((resolve, reject) => {
    const emptySheetParams = {
      spreadsheetId: spreadSheetId,
      resource: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
                index: 1,
                gridProperties: {
                  rowCount: 2000,
                  columnCount: 26,
                  frozenRowCount: 1
                }
              }
            }
          }
        ]
      }
    };
    sheetsAPI.spreadsheets.batchUpdate( emptySheetParams, function(err, response) {
        if (err) {
          reject("The Sheets API returned an error: " + err);
        } else {
          const sheetId = response.data.replies[0].addSheet.properties.sheetId;
          console.log("Created empty sheet: " + sheetId);
          resolve(sheetId);
        }
      }
    );
  });
}

function populateAndStyle(sheetsAPI, theData, spreadSheetId,sheetId) {
  return new Promise((resolve, reject) => {
    // Using 'batchUpdate' allows for multiple 'requests' to be sent in a single batch.
    // Populate the sheet referenced by its ID with the data received (a CSV string)
    // Style: set first row font size to 11 and to Bold. Exercise left for the reader: resize columns
    const dataAndStyle = {
      spreadsheetId: spreadSheetId,
      resource: {
        requests: [
          {
            pasteData: {
              coordinate: {
                sheetId: sheetId,
                rowIndex: 0,
                columnIndex: 0
              },
              data: theData,
              delimiter: ","
            }
          },
          {
            repeatCell: {
              range: {
                sheetId: sheetId,
                startRowIndex: 0,
                endRowIndex: 1
              },
              cell: {
                userEnteredFormat: {
                  textFormat: {
                    fontSize: 11,
                    bold: true
                  }
                }
              },
              fields: "userEnteredFormat(textFormat)"
            }
          }       
        ]
      }
    };
        
    sheetsAPI.spreadsheets.batchUpdate(dataAndStyle, function(err, response) {
      if (err) {
        reject("The Sheets API returned an error: " + err);
      } else {
        console.log(sheetId + " sheet populated with " + theData.length + " rows and column style set.");
        resolve();
      }
    });    
  });
}



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
        
    
        console.log(combined);



         // Auth with google
        // await sheets.auth();


        const key = JSON.parse(fs.readFileSync("./keys/key.json").toString());
        // Auth using the key
        const auth = await google.auth.fromJSON(key);
        // Add read / write spreadsheets scope to our auth client
        auth.scopes = ["https://www.googleapis.com/auth/spreadsheets"];
        // Create an instance of sheets to a scoped variable
        const sheetsPromise = await google.sheets({ version: "v4", auth });

        // Update spreadsheet
        // const spreadsheetId = "1iPK3M-PdR3aTxYW13E4ycHZr_cU73STHi6copsLbSxg";

        const spreadsheetId = "1IUTqPEgEsqJ6mBb_BjRPK9npXuNW67quCZ3Fv1P-bMY";
        
        // const values = [[combined[0].title,combined[0].ticker,combined[0].Count]];


        // await sheets.writeToSheet(spreadsheetId, 'abcd', values, 0);


        var sheetName = moment();
        sheetName = sheetName.tz('America/New_York').format("MMM Do YY");
        console.log(sheetName);

        try {
          await addEmptySheet(sheetsPromise,spreadsheetId,sheetName);
        } catch (error) {
          console.log(error);
        }finally{

          // res.send("Success");
        // https://stackoverflow.com/questions/44620930/invalid-value-at-requests0-delete-dimension-range-sheet-id-type-int32
        // https://developers.google.com/sheets/api/guides/concepts#spreadsheet_id

        // https://codelabs.developers.google.com/codelabs/cloud-function2sheet#5
        var request = {
          // The ID of the spreadsheet to update.
          spreadsheetId: spreadsheetId,  // TODO: Update placeholder value.
      
          // The A1 notation of the values to clear.
          range: `${sheetName}!A:K`,  // TODO: Update placeholder value.
      
          resource: {
            // TODO: Add desired properties to the request body.
          },
      
          auth: auth,
        };
        
        // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/clear?apix_params=%7B%22spreadsheetId%22%3A%221iPK3M-PdR3aTxYW13E4ycHZr_cU73STHi6copsLbSxg%22%2C%22range%22%3A%22A%3AK%22%2C%22resource%22%3A%7B%7D%7D
        try {
          const response = (await sheetsPromise.spreadsheets.values.clear(request)).data;
          // TODO: Change code below to process the `response` object:
          console.log(JSON.stringify(response, null, 2));
        } catch (err) {
          console.error(err);
        }

        }

        
        // Get Sheet Details

        request = {
          // The spreadsheet to request.
          spreadsheetId: spreadsheetId,  // TODO: Update placeholder value.
      
          // The ranges to retrieve from the spreadsheet.
          ranges: [],  // TODO: Update placeholder value.
      
          // True if grid data should be returned.
          // This parameter is ignored if a field mask was set in the request.
          includeGridData: false,  // TODO: Update placeholder value.
          fields:"sheets.properties",
          auth: auth,
        };
      
        try {
          var response = (await sheetsPromise.spreadsheets.get(request)).data;
          // TODO: Change code below to process the `response` object:
          
          console.log(JSON.stringify(response, null, 2));
        } catch (err) {
          console.error(err);
        }

        // console.log(response.sheets[0].properties.title);
        
        for(let i in response.sheets){
          console.log(response.sheets[i].properties.title);
          if(response.sheets[i].properties.title==sheetName){
            var sheetIdFound = response.sheets[i].properties.sheetId;
            console.log(sheetIdFound)
          }
          // if(property.properties.title==sheetName){
          //   console.log(property.properties.title);
          //   var sheetIdFound = property.properties.sheetId;
          //   console.log(sheetIdFound);
          // }
          
        }


        await populateAndStyle(sheetsPromise,summaryCSV+"\n"+"\n"+dataCSV,spreadsheetId,sheetIdFound);
        

        

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