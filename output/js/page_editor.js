// edit_page.js

( function(node) {
  if (node) {
    node.setAttribute("__design__","1"); 
    node.setAttribute("__debug__","1");
  }
})(document.getElementById("react-container"));

if (!window.W) { window.W = new Array(); W.$modules = [];} W.$modules.push( function(require,module,exports) {

var React = require('react');
var ReactDOM = require('react-dom');

var W = require('shadow-widget');
var main = W.$main, utils = W.$utils, ex = W.$ex, idSetter = W.$idSetter;

var markdown_splitor_ = /<\!-- SLIDE PAGES V[.0-9]+, DO NOT CHANGE THIS LINE\. -->/;

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

// urlConfig is {url,page,user,site,token}
var urlConfig = getUrlParam(window.location.search.slice(1));
var pageUrl = decodeURIComponent(urlConfig.page || '');

var creator = null;

var Git = null, userObj = null, braObj = null;
var repoName = '', sourSha = '';

function loadSourText_(sPage,callback) {
  var fileObj = braObj.fileOf(sPage);
  fileObj.readRaw( function(err,sRaw) {
    if (err) return callback(err);
    sourSha = fileObj.sha || '';
    callback(null,sRaw);
  });
}

function saveSourText_(sPage,sText,iSepPos,callback) {
  if (userObj.isLocal) { // simple overwrite, not use fileObj.sha
    braObj.fileOf(sPage).putContent(sText, function(err,bOut) {
      if (err) return callback(err);
      var fileObj = bOut[0];
      callback(null,fileObj);
    });
  }
  else {
    var fileObj = braObj.fileOf(sPage);
    fileObj.sha = sourSha;
    fileObj.putContent(sText, function(err,bOut) {
      if (err) {
        fileObj.fetchContent( function(err2,fileObj2) {
          if (err2) return callback(err);
          
          if (fileObj2.sha !== fileObj.sha) {
            if (!window.confirm('file has been modified by other editor, continue saving?'))
              return callback('ABORT');
            
            var sHtml = sText.slice(iSepPos);
            var sNewRaw = utils.Base64.decode(fileObj2.content).replace(/\r\n/g,'\n');
            var mdNew,spNew, m = markdown_splitor_.exec(sNewRaw);
            if (m) {
              mdNew = sNewRaw.slice(0,m.index);
              spNew = m[0];
            }
            else {
              mdNew = sNewRaw;
              spNew = slideSplitor;
            }
            
            var sText2 = mdNew;
            if (sText2 && sText2.slice(-1) != '\n') sText2 += '\n';
            sText2 += spNew;
            if (sHtml[0] != '\n') sText2 += '\n';
            sText2 += sHtml;
            
            fileObj.sha = fileObj2.sha;
            fileObj.putContent(sText2, function(err3,bOut) {
              if (err3) return callback(err3);
              
              var fileObj3 = bOut[0];
              sourSha = fileObj3.sha || '';
              markdownOfSour = mdNew;   // update from re-read file
              slideSplitor = spNew;     // update from re-read file
              callback(null,fileObj3);
            });
          }
          else {  // try again
            fileObj.putContent(sText, function(err4,bOut) {
              if (err4) return callback(err4);
              var fileObj3 = bOut[0];
              sourSha = fileObj3.sha || '';
              callback(null,fileObj3);
            });
          }
        });
        return;
      }
      
      var fileObj3 = bOut[0];
      sourSha = fileObj3.sha || '';
      callback(null,fileObj3);
    });
  }
}

var sourFileLoaded = false;
var markdownOfSour = '';

var slideSplitor = '<!-- SLIDE PAGES V1.0, DO NOT CHANGE THIS LINE. -->';
var re_doc_info_ = /\$=['"]\.pinp\.doc_info\.(title|desc|keyword|thumb)["']/gm;

main.$$onLoad.push( function(callback) {
  if (creator) return callback(); // if !!creator means already initialized
  
  var waitNum = 0;
  waitAndCheck(100);
  
  function isAllLoaded() {
    var s = document.body.getAttribute('data-loading');
    if (typeof s == 'string')
      return parseInt(s) === 0;
    else return true;  // fit no use page_proxy.js
  }
  
  function waitAndCheck(iWait) {
    if (waitNum > 180) {  // max 90 seconds
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

main.$$onLoad.push( function(callback) {
  if (creator || !pageUrl || !W.__design__)  // if !!creator means already initialized
    return callback();
  
  creator = W.$creator;
  repoName = creator.repoName;
  repoOwner = decodeURIComponent(urlConfig.user || 'pinp');
  if (creator.isLocal || creator.isGithub)
    creator.appBase = function() { return '/' + repoName + '/output' };
  else creator.appBase = function() { return '/app/' + repoOwner + '/' + repoName + '/web/output' };
  
  creator.resourceBase = 'md/res';
  creator.useHtmlProxy = true;
  // creator.accessToken = '';
  // creator.accessUser = '';
  // creator.accessSite = '';
  creator.savePages = function(sHtml,callback) {  // callback must passed
    if (!sourFileLoaded || !sHtml) {
      var sMsg = 'system error';
      return callback(new Error(sMsg),sMsg);
    }
    
    if (userObj.isLocal) {  // try re-read markdownOfSour, maybe modified
      loadSourText_(pageUrl, function(err,sText) {
        if (err) {
          alert('read source failed: ' + pageUrl);
          return;
        }
        
        sText = sText.replace(/\r\n/g,'\n');
        var m = markdown_splitor_.exec(sText);
        if (m)
          markdownOfSour = sText.slice(0,m.index);
        else markdownOfSour = sText;
        nextStep();
      });
    }
    else nextStep();
    
    function nextStep() {
      var sText = markdownOfSour;
      if (sText && sText.slice(-1) != '\n') sText += '\n';
      sText += slideSplitor;
      if (sHtml[0] != '\n') sText += '\n';
      
      var iPos = sText.length;
      sText += sHtml;
      
      saveSourText_(pageUrl,sText,iPos, function(err,fileObj) {
        if (err)
          callback(err,pageUrl);
        else {
          callback(null,pageUrl);
          
          var noHeader = markdownOfSour.length <= 24 && !markdownOfSour.trim();
          var bInfo = getDocInfo(noHeader,markdownOfSour,sText);
          if (bInfo.length) setTimeout(trySaveConfig,0,pageUrl,noHeader,bInfo);
        }
      });
    }
  };
  
  var siteHost  = window.location.hostname, sitePort = window.location.port;
  if (urlConfig.site) siteHost = decodeURIComponent(urlConfig.site); // urlConfig.site = 'api.github.com'
  var sHostPort = sitePort? siteHost + ':' + sitePort: siteHost;
  Git = (siteHost == 'localhost' || siteHost == '127.0.0.1')
      ? utils.gitOf(sHostPort,'http')   // fixed to http
      : utils.gitOf(sHostPort,'https'); // fixed to https, location.port should be ''
  
  userObj = new Git.User(urlConfig.user?decodeURIComponent(urlConfig.user):'pinp');
  if (!userObj.isLocal && urlConfig.token)
    Git.siteAuth = 'OAuth ' + decodeURIComponent(urlConfig.token);
  braObj = new Git.Branch(userObj,repoName,'gh-pages');
  
  b = pageUrl.split('.');
  if (b.length >= 2) b.pop();
  b.push('txt');
  pageUrl = 'md/' + b.join('.');
  
  loadSourText_(pageUrl,whenGetSour);
  return;
  
  function whenGetSour(err,sText) {
    if (err) {
      alert('load file failed: ' + pageUrl);
      callback();
      return;
    }
    
    document.title = 'Edit - ' + pageUrl.split('/').pop();
    
    sourFileLoaded = true;
    sText = sText.replace(/\r\n/g,'\n');
    var sPages, m = markdown_splitor_.exec(sText);
    if (m) {
      markdownOfSour = sText.slice(0,m.index);
      slideSplitor = m[0];
      sPages = sText.slice(m.index + slideSplitor.length);
    }
    else markdownOfSour = sText;
    
    if (m) {
      var bodyComp = W.W('.body').component; // body node must exists
      
      var clsSet = utils.getWTC('ScenePage'), wtcCls = clsSet.ScenePage; // must exists
      var bPage = [], nodes = document.createElement('div');
      nodes.innerHTML = sPages;
      for (var i=0,node; node = nodes.children[i]; i++) {
        if (node.nodeName == 'DIV') {
          var ele = scanScenePage(bodyComp.$gui,node,wtcCls,bPage.length);
          if (ele) bPage.push(ele);
        }
      }
      
      if (bodyComp && bPage.length) {
        main.$$onLoading.push( function(callback2) { // let other $$onLoad functions run first
          bPage.push( function(changed) {
            callback2();
          });
          bodyComp.setChild.apply(bodyComp,bPage);
        });
      }
    }
    else markdownOfSour = sText;
    
    callback();
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
  
  function getDocInfo(noHeader,sHead,sHeadTail) {
    var bInfo = [];
    
    re_doc_info_.lastIndex = 0;
    var m = re_doc_info_.exec(sHeadTail), hasTitle = false, hasDesc = false;
    while (m) {
      var infoTag = m[1], iPos = sHeadTail.indexOf('>',m.index);
      if (iPos > 0) {
        if (infoTag == 'thumb') {
          var sUrl = '', sTmp = sHeadTail.slice(m.index,iPos);
          sTmp.replace(/\burl\(([^)]+)\)/, function(_,s) {
            var ch = s[0], ch2 = s.slice(-1);
            if (s.length > 1 && (ch == '"' || ch == "'") && (ch2 == '"' || ch2 == "'"))
              s = s.slice(1,-1);
            return sUrl = s;
          });
          if (sUrl) bInfo.push([infoTag,sUrl]);  // thumb
        }
        else {
          var iPos2 = sHeadTail.indexOf('<',iPos);
          if (iPos2 > 0) {
            var sDesc = sHeadTail.slice(iPos+1,iPos2).trim();
            if (sDesc) {
              if (infoTag == 'title') hasTitle = true;
              else if (infoTag == 'desc') hasDesc = true;
              bInfo.push([infoTag,sDesc]);       // title, desc, keyword
            }
          }
        }
      }
      m = re_doc_info_.exec(sHeadTail);
    }
    
    if (!noHeader && (!hasTitle || !hasDesc)) {
      var reLn = /\n\s*/g, iLast = 0, iNum = 0;
      var m = reLn.exec(sHead);
      while (m) {
        iLast = reLn.lastIndex;
        if (++iNum >= 12) break; 
        m = reLn.exec(sHead);
      }
      if (iLast) {
        try {
          var node = document.createElement('div'), sFirstLn = '', meetP = false;
          node.innerHTML = window.marked(sHead.slice(0,iLast));
          
          if (!hasTitle) {
            var hdNode = node.querySelector('h1,h2,h3,h4,h5,h6');
            if (hdNode) bInfo.push(['title',hdNode.textContent.trim().slice(0,256)]);
          }
          if (!hasDesc) {
            var sFirstLn = getDocDesc(node.querySelectorAll('p'));
            if (sFirstLn) bInfo.push(['desc',sFirstLn]);
          }
        }
        catch(e) { }
      }
    }
    
    return bInfo;
  }
  
  function getDocDesc(txtNodes) {
    var sFirstLn = '', iFrom = 0, iCount = txtNodes.length;
    while (!sFirstLn && iFrom < iCount) {
      sFirstLn = txtNodes[iFrom].textContent.trim();
      iFrom += 1;
    }
    
    if (sFirstLn.length <= 32) {  // insufficient information, try get more
      var sSecondLn = '';
      while (!sSecondLn && iFrom < iCount) {
        sSecondLn = txtNodes[iFrom]? txtNodes[iFrom].textContent.trim().slice(0,1024): '';
        iFrom += 1;
      }
      
      if (sSecondLn) {
        if (sSecondLn.length > 1024) sSecondLn = sSecondLn.slice(0,1020) + '...';
        sFirstLn += '<br>' + sSecondLn;
      }
    }
    else {
      if (sFirstLn.length > 1024) sFirstLn = sFirstLn.slice(0,1020) + '...';
    }
    return sFirstLn;
  }
  
  function trySaveConfig(pageUrl,noHeader,bDocInfo) {
    var dirObj = braObj.dirOf('');
    dirObj.fetchContents( function(err,obj) {
      if (err) {
        alert('warning: list root directory failed');
        return;
      }
      var fileObj = dirObj.getFile('config.json');
      if (!fileObj) {
        alert('warning: can not find config.json');
        return;
      }
      
      fileObj.readRaw( function(err,sRaw) {
        if (err) {
          alert('warning: read config.json failed');
          return;
        }
        
        var cfg = null;
        try {
          cfg = JSON.parse(sRaw);
        }
        catch(e) { alert('warning: parse config.json failed'); }
        if (!cfg) return;
        
        var bList = cfg.doc_list;
        if (!Array.isArray(bList))
          bList = cfg.doc_list = [];
        var aFile = bList.find( function(item) {
          return item.path === pageUrl;
        });
        if (!aFile) {
          aFile = {path:pageUrl, tag:''};
          bList.unshift(aFile);
        }
        
        aFile.markdown = !noHeader;
        bDocInfo.forEach( function(item) {
          aFile[item[0]] = item[1];  // title,desc,keyword,thumb
        });
        var tm = aFile.modify_at = (new Date()).valueOf();
        if (!aFile.create_at) aFile.create_at = aFile.modify_at;
        cfg.last_modify = tm;
        
        fileObj.putContent(JSON.stringify(cfg,null,2), function(err,bOut) {
          if (err)
            alert('warning: save config.json failed');
          else console.log('save config.json successful.')
        });
      });
    });
  }
});

});
