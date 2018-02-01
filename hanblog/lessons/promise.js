var fs = require('fs');
function readFile(filename) {
    /*
    * promise 最初的状态是初始化
    * resolve 表示成功了，就把状态改成成功
    * reject 表示失败了
    * */
    return new Promise(function (resolve,reject) {
        //当创建Promise实例的时候，此函数就开始执行
       fs.readFile(filename,'utf8',function (err,data) {
            if(err){
                reject(err)
            }else{
                resolve(data)
            }
       })
    })
}
//Promise 支持链式调用
readFile('1.txt').then(function (data) {
    console.log(data);
    // return readFile(data)
},function (err) {
    console.log(err)
}).catch(function (err) {  //todo catch的好处是不用再每个链用调用环节加失败的回掉函数

})

//promise的链式调用 在于在回调里返回一个新的promise
readFile('1.txt')
    .then(function (data) {//2.txt
        return readFile(data);
    })
    .then(function (data) { //3.txt
        return readFile(data);
    })
    .then(function (data) {//3
        console.log(data);
    })
    //不管这个链条中有任何一个环节出错了，就会调用catch方法
    .catch(function(error){
        console.log(error);
    });
