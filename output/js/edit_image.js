// edit_image.js

function onStart_() {

var taskId = 0, inValue = null, cssList = [];
var orgSchemaData = null, propsChanged = false;

var editor = document.getElementById('edit-editor');
var editorInfo = document.getElementById('edit-info');
var cancelBtn = document.querySelector('#edit-btn > button');

var newBkgValue = '';
var newBkgValueEx = '';

function location__(href) {
  var location = document.createElement('a');
  location.href = href;
  if (location.host == '')
    location.href = location.href;
  return location;
}

function transferHasType(transfer,sType) { // transfer.types.contains() for firefox, but not for chrome
  if (!transfer.types) return false;
  var i, iLen = transfer.types.length;
  for (i=0; i < iLen; i += 1) {
    if (transfer.types[i] == sType) return true;
  }
  return false;
}

editor.addEventListener('dragover', function(event) {
  event.preventDefault();  // can drop
});

editor.addEventListener('drop', function(event) {
  if (!transferHasType(event.dataTransfer,'application/json')) return;
  var dOpt = null, sJson = event.dataTransfer.getData('application/json') || '{}';
  try {
    dOpt = JSON.parse(sJson);
  }
  catch(e) { console.log(e); }
  
  var sUrl;
  if (dOpt && dOpt.dragType == 'image' && (sUrl=dOpt.dragUrl)) {
    var appBase = location__('./').pathname;
    if (appBase[0] != '/') appBase = '/' + appBase; // avoid bug of IE10
    var urlPath = location__(sUrl).pathname;
    if (urlPath[0] != '/') urlPath = '/' + urlPath;
    if (urlPath.startsWith(appBase))
      urlPath = urlPath.slice(appBase.length);
    
    editor.setAttribute('src',urlPath);
    event.preventDefault();
    event.stopPropagation();
  }
},false);

editor.onload = function(event) {
  var sUrl = editor.getAttribute('src');
  if (sUrl) {
    newBkgValue = sUrl;
    editor.setAttribute('title',sUrl);
    propsChanged = true;
  }
};

cancelBtn.onclick = function(event) {  // Cancel button
  closeDialog(true,true,false);
};

function findImageCfg(sBkgCss) {
  var sImg = '', sImgEx = '', isData = false;
  var sBkgCss2 = sBkgCss.replace(/url\([^)]+\)/, function(s) {
    sImg = s.slice(4,-1).trim();
    return '';
  });
  if (sImg) {
    sImgEx = sBkgCss2.trim();
    var iPos = sImg.indexOf('data:');
    if (iPos >= 0 && iPos < 10)
      isData = true;
    else {
      if (sImg[0] == '"' && sImg[sImg.length-1] == '"')
        sImg = sImg.slice(1,-1);
      else if (sImg[0] == "'" && sImg[sImg.length-1] == "'")
        sImg = sImg.slice(1,-1);
    }
  }
  return [sImg,sImgEx,isData];
}

function initGui() {
  var sPath = inValue[1] || '', option = inValue[2];
  propsChanged = false;
  orgSchemaData = inValue[0] || null;
  if (!orgSchemaData) {
    var infoNode = document.createElement('h3');
    infoNode.innerHTML = 'Error: scan property of widget (' + sPath + ') failed';
    document.body.appendChild(infoNode);
    return;
  }
  
  var sTag = option? option.name: '';
  document.getElementById('edit-tagname').textContent = sTag? sTag+': ': '';
  document.getElementById('edit-path').textContent = sPath + '';
  
  var sBkgCss = (orgSchemaData.style || {}).background;
  if (sBkgCss && typeof sBkgCss == 'string') {
    var b = findImageCfg(sBkgCss), sImg = b[0], sImgEx = b[1], isData = b[2];
    if (!sImg) {
      alert('error: no background image found!');
      return;
    }
    newBkgValueEx = sImgEx;
    editor.setAttribute('src',isData? 'url(' + sImg + ')': sImg);
    document.getElementById('edit-area').style.display = 'block';
  }
}

function closeDialog(isClose,isCancel,byParent) {
  var outData = null, changed = true;
  if (isCancel || !orgSchemaData || !propsChanged || !newBkgValue)
    changed = false;
  else outData = getOutData(orgSchemaData,newBkgValue,newBkgValueEx);
  
  var s = '[PROJECT_NAME]' + JSON.stringify({method:'onDialogExit',param:[isClose,changed,taskId,[changed,outData,[]]]});
  window.parent.window.postMessage(s,'*');
  
  function getOutData(oldData,sImg,sImgEx) {
    var ret = Object.assign({},oldData), dStyle = Object.assign({},oldData.style);
    
    var sImgCss = 'url(' + sImg + ')';
    if (sImgEx) sImgCss += ' ' + sImgEx;
    dStyle.background = sImgCss;
    
    ret.style = dStyle;
    return ret;
  }
}

if (!window.parent || window.parent.window === window) return;

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
    if (msg.method == 'init') {
      taskId = msg.param[0];
      inValue = msg.param[1];
      cssList = msg.param[2] || [];
      initGui();
    }
    else if (msg.method == 'close') {
      var isClose = msg.param[0];
      closeDialog(isClose,false,true); // isCancel=false, byParent=true
    }
  }
}, false);

var sCmd = '[PROJECT_NAME]' + JSON.stringify({method:'onDialogLoad',param:[]});
window.parent.window.postMessage(sCmd,'*');

}  // end of function onStart_

if (document.body.hasAttribute('data-loading'))
  document.body.onStart = onStart_;
else setTimeout(onStart_,600);
