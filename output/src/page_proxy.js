// page_proxy.js

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

var config = getUrlParam(window.location.search.slice(1));
if (config.auto) config.auto = decodeURIComponent(config.auto);
if (config.url) {
  config.url = decodeURIComponent(config.url);
  document.body.setAttribute('data-loading','999'); // assume loading start
}

if (config.auto) {
  var script = document.createElement('script');
  script.async = 1;
  script.onload = function(event) {
    if (config.url) writeHeadBody(config.url);
  };
  script.src = config.auto;
  document.body.appendChild(script);
}
else {
  if (config.url)
    writeHeadBody(config.url);
}

var re_script_ = /<script\b[^>]*>\s*<\/script>/gm;

function writeHeadBody(sUrl) {
  getAsynRequest(sUrl, function(err,sText) {
    if (err) {
      console.log(err);
      alert('load file failed: ' + sUrl);
      return;
    }
    
    var iHead = sText.search(/<head>/), iHead2 = sText.search(/<\/head>/);
    var iBody = sText.search(/<body>/), iBody2 = sText.search(/<\/body>/);  // avoid using <body style=xx>
    if (iHead >= 0 && iHead2 > iHead && iBody > 0 && iBody2 > iBody) {
      var sHead = sText.slice(iHead + 6,iHead2);
      var b = [], sBody = sText.slice(iBody + 6,iBody2);
      sBody = sBody.replace(re_script_, function(s) { // avoid using <script>code...</script>
        var i = s.indexOf('>');
        if (i > 0)
          b.push(s.slice(7,i).trim());
        return '';
      });
      document.head.innerHTML = sHead;
      document.body.innerHTML = sBody;
      
      var jsNodes = [], jsTaskDone = false;
      if (b.length) {
        var tmpNode = document.createElement('div');
        b.forEach( function(s) {
          if (!s) return;
          
          tmpNode.innerHTML = '<div ' + s + '></div>'; // avoid analyse attributes
          var tmpNode2 = tmpNode.children[0];
          if (tmpNode2) {
            var node = document.createElement('script');
            jsNodes.push(node);
            for (var i=0,item; item=tmpNode2.attributes[i]; i++) {
              node.setAttribute(item.name,item.value);
            }
            
            node.onload = function(event) {
              if (!jsTaskDone) checkJsLoadAll(); // if timeout, ignore body.onload()
            };
          }
        });
      }
      
      if (jsNodes.length) {
        setTimeout( function() {
          if (!jsTaskDone) {
            jsTaskDone = true;
            alert('Error: load javascript module timeout');
          }
        },90000); // max wait 90 seconds
      }
      checkJsLoadAll();
    }
    
    function checkJsLoadAll() {
      if (jsTaskDone) return; // wait timeout, not trigger body.onload()
      
      document.body.setAttribute('data-loading',jsNodes.length+'');
      if (jsNodes.length) {
        setTimeout( function() {
          document.body.appendChild(jsNodes.shift()); // loading js module one by one
        },0);   // let js code running first
      }
      else {
        setTimeout( function() {
          jsTaskDone = true;
          var bodyNode = document.body;
          if (bodyNode.onStart) bodyNode.onStart();
        },100); // let other script run first
      }
    }
  });
}

})();
