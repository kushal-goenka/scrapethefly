
let ele = document.querySelector("[class*=news_table]").querySelectorAll('tr')[1];

// Title

ele.getElementsByClassName('newsTitleLink')[0].innerText;


//  Ticker
ele.getElementsByClassName('ticker fpo_overlay')[0].innerText;


// time

ele.getElementsByClassName('fpo_overlay soloHora')[0].innerText;

// date

ele.getElementsByClassName('fpo_overlay soloHora')[0].querySelector('div').innerText;



const data = []

ele = document.querySelectorAll("[class*=news_table]");


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
          }
          catch(err) {
            console.log("error");
          }

        


    
    }
    
}