// edit_mini.js

if (!Object.assign) { // polyfill function
  Object.assign = function() {
    var len = arguments.length;
    if (len < 1) return {};
    
    var res = arguments[0];
    if (typeof res != 'object') res = {};
    
    for(var i=1; i < len; i += 1) {
      var obj = arguments[i];
      if (typeof obj != 'object') continue;
      
      var keys = Object.keys(obj);
      for(var j=0,item; item=keys[j]; j += 1) {
        res[item] = obj[item];
      }
    }
    
    return res;
  };
}

function onStart_() {

var taskId = 0, inValue = null, cssList = [];
var orgSchemaData = null, propsChanged = false;

var editor = document.getElementById('edit-editor');
var editorInfo = document.getElementById('edit-info');
var cancelBtn = document.querySelector('#edit-btn > button');

editor.onchange = function(event) {
  propsChanged = true;
};

cancelBtn.onclick = function(event) {  // Cancel button
  closeDialog(true,true,false);
};

function initGui() {
  var sPath = inValue[1] || '', option = inValue[2];
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
  editor.style.height = Math.min(window.innerHeight - 130, Math.floor(window.innerHeight * 0.8)) + 'px';
  editor.value = 'left=-50\ntop=-50\nwidth=100\nheight=100\n';
  propsChanged = true;
  
  document.getElementById('edit-area').style.display = 'block';
}

function closeDialog(isClose,isCancel,byParent) {
  var outData = null, changed = true;
  if (isCancel || !orgSchemaData || !propsChanged)
    changed = false;
  else outData = getOutData(orgSchemaData,editor.value);
  
  var s = '[PROJECT_NAME]' + JSON.stringify({method:'onDialogExit',param:[isClose,changed,taskId,[changed,outData,[]]]});
  window.parent.window.postMessage(s,'*');
  
  function getOutData(oldData,s) {
    var ret = Object.assign({},oldData), b = s.split('\n');
    b.forEach( function(ss) {
      var b2 = ss.split('='), sName = b2[0].trim();
      if (!sName) return;
      if (sName == 'left' || sName == 'top') {
        var f = parseFloat(b2[1]);
        ret[sName] = isNaN(f)? 0: f;
      }
      else if (sName == 'width' || sName == 'height') {
        var f = parseFloat(b2[1]);
        ret[sName] = isNaN(f)? 100: f;
      }
    });
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
      cancelBtn.focus();       // trigger editor.onchange
      setTimeout( function() { // cancelBtn.focus() take effect first, then call closeDialog()
        closeDialog(isClose,false,true); // isCancel=false, byParent=true
      },0);
    }
  }
}, false);

var sCmd = '[PROJECT_NAME]' + JSON.stringify({method:'onDialogLoad',param:[]});
window.parent.window.postMessage(sCmd,'*');

}  // end of function onStart_

if (document.body.hasAttribute('data-loading'))
  document.body.onStart = onStart_;
else setTimeout(onStart_,600);
