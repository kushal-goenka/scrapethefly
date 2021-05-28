// https://intoli.com/blog/scrape-infinite-scroll/


const getData = () => {

    // console.log("Elements");
    // console.log('hello', 5, {foo: 'bar'});

    const data = []

    ele = document.querySelectorAll("[class*=news_table]");

    let time;
    let date;

    for (const e of ele) {

        let row = e.querySelectorAll('tr');
        for (const r of row) {
            // console.log(r);

            try {

                let titleText = r.getElementsByClassName('newsTitleLink')[0].innerText;

                if (titleText.includes("price target raised")) {
                    data.push({

                        title: r.getElementsByClassName('newsTitleLink')[0].innerText,
                        ticker: r.getElementsByClassName('ticker fpo_overlay')[0].innerText,
                        time: r.getElementsByClassName('fpo_overlay soloHora')[0].innerText,
                        date: r.getElementsByClassName('fpo_overlay soloHora')[0].querySelector('div').innerText,
                        raisedFrom: [...titleText.matchAll(/\$(\d+)/g)][1][0],
                        raisedTo: [...titleText.matchAll(/\$(\d+)/g)][0][0]
                    })

                }

                time = r.getElementsByClassName('fpo_overlay soloHora')[0].innerText;
                date = r.getElementsByClassName('fpo_overlay soloHora')[0].querySelector('div').innerText;

            } catch (err) {
                console.log("error");
            }

        }

    }

    return [data, time, date];

};


// Function to return time and date to determine when to stop scrolling down
const checkScroll = () => {

    // https://stackoverflow.com/questions/39223343/shortest-way-to-get-last-element-by-class-name-in-javascript
    // https://stackoverflow.com/questions/35231489/get-the-last-item-from-node-list-without-using-length
    let r = document.querySelectorAll(".news_table:nth-last-of-type(2)")[0].querySelectorAll('tr')[0];
    let time = r.getElementsByClassName('fpo_overlay soloHora')[0].innerText;
    let date = r.getElementsByClassName('fpo_overlay soloHora')[0].querySelector('div').innerText;

    return [time, date];
}

module.exports.getData = getData;
module.exports.checkScroll = checkScroll;