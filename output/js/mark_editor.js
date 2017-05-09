// doc_main.js

( function() {

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

function getPreviewUrl(sPage) {
  return '$proxy.html?_=' + (new Date()).valueOf() + '&url=lib%2Fshow_doc.html&page=' + encodeURIComponent(sPage);
}

function getEditorUrl(sPage) {
  return '$proxy.html?_=' + (new Date()).valueOf() + '&url=output%2Fdoc_editor.html&page=' + encodeURIComponent(sPage);
}

function resizeEditor(preview,editor,iSize) {
  if (typeof iSize != 'number') return;
  
  var iLeft = 100 - iSize;
  if (editor.style.height === '100%') {  // arrange as row
    preview.style.width = iSize + '%';
    editor.style.left = Math.floor((window.innerWidth * iSize) / 100) + 'px';
    editor.style.width = iLeft + '%';
  }
  else {  // as column
    preview.style.height = iSize + '%';
    editor.style.top = Math.floor((window.innerHeight * iSize) / 100) + 'px';
    editor.style.height = iLeft + '%';
  }
}

function arrayEditor(preview,editor,toVertical,iSize) {
  var iLeft = 100 - iSize;
  if (editor.style.height === '100%') {  // current in horizontal
    if (toVertical) {
      preview.style.width = '100%';
      preview.style.height = iSize + '%';
      editor.style.left = '0px';
      editor.style.top = Math.floor((window.innerHeight * iSize) / 100) + 'px';
      editor.style.height = iLeft + '%';
      editor.style.width = '100%';
    }
  }
  else {  // current in vertical
    if (!toVertical) {
      preview.style.height = '100%';
      preview.style.width = iSize + '%';
      editor.style.left = Math.floor((window.innerWidth * iSize) / 100) + 'px';
      editor.style.top = '0px';
      editor.style.width = iLeft + '%';
      editor.style.height = '100%';
    }
  }
}

function reloadPreview(preview) {
  var sUrl = preview.getAttribute('src');
  if (!sUrl || sUrl.indexOf('?') < 0) return; // invalid format
  
  var replaced = false, sTag = (new Date()).valueOf() + '';
  sUrl = sUrl.replace(/\b_=[0-9]+/, function(s) {
    replaced = true;
    return '_=' + sTag;
  });
  if (!replaced) sUrl += '&_=' + sTag;
  
  preview.setAttribute('src',sUrl);
}

function updateMark(preview,sMark) {
  var sCmd = '[PROJECT_NAME]' + JSON.stringify({method:'updateMark',param:[sMark]});
  preview.contentWindow.postMessage(sCmd,'*');
}

document.body.onStart = function() {
  var urlOpt = getUrlParam(window.location.search.slice(1));
  var sPage = urlOpt.page || '';  // sPage is encodeURIComponent()
  
  var preview = document.querySelector('#preview');
  if (preview && sPage) {
    preview.setAttribute('src',getPreviewUrl(sPage));
  }
  
  var editor = document.querySelector('#editor');
  if (editor && sPage) {
    if (sPage.slice(-5) == '.html') sPage = sPage.slice(0,-5) + '.txt';
    document.title = 'Edit - ' + sPage.split('/').pop();
    editor.setAttribute('src',getEditorUrl(sPage));
  }
  
  window.addEventListener('resize', function(event) {
    if (editor.style.height === '100%') {  // current in horizontal
      var sSize = preview.style.width || '50%';
      if (sSize.slice(-1) == '%')
        sSize = sSize.slice(0,-1);
      else return;  // unknown format
      editor.style.left = Math.floor((window.innerWidth * parseInt(sSize)) / 100) + 'px';
    }
    else {
      var sSize = preview.style.height || '50%';
      if (sSize.slice(-1) == '%')
        sSize = sSize.slice(0,-1);
      else return;
      editor.style.top = Math.floor((window.innerHeight * parseInt(sSize)) / 100) + 'px';
    }
  },false);
  
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
      if (msg.method == 'resizeEditor')
        resizeEditor(preview,editor,msg.param[0]);
      else if (msg.method == 'arrayEditor')
        arrayEditor(preview,editor,msg.param[0],msg.param[1]);
      else if (msg.method == 'reloadPreview')
        reloadPreview(preview);
      else if (msg.method == 'updateMark')
        updateMark(preview,msg.param[0]);
    }
  }, false);
};

})();
