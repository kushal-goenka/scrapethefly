
// https://intoli.com/blog/scrape-infinite-scroll/


module.exports = {
    getData: function(){
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
    
};

