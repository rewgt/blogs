// doc_main.js

if (!window.W) { window.W = new Array(); W.$modules = [];} W.$modules.push( function(require,module,exports) {

var React = require('react');
var ReactDOM = require('react-dom');

var W = require('shadow-widget');
var main = W.$main, utils = W.$utils, ex = W.$ex, idSetter = W.$idSetter;

var nullCateName_ = 'All';

var bDocRepos_ = [];  // [[dCfg,bSort,sDesc,sUrlBase],...]
var renewFromConfig = function(cfg,callback) { };

//---------------
var pinpPlugin = { state:{repo:'',repoDesc:'',category:nullCateName_,doc:null,url:''} };

function location__(href) {
  var location = document.createElement('a');
  location.href = href;
  if (location.host == '')
    location.href = location.href;
  return location;
}

pinpPlugin.instantTool = [ {
  title: 'Share document',
  show: 'on_both',              // on_doc on_list on_both
  icon: 'output/res/share.png', // 20x20
  
  onClick: function(ev) {
    var sTitle,sUrl, sUrl2 = '', state = pinpPlugin.state, doc = state.doc;
    if (doc) {
      sTitle = doc.title || doc.path.split('/').pop(), sPath = doc.path;
      if (sPath.indexOf('md/') == 0) sPath = sPath.slice(3);
      sUrl   = 'index.html?doc=' + encodeURIComponent(sPath);
      sUrl2  = 'index.html?page=' + encodeURIComponent(sPath);
    }
    else {
      sTitle = state.repoDesc || 'Blog';
      if (state.category == nullCateName_)
        sUrl = 'index.html';
      else sUrl = 'index.html?cate=' + encodeURIComponent(state.category);
    }
    sUrl = location__(state.repo + sUrl).href;
    
    var sInfo = 'Title: ' + sTitle + '\n\nURL: ' + sUrl;
    if (sUrl2) sInfo += '\n\nOr: ' + location__(state.repo + sUrl2).href;
    alert(sInfo);
  },
}];

pinpPlugin.menus = [ {
  title: 'Create document',
  onClick: function(ev) {
    utils.popWin.popWindow();
    var frameEle = utils.loadElement(['Iframe', {key:'frame', frameBorder:'0', width:0.9999, height:0.9999,
      src:'output/menu_create.html',  // site=xx&user=xx&token=xx
    }]);
    utils.popWin.showWindow(frameEle,{width:0.8,height:0.9,manualClose:true});
  },
}, {
  title: 'Config documents',
  onClick: function(ev) {
    utils.popWin.popWindow();
    var frameEle = utils.loadElement(['Iframe', {key:'frame', frameBorder:'0', width:0.9999, height:0.9999,
      src:'output/menu_config.html',  // site=xx&user=xx&token=xx
    }]);
    utils.popWin.showWindow(frameEle,{width:0.8,height:0.9,manualClose:true});
  },
}];

pinpPlugin.msgHandle = {
  'configDone': function(msg) {
    var isCancel = msg.param[0], newCfg = msg.param[1]; // newCfg come from config.json
    utils.popWin.popWindow();
    if (newCfg && bDocRepos_.length) {
      if (!isCancel || (bDocRepos_[0][0].last_modify !== newCfg.last_modify)) {
        if (isCancel) alert('The page will reload since global configure is changed by other APP.');
        setTimeout(renewFromConfig,0,newCfg); // try update even pop-window canceled
      }
    }
  },
};

//---------------
var markdown_splitor_ = /<\!-- SLIDE PAGES V[.0-9]+, DO NOT CHANGE THIS LINE. -->/;

var creator = null;

main.$$onLoad.push( function(callback) {  // wait all JS moduls loaded
  if (creator) return callback();  // if !!creator means already initialized
  
  var waitNum = 0;
  waitAndCheck(100);
  
  function isAllLoaded() {
    var s = document.body.getAttribute('data-loading');
    if (typeof s == 'string')
      return parseInt(s) === 0;
    else return true;  // fit no use page_proxy.js
  }
  
  function waitAndCheck(iWait) {
    if (waitNum > 180) {
      console.log('load shadow-widget system timeout');
      return;
    }
    waitNum += 1;
    
    setTimeout( function() {
      if (isAllLoaded())
        setTimeout(ensureLoadDone,100);
      else waitAndCheck();
    },iWait || 500);
  }
  
  function ensureLoadDone() {
    if (W.$modules.length) {
      var iSaved = main.$$onLoad.length;
      while (W.$modules.length) {  // maybe some modules delay-added
        var fn = W.$modules.shift();
        if (typeof fn == 'function')
          fn.call(exports,require,module,exports);
      }
      
      for (var i=iSaved,fn; fn=main.$$onLoad[i]; i++) {
        main.$$onLoading.push(fn); // copy newly added functions
      }
    }
    callback();  // finished
  }
});

//-----
var docEditable_  = false;
var urlParameter_ = null;

var previewComp_  = null;
var instToolComp_ = null;
var listRootComp_ = null;
var toolbarComp_  = null;

var docListComp_  = null;
var repoSelComp_  = null;
var cateListComp_ = null;
var mainMenuComp_ = null;

var lastRepoCate  = nullCateName_;
var lastRepoIndex = -1;

var storageCfg = null;

function tryOpenDoc_(sKeyId) {
  if (!sKeyId || !previewComp_ || !listRootComp_) return;
  
  var items = bDocRepos_[lastRepoIndex];
  if (items) {
    var cfg = items[0];
    var aFile = items[1].find( function(item) { return item.keyId === sKeyId } );
    if (aFile) {
      var sFile = aFile.path.split('/').pop(), repoCfg = items[0], repoBase = items[3];
      var sDocUrl = repoBase + 'index.html?page=' + encodeURIComponent(sFile);
      previewComp_.duals.src = sDocUrl;
      listRootComp_.duals.style = {visibility:'hidden'};
      
      pinpPlugin.state = { repo:repoBase, repoDesc:repoCfg.repos_desc,
        category:lastRepoCate, doc:aFile, url:sDocUrl,
      };
      resetInstBtnShow(true);
    }
  }
}

function resetDocList(showFile) {
  if (!docListComp_ || !repoSelComp_) return;
  
  var idx, node = repoSelComp_.getHtmlNode();
  if (!node || (idx=node.selectedIndex) < 0 || idx >= bDocRepos_.length) return;
  
  var repoCfg = bDocRepos_[idx], docList = repoCfg[1], repoBase = repoCfg[3]; // docList has sorted by name
  repoCfg = repoCfg[0];
  pinpPlugin.state = { repo:repoBase, repoDesc:repoCfg.repos_desc,
    category:lastRepoCate, doc:null, url:'',
  };
  
  var bList;
  if (lastRepoCate == nullCateName_)
    bList = docList;
  else {
    bList = [];
    docList.forEach( function(item) {
      if (item.category == lastRepoCate)
        bList.push(item);
    });
  }
  docListComp_.duals.data = bList;
  
  if (showFile) {
    setTimeout( function() {
      tryOpenDoc_(showFile.keyId);
    },100);
  }
}

function resetInstBtnShow(showDoc) {
  if (!instToolComp_) return;
  
  // var iNum = 0;
  utils.eachComponent(instToolComp_, function(child) {
    var sCss, sShow = child.duals['data-show'];
    if (sShow == 'on_both')
      sCss = 'inline';
    else sCss = !showDoc == (sShow == 'on_list')? 'inline': 'none';
    child.duals.style = {display:sCss};
    // if (sCss == 'inline') iNum += 1;
  });
  // instToolComp_.duals.width = iNum * 20 + 20;
}

var re_abs_url_ = /^\/|http:|https:/;

function listId__(value,oldValue) {
  if (value <= 2) {
    if (value == 1) {
      docListComp_ = this;
      this.defineDual('data');
    }
    else if (value == 0)
      docListComp_ = null;
    return;
  }
  
  var parentWd = this.state.parentWidth, sRepoBase = undefined;
  var ctxWd = parentWd >= 500? 500: (parentWd > 300? 0.9: 270);
  var bList = this.state.data || [];
  var bEle = bList.map( function(item) {
    var sKey = item.keyId, sThumb = item.thumb, sTitle = item.title || sKey;
    if (sThumb) {
      if (sThumb.search(re_abs_url_) != 0) {
        if (sRepoBase === undefined) sRepoBase = getRepoBase();
        sThumb = sRepoBase + sThumb;
      }
    }
    else {
      if (item.markdown)
        sThumb = 'lib/res/pinp_blog.jpg';    // urlBase is ''
      else sThumb = 'lib/res/slideshow.jpg'; // urlBase is ''
    }
    
    var jsonXImg = ['P',{key:'thumb',klass:'self_center-start-end-stretch-default',width:150,height:120}];
    jsonXImg = [jsonXImg,['Img', {key:'img',name:sKey,src:sThumb,
      style:{cursor:'pointer',width:'100%',height:'100%'},
      $onClick: tryOpenDoc,
    }]];
    
    var jsonXCtx = [ ['Panel',{key:'ctx',klass:'self_center-start-end-stretch-default p2-p3-p0-p1',width:-1,height:null,padding:[0,16,0,10],style:{textAlign:'left',color:'#444'}}], // wordBreak:'break-all'
      ['P',{key:'titl',name:sKey,width:0.9999,margin:0,
        $onMouseOver: function(ev) { this.duals.style = {textDecoration:'underline'} },
        $onMouseOut: function(ev) { this.duals.style = {textDecoration:'none'} },
        $onClick: tryOpenDoc,
        style:{cursor:'pointer',fontWeight:'600'},'html.':sTitle},
      ],
    ];
    if (item.desc) {
      item.desc.split('<br>').forEach( function(sHtml,idx) {
        if (sHtml) jsonXCtx.push(['P',{key:'desc'+idx,klass:'small-default-large',width:0.9999,margin:[6,0,0,0],style:{color:'#555'},'html.':sHtml}]);
      });
    }
    var bInfoX = [['P',{key:'info',klass:'small-default-large',width:0.9999,margin:[8,0,2,0],style:{color:'#777'}}]];
    if (docEditable_ && lastRepoIndex == 0)  // only root repo can be editing
      bInfoX.push(['Button',{key:'edit',name:sKey,style:{margin:'0 4px 0 0'},$onClick:docEditClick,'html.':'Edit'}]);
    if (item.category != nullCateName_ && item.category != lastRepoCate) {
      bInfoX.push(['Span',{key:'cate',name:item.category,style:{margin:'0 4px 0 0',padding:'1px 3px',border:'1px solid #faa',borderRadius:'3px',cursor:'default'},
        $onMouseOver: function(ev) { this.duals.style = {backgroundColor:'#fff4f4'} },
        $onMouseOut: function(ev) { this.duals.style = {backgroundColor:''} },
        $onClick: jumpCategory, 'html.':item.category,
      }]);
    }
    bInfoX.push(['Span',{key:'modi','html.':docTimeStr(new Date(item.modify_at)),title:item.path.split('/').pop(),style:{cursor:'default'}}]);
    jsonXCtx.push(bInfoX);
    
    var jsonX = [['Panel',{key:sKey,width:ctxWd,height:null,padding:[6,0,6,0]}],jsonXImg,jsonXCtx];
    return utils.loadElement(jsonX);
  });
  
  var numOfRow = parentWd >= 1000? Math.floor(parentWd/500): 1;
  if (numOfRow >= 2) {
    var iMod = bEle.length % numOfRow;
    while (iMod > 0) {
      iMod -= 1;
      bEle.push(utils.loadElement(['Panel',{key:'_pad'+iMod,width:ctxWd,height:120}]));
    }
  }
  utils.setChildren(this,bEle);
  
  function getRepoBase() {
    var items = bDocRepos_[lastRepoIndex];
    return items? items[3]: '';
  }
  
  function tryOpenDoc(ev) {
    ev.stopPropagation();
    tryOpenDoc_(ev.target.getAttribute('name'));
  }
  
  function docTimeStr(tm) {
    return (tm.getYear() % 100) + '-' + (tm.getMonth() + 1) + '-' + tm.getDate() + ' ' + tm.getHours() + ':' + tm.getMinutes();
  }
  
  function jumpCategory(ev) {
    ev.stopPropagation();
    var sName = ev.target.getAttribute('name');
    if (!sName || sName == lastRepoCate || !cateListComp_) return;
    
    var b = cateListComp_.duals.cates;
    if (b.indexOf(sName) < 0) return;
    
    lastRepoCate = sName;
    resetDocList();
    cateListComp_.reRender();
  }
  
  function docEditClick(ev) {
    ev.stopPropagation();
    var sName = ev.target.getAttribute('name');
    if (!sName) return;
    
    var items = bDocRepos_[lastRepoIndex];
    if (items) {
      var aFile = items[1].find( function(item) { return item.keyId === sName } );
      if (aFile) {
        var sUrl = items[3] + '$proxy.html?url=', sFile = aFile.path.split('/').pop();
        if (aFile.markdown)
          sUrl += 'output%2Fmark_editor.html';
        else sUrl += 'output%2Fpage_editor.html';
        sUrl += '&page=' + encodeURIComponent(sFile);
        window.open(sUrl,'_blank');
      }
    }
  }
}

//----- 
function cateId__(value,oldValue) {
  if (value <= 2) {
    if (value == 1) {
      cateListComp_ = this;
      this.firstShow = true;
      
      this.setEvent( {
        $onClick: function(ev) {
          var targ = ev.target;
          if (targ.nodeName != 'BUTTON') return;
          var sName = targ.getAttribute('name');
          if (!sName) return;
          
          if (listRootComp_) listRootComp_.duals.style = {visibility:'visible'};
          pinpPlugin.state.doc = null;
          pinpPlugin.state.url = '';
          resetInstBtnShow(false);
          
          if (lastRepoCate == sName) return;  // no need re-scan
          lastRepoCate = sName;
          if (storageCfg) storageCfg.setItem('lastCate',sName);
          
          resetDocList();
          this.reRender();  // redraw categories
        },
      });
      
      this.defineDual('cates', function(value,oldValue) {
        var bCate = this.state.cates;
        if (!bCate.length) bCate.push(nullCateName_);
        
        var showFile = null;
        if (this.firstShow) {
          this.firstShow = false;
          
          if (urlParameter_.doc) {
            var sFirstDoc = decodeURIComponent(urlParameter_.doc), b = sFirstDoc.split('/');
            sFirstDoc = b.pop();
            var b2 = sFirstDoc.split('.');
            if (b2.length >= 2) b2.pop();
            b2.push('txt');  // only can open *.txt file
            
            if (b.length == 0) b.push('md');
            b.push(b2.join('.'));
            sFirstDoc = b.join('/');
            
            var aList = bDocRepos_[0][1];
            showFile = aList.find( function(item) {
              return item.path === sFirstDoc;
            });
            if (showFile) lastRepoCate = showFile.category;
          }
          
          if (!showFile) {
            if (urlParameter_.cate)
              lastRepoCate = decodeURIComponent(urlParameter_.cate);
            else if (storageCfg)
              lastRepoCate = storageCfg.getItem('lastCate') || nullCateName_;
          }
        }
        
        if (bCate.indexOf(lastRepoCate) < 0)
          lastRepoCate = bCate[bCate.length-1];
        setTimeout(resetDocList,0,showFile);
      },[nullCateName_]);
    }
    else if (value == 0)
      cateListComp_ = null;
    return;
  }
  
  utils.setChildren(this, this.state.cates.map( function(item,idx) {    
    var prop = { key:'cate'+idx, 'html.':item, name:item,
      style:{color:item==lastRepoCate?'#c00':'#444'},
    };
    return utils.loadElement(['Button',prop]);
  }));
}

//----- 
function adjustOneRepo(cfg,sDesc,sUrlBase) {
  var bSorted = (cfg.doc_list || []).slice(0);
  
  // step 1, add category, sortName, keyId
  bSorted.forEach( function(item) {
    var bSeg = (item.tag || '').split('.'), sPrefix = bSeg[0], sCate = nullCateName_;
    if (bSeg.length >= 2) sCate = bSeg[1];
    
    var sFile = item.path.split('/').pop(), bTmp = sFile.split('.');
    if (bTmp.length > 1) bTmp.pop();
    var sFile2 = bTmp.join('_');
    
    item.category = sCate;
    item.sortName = sPrefix + sFile2;
    item.keyId = sFile2.replace(/-/g,'_');
  });
  
  // step 2, remove hidden item
  for (var i=bSorted.length-1; i >= 0; i--) {
    var item = bSorted[i];
    if (item.hidden) bSorted.splice(i,1);
  }
  
  // step 3, sort it
  bSorted.sort( function(a,b) {
    return a.sortName > b.sortName? -1: 1;  // sort by reversed name
  });
  
  bDocRepos_.push([cfg,bSorted,sDesc,sUrlBase]);
}

var importTaskId_ = 0;

function repoId__(value,oldValue) {
  if (value <= 2) {
    if (value == 1) {
      repoSelComp_ = this;
      this.setEvent( {
        $onChange: function(ev) {
          onRepoChange();
        },
      });
    }
    else if (value == 2) {
      onRepoChange(); // must have one repo (root repo)
      tryImportRepo(bDocRepos_[0][0].imported_repos || []);
    }
    else if (value == 0)
      repoSelComp_ = null;
    return;
  }
  
  var bData = this.state.data || [];
  utils.setChildren(this, bData.map( function(item,idx) {
    var sKey = 'repo_' + idx;
    return utils.loadElement(['Option',{key:sKey,value:sKey,'html.':item}]);
  }));
  
  function tryImportRepo(bRepo) {
    importTaskId_ += 1;
    
    bRepo.forEach( function(item) {  // such as: ["//pinp.github.io/blogs/","Online help"]
      var sUrl = item[0], sDesc = item[1];
      if (!sUrl) return;
      if (sUrl.slice(-1) != '/') sUrl += '/';
      var sBase = sUrl, iTaskId = importTaskId_;
      sUrl += 'config.json';
      
      utils.ajax( { type:'GET', url:sUrl, dataType:'json',
        success: function(data,statusText,xhr) {
          if (importTaskId_ !== iTaskId) return;  // ignore history request
          if (!sDesc) sDesc = data.repos_desc || data.repos_name;
          adjustOneRepo(data,sDesc,sBase);  // sBase must not ''
          setTimeout(updateRepoList,0);
        },
        error: function(xhr,statusText) {
          if (importTaskId_ !== iTaskId) return;  // ignore history request
          console.log('error: load config (' + sUrl + ') failed');
        },
      });
    });
  }
  
  function onRepoChange() {
    var idx, node = repoSelComp_.getHtmlNode();
    if (!node || (idx=node.selectedIndex) < 0) return;
    if (!cateListComp_) return;
    
    if (lastRepoIndex != idx) {  // if lastRepoIndex < 0 means first load
      if (idx >= bDocRepos_.length) return;
      
      var bCate = [nullCateName_], item = bDocRepos_[idx], dCfg = item[0], bList = item[1];
      bList.forEach( function(aFile) {
        if (bCate.indexOf(aFile.category) < 0)
          bCate.unshift(aFile.category);  // recent category is near to right side
      });
      
      lastRepoCate = nullCateName_; // auto choose null-category when changing repo
      lastRepoIndex = idx;
      cateListComp_.duals.cates = bCate;
    }
  }
  
  function updateRepoList() {
    if (!repoSelComp_) return;
    var b = bDocRepos_.map( function(item){return item[2]} );
    repoSelComp_.duals.data = b;
    
    // self repo has no document, and first imported repo has document, auto shift to first imported
    if ( !docEditable_ && lastRepoIndex == 0 && bDocRepos_.length >= 2 &&
         bDocRepos_[0][1].length == 0 && bDocRepos_[1][1].length > 0 ) {
      setTimeout( function() {
        var node = repoSelComp_.getHtmlNode();
        if (!node || node.selectedIndex < 0) return;
        node.selectedIndex = 1;  // not trigger select.onchange()
        onRepoChange();          // trigger by manual
      },300);
    }
  }
}

//----- 
function menuId__(value,oldValue) {
  if (value <= 2) {
    if (value == 1) {
      mainMenuComp_ = this;
      
      var menuWd = 150, menuHi = 8;
      var menuX = [ ['Div',{ key:'menu', klass:'noselect-txt',
        width:menuWd, padding:2, borderWidth:1,
        style:{fontSize:'14px',borderColor:'#eee',borderRadius:'4px',boxShadow:'-2px 8px 4px rgba(0,0,0,0.1)'},
      }]];
      pinpPlugin.menus.forEach( function(item,idx) {
        menuX.push(['P',{key:'menu'+idx, width:0.9999, height:20, margin:0, padding:[0,8,0,8],
          style:{overflow:'hidden',cursor:'default'}, 'html.':item.title,
          $onMouseOver: function(ev) { this.duals.style = {backgroundColor:'blue',color:'#fff'} },
          $onMouseOut: function(ev) { this.duals.style = {backgroundColor:'',color:''} },
          $onClick: item.onClick,
        }]);
        menuHi += 20;
      });
      this.menuBody = utils.loadElement(menuX);
      this.menuFrame = utils.loadElement(['Div',{width:menuWd,height:menuHi}]);
      
      this.setEvent( {
        $onMouseOver: function(ev) {
          this.duals.style = {backgroundColor:'#e4e4e4'};
        },
        $onMouseOut: function(ev) {
          this.duals.style = {backgroundColor:'transparent'};
        },
        $onClick: function(ev) {
          var x = ev.clientX, y = ev.clientY;
          utils.popWin.showWindow(this.menuBody,{ left:x+2, top:y+2,
            width:menuWd, height:menuHi, maskColor:'transparent',
            bodyStyle: {backgroundColor:'#f4f4f4'},
            frame: {left:x+2,top:y+2,width:menuWd,height:menuHi},
            frameElement: this.menuFrame,  // avoid using default frame
          });
        },
      });
    }
    else if (value == 2) {
      setTimeout( function() {
        if (mainMenuComp_ && docEditable_)
          mainMenuComp_.duals.style = {display:'block'};
      },300);
    }
    else if (value == 0)
      mainMenuComp_ = null;
    return;
  }
}

//-----
var renewFromConfig = function(cfg,callback) {
  var bodyComp = W.W('.body').component;
  
  var repoDesc = cfg.repos_desc || cfg.repos_name;
  if (bDocRepos_.length) {
    bDocRepos_.splice(0);  // clear
    lastRepoCate  = nullCateName_;
    lastRepoIndex = -1;
    
    if (!callback && storageCfg)  // !callback means from pop window
      storageCfg.setItem('lastCate',nullCateName_); // try show all, doc list maybe changed
    
    bodyComp.setChild('-doc','-list','-tool', function(changed) {
      toolbarComp_  = null; previewComp_  = null;
      listRootComp_ = null; instToolComp_ = null;
      nextStep();
    });
  }
  else nextStep();
  
  function nextStep() {
    adjustOneRepo(cfg,repoDesc,'');
    
    var jsonX1 = [ ['Panel',{key:'doc',width:0.9999,height:0.9999,klass:'col-reverse',
        style:{backgroundColor:'#fff'},
      }],
      ['Iframe',{key:'preview',frameBorder:0,width:0.9999,height:0.9999,src:''}],
    ];
    var jsonX2 = [ ['Panel',{key:'list',klass:'col-reverse',left:0,top:0,width:0.9999,height:0.9999,borderWidth:[0,0,1,0],style:{position:'absolute'}}],
      ['Panel',{key:'gap',width:0.9999,height:36}],
      ['Panel',{key:'items',width:0.9999,height:-1,klass:'justify_center-end-default auto-hidden-visible',style:{backgroundColor:'#fff'},$id__:listId__}],
    ];
    var jsonX3 = [ ['Panel',{key:'tool',klass:'nowrap-default-wrap_reverse',width:0.9999,height:36,borderWidth:[0,0,1,0],style:{position:'absolute',backgroundColor:'#d8d8d8',borderColor:'#ccc'}}],
      ['Div', {key:'menu', width:40, height:0.9999, title:'Main menu', $id__:menuId__,
        style:{display:'none',background:'url(output/res/menu.png) no-repeat center'},
      }],
      [ ['Panel',{key:'cate',width:-1,height:0.9999}],
        ['P',{key:'list',klass:'right-default-align_center',width:0.9999,margin:[4,0,0,0],$id__:cateId__}],
      ],
      [ ['P',{key:'repo',klass:'align_center-right-default',margin:[4,0,0,0],width:110,height:0.9999}],
        ['Select',{key:'sel','dual-data':[repoDesc],$id__:repoId__}],
      ],
    ];
    
    var bTool = pinpPlugin.instantTool || [];
    if (bTool.length) {
      var bToolX = bTool.map( function(item,idx) {
        return ['Img',{key:'tool'+idx, src:item.icon, title:item.title || '',
          style: {width:'20px',height:'20px'}, 'data-show': item.show || 'on_both',
          $onClick: item.onClick,
          $onMouseOver: function(ev) { this.duals.style = {opacity:'0.5'}; },
          $onMouseOut: function(ev) { this.duals.style = {opacity:'1'}; },
        }];
      });
      bToolX.unshift(['P',{key:'inst',klass:'align_center-right-default',width:bTool.length*20+20,height:0.9999}]);
      jsonX3.splice(3,0,bToolX);
    }
    
    bodyComp.setChild(utils.loadElement(jsonX1),utils.loadElement(jsonX2),utils.loadElement(jsonX3), function(changed) {
      toolbarComp_  = bodyComp.componentOf('tool');
      previewComp_  = bodyComp.componentOf('doc.preview');
      listRootComp_ = bodyComp.componentOf('list');
      
      if (bTool.length) {
        instToolComp_ = toolbarComp_.componentOf('inst');
        resetInstBtnShow(false);  // show list
      }  // else, instToolComp_ is null
      
      if (callback) callback();
    });
  }
};

function showDocList(locOpt,urlOpt,callback) {  // for index.html
  var storageId_ = 'pinp/blogs/cfg';
  function storageCfg_() {
    this.config  = {};
    if (window.localStorage) {
      this.canSave = true;
      var s = localStorage.getItem(storageId_);
      if (s) {
        try {
          this.config = JSON.parse(s);
        }
        catch(e) { }
      }
    }
    else this.canSave = false;
  }
  storageCfg_.prototype = {
    setItem: function(sKey,value) {  // value can be any json-able value
      this.config[sKey] = value;
      if (this.canSave)
        localStorage.setItem(storageId_,JSON.stringify(this.config));
    },
    getItem: function(sKey) {
      return this.config[sKey];
    },
  };
  
  storageCfg = new storageCfg_();
  
  docEditable_  = locOpt.isLocal;
  urlParameter_ = urlOpt;
  
  utils.ajax( { type:'GET', url:'config.json', dataType:'json',
    success: function(data,statusText,xhr) {
      renewFromConfig(data,callback);
    },
    
    error: function(xhr,statusText) {
      var sMsg = 'error: load config.json failed';
      console.log(sMsg);
      alert(sMsg);
      if (callback) callback();
    },
  });
}

var oldScrollTop = 0;

function onWinMessage(msg) {
  try {
    if (typeof msg == 'object' && msg.data) {
      msg = msg.data;
      msg = JSON.parse(msg.slice(14)); // remove prefix '[PROJECT_NAME]'
    }
    else msg = null;
  }
  catch(e) {
    msg = null;
    console.log(e);
  }
  
  if (typeof msg == 'object') {
    var fn;
    if (msg.method == 'markScroll') {
      if (toolbarComp_) {
        var scrollTop = msg.param[0];
        var sCss = scrollTop <= 6? 'flex': (oldScrollTop < scrollTop?'none':'flex');
        oldScrollTop = scrollTop;
        toolbarComp_.duals.style = {display:sCss};
      }
    }
    else if (msg.method == 'enterPage') {
      if (toolbarComp_) {
        var iCurr = msg.param[0]; // sKey = msg.param[1], isFirstEnter = msg.param[2];
        toolbarComp_.duals.style = {display:iCurr==0?'flex':'none'};
      }
    }
    else if (fn=pinpPlugin.msgHandle[msg.method]) {
      fn(msg);
    }
    // else, ignore other msg.method
  }
}

main.$$onLoad.push( function(callback) {
  if (creator || W.__design__) return callback();
  creator = W.$creator;
  
  window.addEventListener('message',onWinMessage,false);
  
  var opt = locationInfo(window.location);
  var urlOpt = getUrlParam(window.location.search.slice(1));
  if (urlOpt.page) opt.fileName = decodeURIComponent(urlOpt.page);
  
  if (opt.fileName != 'index.html')
    return directOpenFile();
  else return showDocList(opt,urlOpt,callback); // opt.fileName == 'index.html'
  
  function locationInfo(loc) {
    return { isFile: loc.protocol == 'file:',
      isLocal: (loc.hostname == 'localhost' || loc.hostname == '127.0.0.1'),
      fileName: loc.pathname.split('/').pop() || 'index.html',
    };
  }
  
  function getUrlParam(s) {
    var dRet = {}, b = s.split('&');
    b.forEach( function(item) {
      if (!item) return;
      var b2 = item.split('='), sName = b2[0].trim();
      if (sName)
        dRet[sName] = (b2[1] || '').trim();
    });
    return dRet;
  }
  
  function loadMdTxtFile(opt,callback) {
    var b = opt.fileName.split('/'), sFile_ = b.pop();
    if (b.length == 0) b.push('md');
    
    var b2 = sFile_.split('.');
    if (b2.length >= 2) b2.pop();
    b2.push('txt');
    b.push(b2.join('.'));
    var sUrl = b.join('/');
    
    utils.ajax( { type:'GET', url:sUrl, dataType:'text',
      success: function(data,statusText,xhr) {
        var sMarked, sPages = '', b = data.split(markdown_splitor_);
        if (b.length >= 2) {
          if (b.length > 2) console.log('warning: PINP document format error!');
          sMarked = b[0];
          sPages = b[1].trim();
        }
        else sMarked = data;
        callback(true,sMarked,sPages);
      },
      error: function(xhr,statusText) {
        var sMsg = 'error: load ' + sUrl + ' failed';
        console.log(sMsg);
        alert(sMsg);
        callback(false,'','');
      },
    });
  }
  
  function scanScenePage(gui,node,wtcCls,idx) {
    var bInfo = creator.scanNodeAttr(node,'',0);
    if (!bInfo || bInfo[0] !== 'ScenePage') return null;  // ignore
    
    var dProp = bInfo[1], sKey = dProp.key;
    if (!sKey || typeof sKey != 'string')
      sKey = 'auto' + (gui.comps.length + gui.removeNum + idx);
    dProp['keyid.'] = dProp.key = sKey;
    
    var saved = W.$staticNodes.length;
    var bChild = creator.scanPreCode(node,'ScenePage[' + idx + ']',true);
    if (W.$staticNodes.length > saved) dProp['hasStatic.'] = true;
    
    bChild.unshift(wtcCls,dProp);
    return React.createElement.apply(null,bChild);
  }
  
  function directOpenFile() {
    var mainMarkComp = null;
    var isSubWindow  = window.parent.window && window.parent.window !== window;
    
    loadMdTxtFile(opt, function(succ,sMark,sPages) {
      if (!succ) return callback();   // load file failed
      
      var sTitle = tryGetTitle(sMark+'\n'+sPages);
      if (sTitle) document.title = sTitle;
      
      var bodyComp = W.W('.body').component; // body node must exists
      var bPage = [];
      if (sPages) {
        var clsSet = utils.getWTC('ScenePage'), wtcCls = clsSet.ScenePage; // must exists
        var sFirstKey = '', bVisible = [], nodes = document.createElement('div');
        nodes.innerHTML = sPages;
        for (var i=0,node; node = nodes.children[i]; i++) {
          if (node.nodeName == 'DIV') {
            var ele = scanScenePage(bodyComp.$gui,node,wtcCls,bPage.length);
            if (ele) {
              var sKey_ = (ele.props['keyid.'] || '') + '';
              if (!ele.props.noShow && sKey_) bVisible.push(sKey_);
              if (bPage.length == 0)
                sFirstKey = sKey_;
              bPage.push(ele);
            }
          }
        }
        
        if (bPage.length) {
          if (!sFirstKey || bVisible.length == 0)  // fatal error, next will direct show markdown
            bPage = [];
          else {
            if (isSubWindow && bVisible.length > 0) {
              document.body.addEventListener('slideenter', function(ev) {
                var sKey = ev.pageKey, iCurr = ev.pageIndex, isFirst = utils.pageCtrl.isFirstEnter(ev.target);
                var sCmd = '[PROJECT_NAME]' + JSON.stringify({method:'enterPage',param:[iCurr,sKey,isFirst]});
                window.parent.window.postMessage(sCmd,'*');
              },false);
            }
            
            bPage.push( function(changed) {   // define callback for setChild()
              var firstPg = null;
              if (bVisible[0] == sFirstKey) {
                firstPg = bodyComp.componentOf(sFirstKey);
                var hasMarkdown = sMark && (sMark.length > 24 || sMark.trim());
                if (firstPg && hasMarkdown) { // ignore empty markdown (avoid replacing content of first page)
                  var mdComp = firstPg.componentOf('marked_doc');
                  if (!mdComp) {
                    var props = { key:'marked_doc', klass:'auto-hidden-visible',
                      padding:[24,6,6,6], margin:0,
                      left:-0.5, top:-0.5, width:0.9999, height:0.9999,
                    };
                    if (isSubWindow) {
                      props.$onScroll = function(ev) {
                        var sCmd = '[PROJECT_NAME]' + JSON.stringify({method:'markScroll',param:[ev.target.scrollTop]});
                        window.parent.window.postMessage(sCmd,'*');
                      };
                    }
                    firstPg.setChild(utils.loadElement(['MarkedDiv',props]), function(changed) {
                      mdComp = firstPg.componentOf('marked_doc');
                      if (mdComp) assignMark(mdComp,sMark);
                      main.$$onLoading.push(setSlideCfg);
                      callback();
                    });
                  }
                  else {
                    if (mdComp.props['marked.'])
                      assignMark(mdComp,sMark);
                    else console.log('error: marked_doc should be MarkedDiv'); // fatal error
                    main.$$onLoading.push(setSlideCfg);
                    callback();
                  }
                  return;
                }
              }
              
              main.$$onLoading.push(setSlideCfg);
              callback();
              
              function assignMark(mdComp,sMark) {
                mainMarkComp = mdComp;
                setTimeout( function() {
                  mdComp.duals['html.'] = sMark;  // others, ignore sMark
                },300);  // prepare ScenePage first (some widgets maybe delay)
              }
              
              function setSlideCfg(callback2) {
                var bPgList = [];
                bVisible.forEach( function(item) {
                  var childComp = bodyComp.componentOf(item);
                  if (childComp) bPgList.push([item,childComp]);
                });
                
                if (utils.pageCtrl) utils.pageCtrl.destory();
                utils.pageCtrl = new creator.pageCtrl_(bPgList);
                if (mainMarkComp && bPgList.length == 1) {
                  utils.pageCtrl.config = { size:'0x0', noSidebar:1,
                    noKeypress:1, noFrame:1, noTrans:1,
                  };
                  bodyComp.listen('innerSize', function(value,oldValue) {
                    if (!firstPg.isHooked) return;  // firstPg must be available
                    firstPg.duals.width = value[0];
                    firstPg.duals.height = value[1];
                  });
                }
                
                callback2();
              }
            });
            
            bodyComp.setChild.apply(bodyComp,bPage);
            return;
          }
        }
      }
      
      var ele = utils.loadElement(['MarkedDiv', { key:'marked_doc',
        width:0.9999, height:0.9999, margin:0, padding:[24,6,6,6],
        klass:'auto-hidden-visible', style:{backgroundColor:'#fff'},
      }]);
      bodyComp.setChild(ele, function(changed) {
        var child = bodyComp.componentOf('marked_doc');
        if (child) child.duals['html.'] = sMark;
      });
      callback();
    });
    
    if (urlOpt.page) { // has pass 'page=xx' in URL
      window.addEventListener('message', function(msg) {
        try {
          if (typeof msg == 'object' && msg.data) {
            msg = msg.data;
            msg = JSON.parse(msg.slice(14)); // remove prefix '[PROJECT_NAME]'
          }
          else msg = null;
        }
        catch(e) {
          msg = null;
          console.log(e);
        }
        
        if (typeof msg == 'object') {
          if (msg.method == 'updateMark') {
            var sMarkTxt = msg.param[0];
            if (mainMarkComp && typeof sMarkTxt == 'string') {
              var oldTop = -1, oldIsBtm = false, markNode = mainMarkComp.getHtmlNode();
              if (markNode) {
                oldTop = markNode.scrollTop;
                if (oldTop > 6 && oldTop + markNode.clientHeight >= markNode.scrollHeight - 20)
                  oldIsBtm = true;
              }
              
              mainMarkComp.duals['html.'] = sMarkTxt;
              if (oldTop > 10) { // must exists markNode
                setTimeout( function() {
                  if (oldIsBtm)
                    markNode.scrollTop = Math.max(0,markNode.scrollHeight - markNode.clientHeight);
                  else markNode.scrollTop = oldTop;
                },800);
              }
            }
          }
          // else, ignore other msg.method
        }
      });
    }
    
    function tryGetTitle(sText) {
      var re_title = /\$=['"]\.pinp\.doc_info\.title["']/m;
      var m = re_title.exec(sText), sTitle = '';
      if (m) {
        var iPos2, iPos = sText.indexOf('>',m.index);
        if (iPos > 0 && (iPos2=sText.indexOf('<',iPos)) > 0)
          return sText.slice(iPos+1,iPos2).trim();
      }
      return '';
    }
  }
});

});
