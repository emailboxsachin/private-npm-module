var Two = require('./2.js')
function One(){

}
One.prototype.print = function(){
    var t = new Two()
    t.print()
    console.log('1. print')

}
module.exports = One;