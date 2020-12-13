const fs = require('fs')
const path = require('path')
const fetch = require('node-fetch');




/*
isocodes = fs.readFileSync('desc.json').toString();
isocodes = JSON.parse(isocodes)
somej = {}
for(let [key, value] of Object.entries(isocodes)){
       somej[key] =  value+' \n '+'https://fawazahmed0.github.io/donate.html'
}
fs.writeFileSync('description.json', JSON.stringify(somej))
*/





    isocodes = fs.readFileSync(path.join('tags','1.json')).toString();
isocodes = JSON.parse(isocodes)


let somejson = {}
for(let filename of fs.readdirSync('tags')){



        jbl = fs.readFileSync(path.join('tags',filename)).toString();
        jbl = JSON.parse(jbl)

       for(const [key,value] of Object.entries(jbl)){
        if(!somejson[key])
         somejson[key]=[]

somejson[key] = somejson[key].concat(value)

       }







}

fs.writeFileSync('tags.json', JSON.stringify(somejson))