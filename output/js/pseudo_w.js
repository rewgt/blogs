// pseudo_w.js

if (!window.W) { window.W = new Array(); W.$modules = [];}

( function() {

var utils = W.$utils = {};

var re_decode64_ = /[^A-Za-z0-9\+\/\=]/g;
var base64Key_   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

var Base64_ = utils.Base64 = {  // only for utf-8 text
  encode: function(input) {
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var output = '', i = 0;
    
    input = Base64_._utf8_encode(input);
    while (i < input.length) {
      chr1 = input.charCodeAt(i++);
      chr2 = input.charCodeAt(i++);
      chr3 = input.charCodeAt(i++);
      enc1 = chr1 >> 2;
      enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      enc4 = chr3 & 63;

      if (isNaN(chr2))
        enc3 = enc4 = 64;
      else if (isNaN(chr3))
        enc4 = 64;
      output = output + base64Key_.charAt(enc1) + base64Key_.charAt(enc2) +
               base64Key_.charAt(enc3) + base64Key_.charAt(enc4);
    }

    return output;
  },

  decode: function(input) {
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var output = '', i = 0;
    
    input = input.replace(re_decode64_,'');
    while (i < input.length) {
      enc1 = base64Key_.indexOf(input.charAt(i++));
      enc2 = base64Key_.indexOf(input.charAt(i++));
      enc3 = base64Key_.indexOf(input.charAt(i++));
      enc4 = base64Key_.indexOf(input.charAt(i++));
      chr1 = (enc1 << 2) | (enc2 >> 4);
      chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      chr3 = ((enc3 & 3) << 6) | enc4;

      output = output + String.fromCharCode(chr1);
      if (enc3 != 64)
        output = output + String.fromCharCode(chr2);
      if (enc4 != 64)
        output = output + String.fromCharCode(chr3);
    }
    
    output = Base64_._utf8_decode(output);
    return output;
  },

  _utf8_encode: function(string) {
    // string = string.replace(/\r\n/g,'\n');  // not replace win32 \r\n
    
    var utftext = '';
    for (var n = 0; n < string.length; n++) {
      var c = string.charCodeAt(n);

      if (c < 128)
        utftext += String.fromCharCode(c);
      else if(c > 127 && c < 2048) {
        utftext += String.fromCharCode((c >> 6) | 192);
        utftext += String.fromCharCode((c & 63) | 128);
      }
      else {
        utftext += String.fromCharCode((c >> 12) | 224);
        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
        utftext += String.fromCharCode((c & 63) | 128);
      }
    }
    return utftext;
  },

  _utf8_decode: function(utftext) {
    var c,c2,c3, i = 0, string = '';
    while ( i < utftext.length ) {
      c = utftext.charCodeAt(i);
      if (c < 128) {
        string += String.fromCharCode(c);
        i++;
      }
      else if (c > 191 && c < 224) {
        c2 = utftext.charCodeAt(i+1);
        string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
        i += 2;
      }
      else {
        c2 = utftext.charCodeAt(i+1);
        c3 = utftext.charCodeAt(i+2);
        string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
        i += 3;
      }
    }
    return string;
  }
};

var validHeadType_ = {GET:1, POST:1, PUT:1, DELETE:1, HEAD:1};
var _multiLnPattern  = /"{3}[^\\]*(?:\\[\S\s][^\\]*)*"{3}/gm;
var _commentPattern  = /^\s*\/\/.*$/gm;

utils.ajax = function(req) {
  var sUrl = req.url, sType = (req.type || 'GET').toUpperCase(), inData = req.data;
  if (!sUrl || typeof sUrl != 'string')
    throw new Error('invalid URL');
  if (inData && typeof inData != 'object')
    throw new Error('invalid input argument (data)');
  if (!(sType in validHeadType_))
    throw new Error('invalid request type (' + sType + ')');
  
  var iTimeout = req.timeout || 60000; // default max wait 60 seconds
  var hasQuest = sUrl.indexOf('?') > 0;
  var dataType = req.dataType;
  if (dataType === undefined && sUrl.slice(-5) == '.json')
    dataType = 'json';
  
  var sendData = null;
  if (inData) {
    if (sType != 'PUT' && sType != 'POST') {
      Object.keys(inData).forEach( function(sKey) {
        var item = inData[sKey];
        if (!hasQuest) {
          hasQuest = true;
          sUrl += '?';
        }
        else sUrl += '&';  // send with application/x-www-form-urlencoded
        sUrl += sKey + '=' + encodeURIComponent(item+'');
      });
    }
    else sendData = JSON.stringify(inData);  // send with json format
  }
  
  var xmlHttp = null, finished = false;    
  if (window.XMLHttpRequest)      // Firefox, Opera, IE7, etc
    xmlHttp = new XMLHttpRequest();
  else if (window.ActiveXObject)  // IE6, IE5
    xmlHttp = new ActiveXObject('Microsoft.XMLHTTP');
  if (!xmlHttp)
    throw new Error('invalid XMLHttpRequest');
  
  xmlHttp.onreadystatechange = function() {
    if (xmlHttp.readyState == 4) { // 4 is "loaded"
      var resText = xmlHttp.responseText || '';
      var statusText = xmlHttp.statusText || '', status = xmlHttp.status || (resText?200:404);
      if ((status >= 200 && status < 300) && resText) {
        var isPre = false;
        if (finished)
          ;  // do nothing
        else if (dataType === 'json' || (dataType === 'pre-json' && (isPre=true))) { // take as json
          var jsonData, isErr = true;
          try {
            if (isPre) {
              resText = resText.replace(_multiLnPattern, function (s) {
                var sBody = s.slice(3,-3).replace(/\\/gm,'\\\\').replace(/\n/gm,'\\n').replace(/"/gm,'\\"');  // "'
                return '"' + sBody + '"';
              });
              resText = resText.replace(_commentPattern,'');
            }
            jsonData = JSON.parse(resText.replace(/[\cA-\cZ]/gi,''));
            isErr = false;
          }
          catch(e) {
            if (req.error) {
              statusText = 'JSON format error';
              req.error(xmlHttp,statusText);
            }
          }
          if (!isErr && req.success) req.success(jsonData,statusText,xmlHttp);
        }
        else {  // take as plain text
          if (req.success) req.success(resText,statusText,xmlHttp);
        }
      }
      else {  // failed
        if (req.error)
          req.error(xmlHttp,statusText);
      }
      xmlHttp = null;
      finished = true;
    }
  };
  
  var sName, headers;
  if (req.username)
    xmlHttp.open(sType,sUrl,true,req.username,req.password);
  else xmlHttp.open(sType,sUrl,true);
  if (headers = req.headers) {
    for (sName in headers) {
      xmlHttp.setRequestHeader(sName,headers[sName]);
    }
  }
  if (sendData)
    xmlHttp.setRequestHeader('Content-Type','application/json');
  xmlHttp.send(sendData);
  
  if (typeof iTimeout == 'number') {
    setTimeout( function() {
      if (!finished) {
        finished = true;
        xmlHttp.abort();
        if (req.error)
          req.error(xmlHttp,'request timeout');
        xmlHttp = null;
      }
    },iTimeout);
  }
};

})();

( function() {
  var bFn = W.$modules;  // window.W must defined
  while (bFn.length) {
    var fn = bFn.shift();
    fn(requireFn)
  }
  
  function requireFn(sMod) {
    return sMod == 'shadow-widget'? W: null;
  }
})();
