var express = require('express');
var auth = require('../middleware/auth');
var markdown = require('markdown').markdown;
//创建一个路由容器
var router = express.Router();
router.get('/add', auth.mustLogin, function (req, res) {
    res.render('article/add', {title: '新增文章', article: {}});
});
router.post('/add', auth.mustLogin, function (req, res) {
    var article = req.body;
    var id = article.id;
    //修改文章
    if (id) {
        Model('Article').update({_id: id}, {
            $set: {
                title: article.title,
                content: article.content
            }
        }).then(function (result) {
            req.flash('success', '文章更新成功')
            res.redirect('/article/detail/' + id);
        })
    } else {
        //新增的时候传递过来的是空字符串 因为主键不能为空
        delete  article._id;

        //从会话对象session中取出userId,赋值文章的发表人字段
        article.user = req.session.user._id;
        Model('Article').create(article, function (err, doc) {
            if (err) {
                req.flash('error', '文章发表失败了');
                res.redirect('back');
            } else {
                req.flash('success', '文章发表成功')
                res.redirect('/')
            }
        })
    }
})

//读取文章列表，并显示到页面中
router.get('/list', auth.mustLogin, function (req, res) {
    // Model('Article').find({}, function (err, docs) {
    //     res.render('article/list',{title:'文章列表',articles:docs})
    // })
    var user = req.query.user;//取得查询字符串中的用户id
    var keyword = req.query.keyword;//取得查询字关键字
    var query = {};
    var pageNum = parseInt(req.query.pageNum || 1); //当前的页码
    var pageSize = parseInt(req.query.pageSize || 3);//每页的条数
    var order = req.query.order;
    if (user) {
        query['user'] = user;
    }
    if (keyword) {
        var filter = new RegExp(keyword);//先写正则
        //或条件，如果title符合正则或者 内容符合正则
        // query["$or"] = [{title: filter, content: filter}];
        query["$or"] = [{title: filter}, {content: filter}];
    }
    //默认情况下按文章的发表顺序倒序排列
    var defaultOrder = {createAt: -1};
    if (order) { // createAt -createAt title -title
        var orderValue = 1;//默认排序顺序
        var orderBy = 'createAt';
        if (order.startsWith('-')) {//表示倒序排列
            orderValue = -1;//表示要倒序
            orderBy = order.slice(1);//去掉-之后就成为真正排序字段名称了
        }
        defaultOrder[orderBy] = orderValue;
    }
    console.log(defaultOrder);
    /*
     Model('Article').find(query).populate('user').exec(function (err, docs) {
     console.log(docs)
     docs.forEach(function (doc) {
     doc.content = markdown.toHTML(doc.content);//把markdown语法的内容转成对应的html内容
     })
     res.render('article/list', {title: '文章列表', articles: docs})
     })
     */
    var count;
    Model('Article')
        .count(query)
        .then(function (result) {//得到符合这个条件的总条数
            count = result;
            return Model('Article')
                .find(query)//按指定的条件过滤
                .sort(defaultOrder)
                .skip((pageNum - 1) * pageSize) //跳过指定的条数
                .limit(pageSize)//限定返回的条数
                .populate('user')//把user属性从ID转成对象
                .exec();//开始真正执行查询，返回一个新promise
        }).then(function (docs) {//docs是当前页的文章列表
        //把markdown源文件转换成html格式的内容
        docs.forEach(function (doc) {
            doc.content = markdown.toHTML(doc.content);
        });
        //docs是所有的文章数组
        res.render('article/list', {
            title: '文章列表',
            articles: docs,//当前页的文章列表
            keyword: keyword,//关键字
            pageNum: pageNum,//当前页
            pageSize: pageSize,//每页多少条
            order: order,
            totalPages: Math.ceil(count / pageSize) //总页数
        });
    }).catch(function (err) {
        req.flash('error', '显示文章列表失败' + err);
        res.redirect('back');
    })
});

//文章详情页
router.get('/detail/:_id', function (req, res) {
    console.log(req.params)
    var articleId = req.params._id;
    // Model('Article').findById(articleId,function (err,doc) {
    //      if(err){
    //          req.flash('error','查询文章详情失败');
    //          req.redirect('back')
    //      }else{
    //          res.render('article/detail',{title:'文章详情',article:doc})
    //      }
    // })
    //写法二
    //todo 解决警告 Mongoose: mpromise (mongodb's default promise library) is deprecated, plug in your own promise library instead: http://mongoosejs.com/docs/promises.html
    //todo
    Model('Article').update({_id:articleId},{$inc:{pv:1}}).then(function () {
        Model('Article').findById(articleId).populate('comments.user').then(function (doc) {
            console.log(doc)
            res.render('article/detail', {title: '文章详情', article: doc})
        }).catch(function (error) {
            req.flash('error', '删除失败');
            res.redirect('back');
        })
    })

})
router.get('/delete/:_id', function (req, res) {
    console.log(req.params)
    var articleId = req.params._id;
    Model('Article').remove({_id: articleId}, function (err) {
        if (err) {
            req.flash('error', '删除失败');
            res.redirect('back');
            return;
        }
        req.flash('success', '删除成功');
        res.redirect('/');
        // res.redirect('/article/list');
    });

});

/*
 * 点击编辑，跳到增加文章的页面，并且回显文章原来的内容
 *
 * */
router.get('/update/:id', function (req, res) {
    var id = req.params.id;
    Model('Article').findById(id).then(function (doc) {
        res.render('article/add', {title: '编辑文章', article: doc})
    })
})

/*评论功能*/
router.post('/comment', function (req, res) {
    var comment = req.body;
    Model('Article').update({_id: comment.articleId},
        //todo $push向数组中推送一条数据
        {$push: {comments: {content: comment.content, user: req.session.user._id}}}
    ).then(function (result) {
        res.redirect('/article/detail/'+comment.articleId);
    },function () {
        res.redirect('back');
    })
})
module.exports = router;