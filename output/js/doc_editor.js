// edit_doc.js

if (!window.W) { window.W = new Array(); W.$modules = [];} W.$modules.push( function(require,module,exports) {

var W = require('shadow-widget');
var utils = W.$utils;

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

var urlConfig = getUrlParam(window.location.search.slice(1));

function getAsynRequest(sUrl,callback) {  // callback must passed
  var xmlHttp = null;
  if (window.XMLHttpRequest)      // Firefox, Opera, IE7, etc
    xmlHttp = new XMLHttpRequest();
  else if (window.ActiveXObject)  // IE6, IE5
    xmlHttp = new ActiveXObject('Microsoft.XMLHTTP');
  
  if (xmlHttp) {
    xmlHttp.onreadystatechange = function() {
      if (xmlHttp.readyState == 4) { // 4 is "loaded"
        if (xmlHttp.status == 200)   // success save
          callback(null,xmlHttp.responseText);
        else callback(new Error('XMLHttpRequest failed'));
        xmlHttp = null;
      }
    };
    xmlHttp.open('GET',sUrl,true);
    xmlHttp.send(null);
  }
}

var markdown_splitor_ = /<\!-- SLIDE PAGES V[.0-9]+, DO NOT CHANGE THIS LINE. -->/;

var sourFileLoaded = false;
var slidesOfSour = '';
var slideSplitor = '<!-- SLIDE PAGES V1.0, DO NOT CHANGE THIS LINE. -->';
var re_doc_info_ = /\$=['"]\.pinp\.doc_info\.(title|desc|keyword|thumb)["']/gm;

var siteHost  = window.location.hostname, sitePort = window.location.port;
var bRepoName = window.location.pathname.split('/');
var sRepoName = bRepoName.shift();
if (!sRepoName) sRepoName = bRepoName.shift();

if (urlConfig.site) siteHost = decodeURIComponent(urlConfig.site); // urlConfig.site = 'api.github.com'
var sHostPort = sitePort? siteHost + ':' + sitePort: siteHost;

var Git = null, userObj = null, braObj = null, sourSha = '';

function initGitBra() {
  Git = (siteHost == 'localhost' || siteHost == '127.0.0.1')
      ? utils.gitOf(sHostPort,'http')   // fixed to http
      : utils.gitOf(sHostPort,'https'); // fixed to https, location.port should be ''
  
  userObj = new Git.User(urlConfig.user?decodeURIComponent(urlConfig.user):'pinp');
  if (!userObj.isLocal && urlConfig.token)
    Git.siteAuth = 'OAuth ' + decodeURIComponent(urlConfig.token);
  braObj  = new Git.Branch(userObj,sRepoName,'gh-pages');
}

function loadSourText(sPage,callback) {
  var fileObj = braObj.fileOf(sPage);
  fileObj.readRaw( function(err,sRaw) {
    if (err) return callback(err);
    sourSha = fileObj.sha || '';
    callback(null,sRaw);
  });
}

function saveSourText(sPage,sText,iSepPos,callback) {
  if (userObj.isLocal) { // simple overwrite
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
            if (!window.confirm('file has been modified by other editor, continue saving?')) {
              return callback('ABORT');
            }
            
            var sMark = sText.slice(0,iSepPos);
            var sNewRaw = utils.Base64.decode(fileObj2.content).replace(/\r\n/g,'\n');
            var spNew,slideNew, m = markdown_splitor_.exec(sNewRaw);
            if (m) {
              spNew = m[0];
              slideNew = sNewRaw.slice(m.index+spNew.length);
            }
            else {
              spNew = slideSplitor;
              slideNew = '';
            }
            
            var sText2 = sMark;
            if (slideNew) {
              if (sText2 && sText2.slice(-1) != '\n') sText2 += '\n';
              sText2 += spNew;
              if (slideNew[0] != '\n') sText2 += '\n';
              sText2 += slideNew;
            }
            
            fileObj.sha = fileObj2.sha;
            fileObj.putContent(sText2, function(err3,bOut) {
              if (err3) return callback(err3);
              
              var fileObj3 = bOut[0];
              sourSha = fileObj3.sha || '';
              slideSplitor = spNew;
              slidesOfSour = slideNew;
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

function tryPreviewMark(editor) {
  var sCmd = '[PROJECT_NAME]' + JSON.stringify({method:'updateMark',param:[editor.value]});
  window.parent.window.postMessage(sCmd,'*');
}

function startFunc() {
  initGitBra();
  
  var pageUrl = decodeURIComponent(urlConfig.page || '');
  
  var hintTm = 0, hintSpan = document.querySelector('#hint-txt');
  function showHint(sMsg,sColor) {
    if (hintTm) clearTimeout(hintTm);
    hintSpan.textContent = sMsg;
    hintSpan.style.color = sColor || 'black';
    hintSpan.style.display = 'inline';
    
    hintTm = setTimeout( function() {
      hintTm = 0;
      hintSpan.style.display = 'none';
    },5000);
  }
  
  var rangeBtn = document.querySelector('#range-btn');
  rangeBtn.onchange = function(ev) {
    var iSize = parseInt(rangeBtn.value);  // 20~80%
    rangeBtn.setAttribute('title','preview size: ' + iSize + '%'); 
    var sCmd = '[PROJECT_NAME]' + JSON.stringify({method:'resizeEditor',param:[iSize]});
    window.parent.window.postMessage(sCmd,'*');
  };
  
  var arrayBtn = document.querySelector('#array-btn');
  arrayBtn.onclick = function(ev) {
    var sSrc = arrayBtn.getAttribute('src') || '', sName = sSrc.split('/').pop();
    var toVertical = sName == 'array_col.png', iSize = parseInt(rangeBtn.value);
    var sCmd = '[PROJECT_NAME]' + JSON.stringify({method:'arrayEditor',param:[toVertical,iSize]});
    window.parent.window.postMessage(sCmd,'*');
    
    var newImg = 'output/res/' + (toVertical?'array_row.png':'array_col.png');
    arrayBtn.setAttribute('src',newImg);
  };
  
  var editor = document.querySelector('#txt-editor');
  var editorOwner = editor.parentNode;
  resizeWin();
  window.addEventListener('resize',resizeWin,false);
  
  function processSave() {
    if (userObj.isLocal) {  // try re-read slidesOfSour, maybe modified
      loadSourText(pageUrl, function(err,sText) {
        if (err) {
          showHint('read source failed!','red');
          return;
        }
        
        sText = sText.replace(/\r\n/g,'\n');
        var m = markdown_splitor_.exec(sText);
        if (m)
          slidesOfSour = sText.slice(m.index+m[0].length);
        else slidesOfSour = '';
        nextStep();
      });
    }
    else nextStep();
    
    function nextStep() {
      var iPos, sHead = editor.value, sHeadTail = sHead;
      if (slidesOfSour) {
        if (sHeadTail && sHeadTail.slice(-1) != '\n') sHeadTail += '\n';
        sHeadTail += slideSplitor;
        if (slidesOfSour[0] != '\n') sHeadTail += '\n';
        sHeadTail += slidesOfSour;
        iPos = sHeadTail.length - slidesOfSour.length;
      }
      else iPos = sHead.length;
      
      saveSourText(pageUrl,sHeadTail,iPos, function(err,fileObj) {
        if (err) {
          if (err !== 'ABORT')
            showHint('save file failed!','red');
        }
        else {
          tryPreviewMark(editor);
          showHint('save file successful.');
          
          var noHeader = sHead.length <= 24 && !sHead.trim();
          var bInfo = getDocInfo(noHeader,sHead,sHeadTail);
          if (bInfo.length) setTimeout(trySaveConfig,0,pageUrl,noHeader,bInfo);
        }
      });
    }
  }
  
  editor.onkeydown = function(event) {
    if ((event.ctrlKey || event.metaKey) && event.keyCode == 83) {  // cmd + s
      event.preventDefault();
      processSave();
    }
  };
  editor.onkeypress = function(event) {
    if (event.keyCode == 13) {
      if (parseInt(rangeBtn.value) >= 50) {
        setTimeout( function() {
          tryPreviewMark(editor);
        },0);
      }
    }
  };
  
  var fontBtn = document.querySelector('#font-btn');
  fontBtn.onclick = function(ev) {
    var iSize = parseInt(editor.style.fontSize || '16px');
    var sSize = (iSize == 16? '20px': (iSize == 20? '14px': '16px'));
    editor.style.fontSize = sSize;
  };
  
  var previewBtn = document.querySelector('#preview-btn');
  previewBtn.onclick = function(ev) {
    var sCmd = '[PROJECT_NAME]' + JSON.stringify({method:'reloadPreview',param:[]});
    window.parent.window.postMessage(sCmd,'*');
  };
  
  var editPageBtn = document.querySelector('#editor-btn');
  editPageBtn.onclick = function(ev) {
    if (!urlConfig.page) return; // fatal error
    var sUrl = '$proxy.html?url=output/page_editor.html&page=' + urlConfig.page;
    if (urlConfig.user) sUrl += '&user=' + urlConfig.user;
    if (urlConfig.site) sUrl += '&site=' + urlConfig.site;
    if (urlConfig.token) sUrl += '&token=' + urlConfig.token;
    window.open(sUrl,'_blank');
  };
  
  var saveBtn = document.querySelector('#save-btn');
  saveBtn.onclick = function(ev) {
    processSave();
  };
  
  if (!pageUrl)
    editor.setAttribute('readonly','readonly');
  else {
    var b = pageUrl.split('.');
    if (b.length >= 2) b.pop();
    b.push('txt');
    pageUrl = 'md/' + b.join('.');
    loadSourText(pageUrl,whenGetSour);
  }
  
  function resizeWin(event) {
    var iHi = window.innerHeight - 30;
    editorOwner.style.height = iHi + 'px';
    editor.style.width = (window.innerWidth - 10) + 'px';
    editor.style.height = (iHi - 4) + 'px';
  }
  
  function whenGetSour(err,sText) {
    if (err) {
      showHint('load file failed!','red');
      editor.setAttribute('readonly','readonly');
      return;
    }
    
    editor.style.visibility = 'visible';
    sourFileLoaded = true;
    slidesOfSour = '';
    
    sText = sText.replace(/\r\n/g,'\n');
    var sMarked, m = markdown_splitor_.exec(sText);
    if (m) {
      slideSplitor = m[0];
      editor.value = sText.slice(0,m.index);
      slidesOfSour = sText.slice(m.index+slideSplitor.length);
    }
    else editor.value = sText;
    
    showHint('load file successful.');
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
        if (!aFile.create_at) aFile.create_at = aFile.tm;
        cfg.last_modify = tm;
        
        fileObj.putContent(JSON.stringify(cfg,null,2), function(err,bOut) {
          if (err)
            alert('warning: save config.json failed');
          else console.log('save config.json successful.')
        });
      });
    });
  }
}

var tryNum_ = 0;

function tryStart() {
  if (!utils.gitOf) {
    tryNum_ += 1;
    if (tryNum_ > 180)
      console.log('load shadow-gits module failed');
    else setTimeout(tryStart,500);
  }
  else startFunc();
}

tryStart();

});
