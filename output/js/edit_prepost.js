// edit_prepost.js

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

var currPreIndex  = 0;
var currPostIndex = 0;
var currPreSpeed  = 3;
var currPostSpeed = 3;

var WEB_BROWSER_TYPE = '';
var WEB_BROWSER_VER  = '';
var TRANS_CSS_NAME   = 'transform';
var TRANS_END_FUNC   = 'transitionend';

(function() {
  var sUA = navigator.userAgent.toLowerCase();
  var m = sUA.match(/trident.*rv[ :]*([\d.]+)/); // >= IE11, can not use sUA.match(/msie ([\d.]+)/)
  if (m) {
    if (parseFloat(m[1]) >= 11.0) {
      WEB_BROWSER_TYPE = 'ie'; WEB_BROWSER_VER = m[1];
      TRANS_END_FUNC = 'MSTransitionEnd'; TRANS_CSS_NAME = '-ms-transform'; // 'transform' or 'msTransform' can work also
    }
  } else {
    m = sUA.match(/firefox\/([\d.]+)/);
    if (m) {
      WEB_BROWSER_TYPE = 'firefox'; WEB_BROWSER_VER = m[1];
      TRANS_END_FUNC = 'transitionend'; TRANS_CSS_NAME = 'transform';
    } else {
      m = sUA.match(/chrome\/([\d.]+)/);
      if (m) {
        WEB_BROWSER_TYPE = 'chrome'; WEB_BROWSER_VER = m[1];
        TRANS_END_FUNC = 'webkitTransitionEnd'; TRANS_CSS_NAME = '-webkit-transform';
      }
      else {
        m = sUA.match(/opera.([\d.]+)/);
        if (m) {
          WEB_BROWSER_TYPE = 'opera'; WEB_BROWSER_VER = m[1];
          TRANS_END_FUNC = 'oTransitionEnd'; TRANS_CSS_NAME = 'transform';
        }
        else {
          m = sUA.match(/safari\/([\d.]+)/);
          if (m) {
            WEB_BROWSER_TYPE = 'safari'; WEB_BROWSER_VER = m[1];
            TRANS_END_FUNC = 'webkitTransitionEnd'; TRANS_CSS_NAME = '-webkit-transform';
          }
          else {
            m = sUA.match(/webkit\/([\d.]+)/);
            if (m) {  // webkit kernel, iPad ...
              WEB_BROWSER_TYPE = 'webkit'; WEB_BROWSER_VER = m[1];
              TRANS_END_FUNC = 'webkitTransitionEnd'; TRANS_CSS_NAME = '-webkit-transform';
            }
          }
        }
      }
    }
  }
  
  if (WEB_BROWSER_TYPE == '' || WEB_BROWSER_VER == '') {
    if (sUA.match(/msie ([\d.]+)/))
      console.log('!fatal error: IE version too low, please use IE11 or higher');
    else console.log('!fatal error: unknown web browser type'); // only support firefox/chrome/safari/opera/IE
  }
})();

function refreshPreStyle() {
  var divNode = document.getElementById('demo-img');
  if (currPreIndex == 0) {
    divNode.style.marginLeft = '';
    divNode.style.marginTop = '';
    divNode.style.opacity = '';
    divNode.style[TRANS_CSS_NAME] = '';
  }
  else {
    // step 1: reset state
    divNode.className = '';
    divNode.style.zIndex = '100';
    divNode.style.marginLeft = '';
    divNode.style.marginTop = '';
    divNode.style.opacity = '';
    divNode.style[TRANS_CSS_NAME] = '';
    
    // step 2: prepare pre-hidden-state
    var sZIndex = '100';
    if (currPreIndex <= 4) {
      if (currPreIndex == 1) {
        divNode.style.marginTop = '-190px';  // -110 - 80
      }
      else if (currPreIndex == 2) {
        divNode.style.marginLeft = '190px';  // 110 + 80
      }
      else if (currPreIndex == 3) {
        divNode.style.marginTop = '190px';
      }
      else { // currPreIndex == 4
        divNode.style.marginLeft = '-190px';
      }
      divNode.style.opacity = '0';
    }
    else if (currPreIndex <= 8) {
      if (currPreIndex == 5) {
        divNode.style.marginLeft = '190px';
        divNode.style.marginTop = '-190px';
        divNode.style[TRANS_CSS_NAME] = 'rotate(-215deg) scale(0.2,0.2)';
      }
      else if (currPreIndex == 6) {
        divNode.style.marginLeft = '190px';
        divNode.style.marginTop = '190px';
        divNode.style[TRANS_CSS_NAME] = 'rotate(215deg) scale(0.2,0.2)';
      }
      else if (currPreIndex == 7) {
        divNode.style.marginLeft = '-190px';
        divNode.style.marginTop = '190px';
        divNode.style[TRANS_CSS_NAME] = 'rotate(-215deg) scale(0.2,0.2)';
      }
      else { // currPreIndex == 8
        divNode.style.marginLeft = '-190px';
        divNode.style.marginTop = '-190px';
        divNode.style[TRANS_CSS_NAME] = 'rotate(215deg) scale(0.2,0.2)';
      }
      divNode.style.opacity = '0';
    }
    else if (currPreIndex == 9) {
      divNode.style[TRANS_CSS_NAME] = 'scale(0.1,0.1)';
      divNode.style.opacity = '0';
    }
    else if (currPreIndex == 10) {
      divNode.style[TRANS_CSS_NAME] = 'rotate(1800deg) scale(0.1,0.1)';
      divNode.style.opacity = '0';
    }
    else if (currPreIndex == 11) {
      sZIndex = '102';
      divNode.style.opacity = '0';
    }
    else if (currPreIndex == 12) {
      sZIndex = '98';
      divNode.style.opacity = '0';
    }
    else if (currPreIndex == 13) {
      sZIndex = '100';
      divNode.style.opacity = '0';
    }
    else if (currPreIndex == 14) {
      divNode.style[TRANS_CSS_NAME] = 'scale(0.6,0.6)';
    }
    else if (currPreIndex == 15) {
      divNode.style[TRANS_CSS_NAME] = 'scale(0.8,0.8)';
    }
    else if (currPreIndex == 16) {
      divNode.style[TRANS_CSS_NAME] = 'scale(1.2,1.2)';
    }
    else if (currPreIndex == 17) {
      divNode.style[TRANS_CSS_NAME] = 'scale(1.4,1.4)';
    }

    // step 3: animate: restore to default state
    setTimeout( function() {
      divNode.className = 'prebuild-' + currPreSpeed;
      divNode.style.zIndex = sZIndex;
      divNode.style.marginLeft = '';
      divNode.style.marginTop = '';
      divNode.style.opacity = '';
      divNode.style[TRANS_CSS_NAME] = '';
    },200);
  }
}

function onPrePostFinish(event) {
  var divNode = event.target;
  divNode.removeEventListener(TRANS_END_FUNC,onPrePostFinish);
  divNode.className = '';
  
  setTimeout( function() {
    divNode.style.zIndex = '100';
    divNode.style.marginLeft = '';
    divNode.style.marginTop = '';
    divNode.style.opacity = '';
    divNode.style[TRANS_CSS_NAME] = '';
  },1500);
}

function refreshPostStyle() {
  var divNode = document.getElementById('demo-img');
  if (currPostIndex == 0) {
    divNode.style.zIndex = '100';
    divNode.style.marginLeft = '';
    divNode.style.marginTop = '';
    divNode.style.opacity = '';
    divNode.style[TRANS_CSS_NAME] = '';
  }
  else {
    // step 1: reset state
    divNode.className = '';
    divNode.style.zIndex = '100';
    divNode.style.marginLeft = '';
    divNode.style.marginTop = '';
    divNode.style.opacity = '';
    divNode.style[TRANS_CSS_NAME] = '';
    
    // step 2: set postbuild class
    divNode.className = 'postbuild-' + currPostSpeed;
    divNode.addEventListener(TRANS_END_FUNC,onPrePostFinish,false);
    
    // step 3: action
    if (currPostIndex <= 4) {
      if (currPostIndex == 1) {
        divNode.style.marginTop = '-190px';  // -110 - 80
      }
      else if (currPostIndex == 2) {
        divNode.style.marginLeft = '190px';  // 110 + 80
      }
      else if (currPostIndex == 3) {
        divNode.style.marginTop = '190px';
      }
      else { // currPostIndex == 4
        divNode.style.marginLeft = '-190px';
      }
      divNode.style.opacity = '0';
    }
    else if (currPostIndex <= 8) {
      if (currPostIndex == 5) {
        divNode.style.marginLeft = '190px';
        divNode.style.marginTop = '-190px';
        divNode.style[TRANS_CSS_NAME] = 'rotate(-215deg) scale(0.2,0.2)';
      }
      else if (currPostIndex == 6) {
        divNode.style.marginLeft = '190px';
        divNode.style.marginTop = '190px';
        divNode.style[TRANS_CSS_NAME] = 'rotate(215deg) scale(0.2,0.2)';
      }
      else if (currPostIndex == 7) {
        divNode.style.marginLeft = '-190px';
        divNode.style.marginTop = '190px';
        divNode.style[TRANS_CSS_NAME] = 'rotate(-215deg) scale(0.2,0.2)';
      }
      else { // currPostIndex == 8
        divNode.style.marginLeft = '-190px';
        divNode.style.marginTop = '-190px';
        divNode.style[TRANS_CSS_NAME] = 'rotate(215deg) scale(0.2,0.2)';
      }
      divNode.style.opacity = '0';
    }
    else if (currPostIndex == 9) {
      divNode.style[TRANS_CSS_NAME] = 'scale(0.1,0.1)';
      divNode.style.opacity = '0';
    }
    else if (currPostIndex == 10) {
      divNode.style[TRANS_CSS_NAME] = 'rotate(1800deg) scale(0.1,0.1)';
      divNode.style.opacity = '0';
    }
    else if (currPostIndex == 11) {
      divNode.style.zIndex = '102';
    }
    else if (currPostIndex == 12) {
      divNode.style.zIndex = '98';
    }
    else if (currPostIndex == 13) {
      divNode.style.zIndex = '100';
    }
    else if (currPostIndex == 14) {
      divNode.style[TRANS_CSS_NAME] = 'scale(0.6,0.6)';
    }
    else if (currPostIndex == 15) {
      divNode.style[TRANS_CSS_NAME] = 'scale(0.8,0.8)';
    }
    else if (currPostIndex == 16) {
      divNode.style[TRANS_CSS_NAME] = 'scale(1.2,1.2)';
    }
    else if (currPostIndex == 17) {
      divNode.style[TRANS_CSS_NAME] = 'scale(1.4,1.4)';
    }
  }
}

document.querySelector('table.prepost').onclick = function(event) {
  var node = event.target, sId = node.id;
  if (node.nodeName != 'INPUT' || !sId) return;
  
  var b = sId.split('-');
  if (b.length != 2) return;
  var sType = b[0], sIndex = b[1];
  
  if (sType == 'pre') {
    currPreIndex = parseInt(sIndex);
    var nodes = document.querySelectorAll('input[id^="pre-"]');
    for (var i=0,item; item = nodes[i]; i++) {
      if (item === node)
        item.checked = true;
      else item.checked = false;
    }
    refreshPreStyle();
  }
  else if (sType == 'post') {
    currPostIndex = parseInt(sIndex);
    var nodes = document.querySelectorAll('input[id^="post-"]');
    for (var i=0,item; item = nodes[i]; i++) {
      if (item === node)
        item.checked = true;
      else item.checked = false;
    }
    refreshPostStyle();
  }
  else if (sType == 'prespeed') {
    currPreSpeed = parseInt(sIndex);
    var nodes = document.querySelectorAll('input[id^="prespeed-"]');
    for (var i=0,item; item = nodes[i]; i++) {
      if (item === node)
        item.checked = true;
      else item.checked = false;
    }
    refreshPreStyle();
  }
  else if (sType == 'postspeed') {
    currPostSpeed = parseInt(sIndex);
    var nodes = document.querySelectorAll('input[id^="postspeed-"]');
    for (var i=0,item; item = nodes[i]; i++) {
      if (item === node)
        item.checked = true;
      else item.checked = false;
    }
    refreshPostStyle();
  }
};

//------------------------
var taskId = 0;
var inValue = null;
var inStepFlag = '';

function getPrePostData() {
  var sJoin = document.getElementById('joinPrev').checked? '1': '0';
  if (currPreIndex == 0) {
    if (currPostIndex == 0)
      return '';  // not use pre-step and post-step
    else return '0-' + currPreSpeed + '-' + currPostIndex + '-' + currPostSpeed + '-' + sJoin;
  }
  else {
    if (currPostIndex == 0)
      return currPreIndex + '-' + currPreSpeed + '-0-0-' + sJoin;
    else return currPreIndex + '-' + currPreSpeed + '-' + currPostIndex + '-' + currPostSpeed + '-' + sJoin;
  }
}

function closeDialog(isClose,isCancel,byParent) {
  var changed = false, bRmv = [], dProp = Object.assign({},inValue[0]);
  
  if (!isCancel) {
    var outStepFlag = getPrePostData();
    
    if (inStepFlag !== outStepFlag) {
      changed = true;
      if (!outStepFlag)
        bRmv.push('data-prepost');
      else dProp['data-prepost'] = outStepFlag;
    }
  }
  
  var outValue = [changed,dProp,bRmv];
  var s = '[PROJECT_NAME]' + JSON.stringify({method:'onDialogExit',param:[isClose,changed,taskId,outValue]});
  window.parent.window.postMessage(s,'*');
}

document.getElementById('cancel-btn').onclick = function(event) {
  closeDialog(true,true,false);
};

function initGui() {
  inStepFlag = inValue[0]['data-prepost'] || '';
  var dOption = inValue[2];   // inValue: [dProp,sPath,dWidgetOption]
  
  if (dOption.propsEx && dOption.propsEx['step.play']) { // can play
    document.getElementById('preplay-18').style.display = 'block';
    document.getElementById('preplay-19').style.display = 'block';
    document.getElementById('postplay-18').style.display = 'block';
    document.getElementById('postplay-19').style.display = 'block';
  }
  
  if (inStepFlag) {
    var b = inStepFlag.split('-');
    if (b.length >= 2) {
      var i1 = parseInt(b[0]);
      var node1 = document.getElementById('pre-' + i1);
      if (node1) { node1.checked = true; currPreIndex = i1; }
      
      var i2 = parseInt(b[1]);
      var node2 = document.getElementById('prespeed-' + i2);
      if (node2) {
        node2.checked = true; currPreSpeed = i2;
        if (i2 != 3) {
          var tmpNode = document.getElementById('prespeed-3');
          if (tmpNode) tmpNode.checked = false;
        }
      }
    }
    
    if (b.length >= 4) {
      var i3 = parseInt(b[2]);
      var node3 = document.getElementById('post-' + i3);
      if (node3) { node3.checked = true; currPostIndex = i3; }
      
      var i4 = parseInt(b[3]);
      var node4 = document.getElementById('postspeed-' + i4);
      if (node4) {
        node4.checked = true; currPostSpeed = i4;
        if (i4 != 3) {
          var tmpNode = document.getElementById('postspeed-3');
          if (tmpNode) tmpNode.checked = false;
        }
      }
    }
    
    if (b.length >= 5 && parseInt(b[4])) {  // join previous
      document.getElementById('joinPrev').checked = true;
    }
    
    if (currPreIndex > 0)
      document.getElementById('pre-0').checked = false;
    if (currPostIndex > 0)
      document.getElementById('post-0').checked = false;
  }
}

if (window.parent && window.parent.window !== window) {
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
        inValue = msg.param[1];  // cssList = msg.param[2] || [];
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
}

}  // end of function onStart_

if (document.body.hasAttribute('data-loading'))
  document.body.onStart = onStart_;
else setTimeout(onStart_,600);
