const puppeteer = require('puppeteer');
const moment = require('moment-timezone');



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
                data.push({
                
                    title:r.getElementsByClassName('newsTitleLink')[0].innerText,
                    ticker:r.getElementsByClassName('ticker fpo_overlay')[0].innerText,
                    time:r.getElementsByClassName('fpo_overlay soloHora')[0].innerText,
                    date:r.getElementsByClassName('fpo_overlay soloHora')[0].querySelector('div').innerText
        
        
                })

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
    extractItems,
    itemTargetCount,
    scrollDelay = 1000,
  ) {
    let items = [];

    var time = moment();
    time.tz('America/New_York').format();
    // var time = now;
    // console.log(now);
    var target = time.subtract(3, "days");
    target.set({h: 4, m: 00});

    dateTime = moment();
    dateTime.tz('America/New_York').format();

    console.log("Time,Target",dateTime,target);

    
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
        await page.waitFor(scrollDelay);
      }
    } catch(e) { }
    return items;
  }





(async () => {
  const browser = await puppeteer.launch({headless: true,dumpio: false});
// const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://thefly.com/news.php');
//   await page.screenshot({path: 'output.png'});
    
    console.log("HERE");

    // page.evaluate(() => console.log('hello', 5));


    const items = await scrapeInfiniteScrollItems(page, getData, 100);

    const [data1,time,date] = await page.evaluate(getData);

    // console.log(time,date)

    console.log(data1);
  await browser.close();

})();