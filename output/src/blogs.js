// blog_widget.js

if (!window.W) { window.W = new Array(); W.$modules = [];} W.$modules.push( function(require,module,exports) {

var React = require('react');
var ReactDOM = require('react-dom');

var W = require('shadow-widget');
var main = W.$main, utils = W.$utils, ex = W.$ex, idSetter = W.$idSetter, creator = W.$creator;

var re_seperator_ = /^---+$/;
var re_assign_    = /^[$_a-zA-Z][$_.a-zA-Z0-9]*=/;
var re_whitechar_ = /[^-+,._A-Za-z0-9]+/;

function analyseCfg(bRet,sInput) {
  // step 1: scan segment and assignment, remove comments
  var b = sInput.split('\n'), bSeg = [], bLast = [], sLast = '';  
  b.forEach( function(s) {
    s = s.trim();
    if (!s || s.slice(0,2) == '//') {
      if (sLast) {
        bLast.push(sLast);
        sLast = '';
      }
      return;
    }
    
    if (s.search(re_seperator_) == 0) {
      if (sLast) {
        bLast.push(sLast);
        sLast = '';
      }
      bSeg.push(bLast);
      bLast = [];
      return;
    }
    
    if (s.search(re_assign_) == 0) {
      if (sLast) {
        bLast.push(sLast);
        sLast = '';
      }
      bLast.push(s.split('='));
      return;
    }
    
    // not empty, not comment, not 'item='
    if (sLast)
      sLast += ' ' + s;
    else sLast = s;
  });
  
  if (sLast) bLast.push(sLast);
  if (bLast.length) bSeg.push(bLast);
  if (bSeg.length == 0) return false;
  
  // step 2: parse number, bool, string
  bSeg.forEach( function(bItem) {  // scan one segment
    var dSegCfg = {}, bSegBody = null, anyCfg = false;
    
    bItem.forEach( function(item,idx2) {
      if (Array.isArray(item)) {
        var s = item[1].trim();   // item[1] must be string
        if (s) {
          dSegCfg[item[0]] = parseValue(s);
          anyCfg = true;
        } // else, ignore empty value
      }
      else {
        var b = item.split(re_whitechar_), bDataLn = [];
        b.forEach( function(s2) {
          var b3, b2 = s2.split(',');  // assert(b2.length >= 1)
          if (b2.length > 1) {
            b3 = b2.map( function(s3) {
              return parseValue(s3);
            });
          }
          else b3 = parseValue(b2[0]);
          bDataLn.push(b3);
        });
        if (bDataLn.length) bSegBody = bDataLn; // exist many bDataLn, just overwrite
      }
    });
    
    bRet.push([anyCfg?dSegCfg:null,bSegBody]);
  });
  return true;
  
  function parseValue(s) {
    if (s == 'true')
      return true;
    else if (s == 'false')
      return false;
    else if (s == 'null')
      return null;
    else if (!s)
      return '';
    else {
      var f = parseFloat(s);
      if ((f + '') === s)
        return f;
      else return s;
    }
  }
}

/* (function() {  // for testing
  var bRet = [], s = ' // ex=1\n\ntype=line1\n35 42 OK,74.5,32\n\n1 2 3,4 5\n---\na.b.c=3.5\na.d=true\n87 abc ef 92\n1 2 3\n';
  if (analyseCfg(bRet,s)) console.log(JSON.stringify(bRet));
})(); */

var extras_ = ['clear','stop','resize','reset','toBase64Image','generateLegend','update','getElementAtEvent','getElementsAtEvent','getDatasetAtEvent','getDatasetMeta'];
var strokeColor_ = [ '51,153,102','153,102,0','51,102,153','192,0,0',
  '102,102,51','255,204,102','102,153,0','204,0,153',
  '102,0,153','51,102,204','153,51,51','51,204,0',
  '204,102,0','102,102,153','51,153,255', '102,51,51' ];

var re_color_ = /#[a-fA-F0-9]+|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|[a-z]+/g;
var re_white_ = /^[ ,]*$/;

function scanLabels_(dCfg,dData) {
  if (dData.labels) return dData.labels;
  
  var bLabel = dCfg.labels;
  if (!bLabel || typeof bLabel != 'string') return null;
  bLabel = bLabel.split(',');
  if (bLabel.length <= 1) return null;
  
  dData.labels = bLabel;
  delete dCfg.labels;
  return bLabel;
}

function adjustTitle_(dCfg) {
  if ((dCfg.title || {}).text)
    dCfg.title.display = true;
}

function ajdustColor_(sColor) {
  var b = [];
  var ss = sColor.replace(re_color_,function(s) {
    b.push(s);
    return '';
  });
  if (!ss || ss.search(re_white_) == 0) {
    if (b.length <= 1)
      return b[0] || sColor;
    else return b;
  }
  else return sColor;
}

function adjustPieData_(dCfg,dData,usePercent) {
  adjustTitle_(dCfg);
  
  var bData = dData.datasets;
  if (!Array.isArray(bData) || bData.length == 0) return;  // fatal error
  var iNum = (dData.labels || []).length;
  if (iNum == 0) return;  // fatal error
  
  if (usePercent && dCfg.legend.showPercent) {  // only for pie and doughnut
    for (var idx=0,dItem; dItem=bData[idx]; idx++) {
      if (Array.isArray(dItem.data)) {
        var fTotal = 0;
        dItem.data.forEach( function(item) {
          fTotal += item;
        });
        if (fTotal) { // not zero
          dItem.data.forEach( function(item2,idx2) {
            if (idx2 < iNum)
              dData.labels[idx2] += percentOf(item2,fTotal);
          });
        }
      }
    }
  }
  
  for (var idx=0,dItem; dItem=bData[idx]; idx++) {
    if (dItem.backgroundColor) // should be string
      dItem.backgroundColor = ajdustColor_(dItem.backgroundColor);
    else dItem.backgroundColor = getColors(iNum);
  }
  
  function getColors(iNum) {
    var b = [];
    for (var i=0; i < iNum; i++) {
      b.push('rgba(' + strokeColor_[i % 16] + ',0.5)');
    }
    return b;
  }
  
  function percentOf(value,fTotal) {
    var f = (value / fTotal) * 100, s = f + '', iPos = s.indexOf('.');
    if (iPos <= 0)
      return ' ' + s + '%';
    else return ' ' + f.toPrecision(iPos+1) + '%';
  }
}

var chartModel_ = {
  line1: {
    defaultCfg: [ ['elements.point.backgroundColor','#fff'],
      ['elements.point.hoverRadius',4]
    ],
    
    scanLabels: scanLabels_,
    adjustData: function(dCfg,dData) {
      adjustTitle_(dCfg);
      
      var bData = dData.datasets;
      if (!Array.isArray(bData)) return;  // fatal error
      
      for (var idx=0,dItem; dItem=bData[idx]; idx++) { 
        var sColor = strokeColor_[idx % 16];
        if (dItem.backgroundColor)
          dItem.backgroundColor = ajdustColor_(dItem.backgroundColor);
        else dItem.backgroundColor = 'rgba(' + sColor + ',0.16)';
        if (dItem.borderColor)
          dItem.borderColor = ajdustColor_(dItem.borderColor);
        else dItem.borderColor = 'rgba(' + sColor + ',0.7)';
        if (dItem.pointBorderColor)
          dItem.pointBorderColor = ajdustColor_(dItem.pointBorderColor);
        else dItem.pointBorderColor = 'rgba(' + sColor + ',0.7)';
      }
    },
  },

  line2: {
    defaultCfg: [ ['elements.point.backgroundColor','#fff'],
      ['elements.point.hoverRadius',4],
      ['scales.xAxes.0.type','linear']
    ],
    
    adjustData: function(dCfg,dData) {
      adjustTitle_(dCfg);
      
      var bData = dData.datasets;
      if (!Array.isArray(bData)) return;  // fatal error
      
      for (var idx=0,dItem; dItem=bData[idx]; idx++) {
        var sColor = strokeColor_[idx % 16];
        if (dItem.backgroundColor)
          dItem.backgroundColor = ajdustColor_(dItem.backgroundColor);
        else dItem.backgroundColor = 'rgba(' + sColor + ',0.16)';
        if (dItem.borderColor)
          dItem.borderColor = ajdustColor_(dItem.borderColor);
        else dItem.borderColor = 'rgba(' + sColor + ',0.7)';
        if (dItem.pointBorderColor)
          dItem.pointBorderColor = ajdustColor_(dItem.pointBorderColor);
        else dItem.pointBorderColor = 'rgba(' + sColor + ',0.7)';
        
        var bNew = [], bItem = dItem.data;
        if (Array.isArray(bItem)) {
          bItem.forEach( function(bItem2) {
            if (Array.isArray(bItem2) && bItem2.length == 2)
              bNew.push({x:bItem2[0],y:bItem2[1]});
          });
        }
        dItem.data = bNew;
      }
    },
  },

  bar1: {
    defaultCfg: [['scales.yAxes.0.ticks.beginAtZero',true]],
    
    scanLabels: scanLabels_,
    adjustData: function(dCfg,dData) {
      adjustTitle_(dCfg);
      
      var dItem, bData = dData.datasets;
      if (!Array.isArray(bData) || bData.length == 0) return;  // fatal error
      var iNum = (dData.labels || []).length;
      if (iNum == 0) return;  // fatal error
      
      if (bData.length == 1 && (dItem=bData[0]).type !== 'line') {
        if (dItem.backgroundColor)
          dItem.backgroundColor = ajdustColor_(dItem.backgroundColor);
        else { // according to dData.labels
          var b = [];
          for (var i=0; i < iNum; i++) {
            b.push('rgba(' + strokeColor_[(i+1) % 16] + ',0.22)');
          }
          dItem.backgroundColor = b;
        }
        if (dItem.borderColor)
          dItem.borderColor = ajdustColor_(dItem.borderColor);
        else {
          var b = [];
          for (var i=0; i < iNum; i++) {
            b.push('rgba(' + strokeColor_[i % 16] + ',0.7)');
          }
          dItem.borderColor = b;
        }
      }
      else {
        for (var idx=0; dItem=bData[idx]; idx++) {
          var sColor = strokeColor_[idx % 16];
          if (dItem.backgroundColor)
            dItem.backgroundColor = ajdustColor_(dItem.backgroundColor);
          else dItem.backgroundColor = 'rgba(' + sColor + ',0.3)';
          if (dItem.borderColor)
            dItem.borderColor = ajdustColor_(dItem.borderColor);
          else dItem.borderColor = 'rgba(' + sColor + ',0.7)';
          if (dItem.pointBorderColor)
            dItem.pointBorderColor = ajdustColor_(dItem.pointBorderColor);
          else dItem.pointBorderColor = 'rgba(' + sColor + ',0.7)';
        }
      }
    },
  },
  
  radar1: {
    defaultCfg: [['elements.point.backgroundColor','#fff'],
      ['elements.point.hoverRadius',5],
    ],
    
    scanLabels: scanLabels_,
    adjustData: function(dCfg,dData) {
      adjustTitle_(dCfg);
      
      var dItem, bData = dData.datasets;
      if (!Array.isArray(bData) || bData.length == 0) return;  // fatal error
      var iNum = (dData.labels || []).length;
      if (iNum == 0) return;  // fatal error
      
      for (var idx=0; dItem=bData[idx]; idx++) {
        var sColor = strokeColor_[idx % 16];
        if (dItem.backgroundColor)
          dItem.backgroundColor = ajdustColor_(dItem.backgroundColor);
        else dItem.backgroundColor = 'rgba(' + sColor + ',0.2)';
        if (dItem.borderColor)
          dItem.borderColor = ajdustColor_(dItem.borderColor);
        else dItem.borderColor = 'rgba(' + sColor + ',0.8)';
        if (dItem.pointBorderColor)
          dItem.pointBorderColor = ajdustColor_(dItem.pointBorderColor);
        else dItem.pointBorderColor = 'rgba(' + sColor + ',0.8)';
      }
    },
  },
  
  polarArea1: {
    defaultCfg: [],
    scanLabels: scanLabels_,
    adjustData: adjustPieData_,
  },
  pie1: {
    defaultCfg: [],
    scanLabels: scanLabels_,
    adjustData: function(dCfg,dData) {
      adjustPieData_(dCfg,dData,true);
    },
  },
  doughnut1: {
    defaultCfg: [],
    scanLabels: scanLabels_,
    adjustData: function(dCfg,dData) {
      adjustPieData_(dCfg,dData,true);
    },
  },
  
  bubble1: {
    defaultCfg: [],
    
    adjustData: function(dCfg,dData) {
      adjustTitle_(dCfg);
      
      var bData = dData.datasets;
      if (!Array.isArray(bData)) return;  // fatal error
      
      for (var idx=0,dItem; dItem=bData[idx]; idx++) {
        var sColor = strokeColor_[idx % 16];
        if (dItem.backgroundColor)
          dItem.backgroundColor = ajdustColor_(dItem.backgroundColor);
        else dItem.backgroundColor = 'rgba(' + sColor + ',0.5)';
        
        var bNew = [], bItem = dItem.data;
        if (Array.isArray(bItem)) {
          bItem.forEach( function(bItem2) {
            if (Array.isArray(bItem2) && bItem2.length == 3)
              bNew.push({x:bItem2[0],y:bItem2[1],r:bItem2[2]});
          });
        }
        dItem.data = bNew;
      }
    },
  },
};

function makeChartEle_(chartType) {
  return utils.loadElement(['Canvas',{key:chartType,$id__:id__}]);
  
  function id__(value,oldValue) {  // will auto bind this
    if (value <= 2) {
      if (value == 1) {  // initializing
        this.waitRedraw = false;
        this.ownerSlide = this.widget && slidePageOf(this.widget);
        
        this.renewChart = function(callback) {
          var owner = this.parentOf();
          if (!owner) return;  // fatal error
          
          var thisEle = null, nextKey = '', currKey = this.duals.keyid + '';
          var iPos = owner.$gui.compIdx[currKey];
          if (!isNaN(iPos) && iPos >= 0) {
            thisEle = owner.$gui.comps[iPos];
            while (++iPos < owner.$gui.comps.length) {
              var child = owner.$gui.comps[iPos];
              if (child) {
                nextKey = utils.keyOfElement(child);
                break;
              }
            }
          }
          
          renewCanvas_(owner,thisEle,currKey,nextKey,callback);
        };
        
        this.redraw = redrawFn_;
        this.getChart = function() {
          return this.state.chart;
        };
        
        for (var i=0,sAttr; sAttr=extras_[i]; i++) {
          this[sAttr] = makeExtraFn_(this,sAttr);
        }
        
        this.defineDual('data',function(value,oldValue) {
          this.redraw();
        });
        this.defineDual('options',function(value,oldValue) {
          this.redraw();
        });
        this.defineDual('html.',function(value,oldValue) {
          // step 1: read config info from 'html.' and prepare dModel
          var owner = this.parentOf(), bInfo = [], sKey = this.duals.keyid;
          if (!owner || owner.props['data-dsn-sizes'] !== sKey) return;
          if (!analyseCfg(bInfo,value) || bInfo.length <= 1) return;
          var dModel = chartModel_[sKey];
          if (!dModel) return;
          
          // step 2: setup options
          var dOption = {}, dCfgIn = bInfo[0][0];
          dModel.defaultCfg.forEach( function(item) {
            assignConfig(dOption,item[0],item[1]);
          });
          if (dCfgIn) {
            Object.keys(dCfgIn).forEach( function(item) {
              assignConfig(dOption,item,dCfgIn[item]);
            });
          }
          
          // step 3: setup chart data
          var bDataset = [], dData = {datasets:bDataset};
          if (dModel.scanLabels && !dModel.scanLabels(dOption,dData)) return;
          
          for (var i=1,item; item=bInfo[i]; i++) {
            var bItemData = item[1];
            if (!Array.isArray(bItemData)) continue;
            
            var dItem = {data:bItemData}, dItemCfg = item[0];
            if (dItemCfg) {
              Object.keys(dItemCfg).forEach( function(item2) {
                assignConfig(dItem,item2,dItemCfg[item2]);
              });
            }
            bDataset.push(dItem);
          }
          if (dModel.adjustData) dModel.adjustData(dOption,dData);
          
          // step 4: trigger redraw
          this.duals.data = dData;
          this.duals.options = dOption;
        });
      }
      else if (value == 2) {  // mount
        if (W.__design__) {   // try regist auto resizing
          var sSubKey, owner = this.parentOf();
          if (owner && (sSubKey=owner.props['data-dsn-sizes']) === this.duals.keyid) {
            var gui = owner.$gui, self = this;
            gui.chartWd = gui.cssWidth;
            gui.chartHi = gui.cssHeight;
            owner.listen('id__', function(value,oldValue) {
              if (value <= 2 || !self.isHooked) return;
              if (gui.chartWd !== gui.cssWidth || gui.chartHi !== gui.cssHeight) {
                gui.chartWd = gui.cssWidth;
                gui.chartHi = gui.cssHeight;
                self.renewChart();
              }
            });
          }
        }
        
        if (!this.waitRedraw)
          this.redraw();
      }
      else if (value == 0) {  // unmount
        var chart = this.state.chart;
        this.state.chart = undefined;
	      if (chart) chart.destroy();
	      this.ownerSlide = null;
      }
      return;
    }
  }
  
  function slidePageOf(wdgt) { // owner2.props['isScenePage.']
    var owner = wdgt.parent, comp = owner && owner.component;
    if (comp) {
      if (comp.props['isScenePage.'])
        return comp;
      else return slidePageOf(owner);
    }
    else return null;
  }
  
  function redrawFn_() {
    var pgNode, self = this;
    function delayRedraw(ev) {
      pgNode.removeEventListener('slideenter',delayRedraw);
      if (!self.state.chart)
        self.redraw();
    }
    
    var chart = this.state.chart;
    if (!chart && this.ownerSlide) {
      if (!this.isHooked) return;
      
      pgNode = this.ownerSlide.getHtmlNode();
      if (!pgNode) return; // fatal error
      if (pgNode.style.display == 'none') {
        pgNode.addEventListener('slideenter',delayRedraw,false);
        return;  // delay redraw
      }
    }
    
    if (chart) { chart.destroy(); this.state.chart = undefined; }
    if (!this.state.data) return;
    
    this.waitRedraw = true;
    var runCount = 0;
    drawInReady();
    
    function drawInReady() {
      runCount += 1;
      setTimeout( function() {
        if (!self.isHooked) {
          if (runCount < 10)
            drawInReady();   // delay process
          return;
        }
        
        if (self.waitRedraw) {
          self.waitRedraw = false;
          var data = self.state.data;
          if (W.__design__) {
            data = Object.assign({},data), b = [];
            if (Array.isArray(data.datasets)) {
              data.datasets.forEach( function(item) {
                b.push(Object.assign({},item));
              });
              data.datasets = b; // copy array item to avoid item._meta be assigned
            }
          }
          self.state.chart = new window.Chart(ReactDOM.findDOMNode(self).getContext("2d"),{type:chartType,data:data,options:self.state.options || {}});
        }
      },self.isHooked?100:600);
    }
  }
  
  function makeExtraFn_(self,sAttr) {
    return ( function() {
      return self.state.chart[sAttr].apply(self.state.chart,arguments);
    });
  }
  
  function renewCanvas_(owner,childEle,currKey,nextKey,callback) {
    if (!childEle) return;  // fatal error
    setTimeout( function() {
      owner.setChild('-' + currKey, function(changed) {
        var bArgs = [];
        if (nextKey) bArgs.push('+' + nextKey)
        bArgs.push(childEle);
        if (callback) bArgs.push(callback);
        owner.setChild.apply(owner,bArgs);
      });
    },0);
  }
  
  function assignConfig(dOut,sKey,value) {
    var b = sKey.split('.'), iLen = b.length, iMax = iLen - 1, curr = dOut;
    for (var i=0; i < iLen; i++) {
      var item = b[i];
      if (i < iMax) {
        if (!curr.hasOwnProperty(item)) {
          if (i < iMax && b[i+1].search(/^[0-9]+$/) == 0)
            curr = curr[item] = [];
          else curr = curr[item] = {};
        }
        else curr = curr[item];
      }
      else {
        if (item.search(/^[0-9]+$/) == 0)
          curr[parseInt(item)] = value;
        else curr[item] = value;
      }
    }
  }
}

//------
function makeDocInfoEle_(sInfoType) {
  var jsonX = ['P',{key:sInfoType, $id__:id__}];
  return utils.loadElement(jsonX);
  
  function id__(value,oldValue) {
    if (value <= 2) {
      if (value == 2) {
        var isVisible = !this.props['noShow'];
        if (W.__design__ && !isVisible)
          this.duals.style = {opacity:'0.2'};
        else this.duals.style = {opacity:isVisible?'1':'0'}; // force set, avoid modified
      }
      return;
    }
  }
}

//------
idSetter['.pinp.mini_audio'] = function(value,oldValue) {
  if (value <= 2) {
    if (value == 1) {
      var sImg = this.props.playImg, sImg2 = this.props.idleImg;
      this.stateImgReady = (sImg && typeof sImg == 'string' && sImg2 && typeof sImg2 == 'string');
      this.duals.style = {backgroundRepeat:'no-repeat',backgroundSize:'100% 100%',overflow:'hidden'};
      
      if (!W.__design__) {
        this.setEvent( { $onClick: function(event) {
          var child = this.componentOf('player');
          if (child) {
            if (child.duals.playing) {
              if (typeof child.stepPause == 'function')
                child.stepPause('');
            }
            else {
              if (typeof child.stepPlay == 'function')
                child.stepPlay(0);
            }
          }
        }});
      }
    }
    else if (value == 2) {
      if (this.stateImgReady) {
        if (!W.__design__) {
          var child = this.componentOf('player'), playing = false;
          if (child && (playing=child.duals.playing) !== undefined) {
            var self = this;
            child.listen('playing', function(value,oldValue) {
              renewStyle(self,value);
            });
          }
        }
        renewStyle(this,playing);
      }
    }
    return;
  }
  
  function renewStyle(comp,playing) {
    comp.duals.style = {
      backgroundImage: 'url(' + (playing?comp.props.playImg:comp.props.idleImg) + ')'
    };
  }
};

idSetter['.pinp.mini_audio.player'] = function(value,oldValue) {
  if (value <= 2) {
    if (value == 1) {
      this.defineDual('playing',null,false);
      if (!W.__design__) {
        this.setEvent( {
          $onPlay: function(event) {
            this.duals.playing = true;
          },
          $onPause: function(event) {
            this.duals.playing = false;
          },
        });
        this.duals.style = {visibility:'hidden'};
      }
      else this.duals.style = {width:'100%',opacity:'0.08'};
    }
    return;
  }
};

var containNode_    = null;
var chartElement_   = null;
var docInfoElement_ = null;

main.$$onLoad.push( function(callback) {
  var wtc;
  if (!containNode_ && W.__design__ && (wtc=W.$templates.rewgt) && (wtc=wtc.DrawPaper) && !wtc._tools) {
    containNode_ = creator.containNode_;
    
    wtc._tools = [ {
      name:'editor', icon:'/blogs/output/res/edit_txt.png', title:'edit paper',
      url:'/blogs/output/edit_paper.html', halfScreen:true, noMove:true,
      clickable:true, width:0.9999, height:0.9999,
      
      get: function(compObj) { // compObj === self
        var bTree = [], wdgt = compObj.widget, sPath = wdgt.getPath();
        containNode_.dumpTree(bTree,wdgt,wdgt.parent.getPath());
        return [sPath,bTree[0],!!compObj.props['data-inline']];
      },
      
      set: function(compObj,outValue,beClose) {
        var changed = outValue[0], sPath = outValue[1], bTree = outValue[2];
        if (!changed) return;
        if (compObj.widget.getPath() != sPath || !Array.isArray(bTree)) return;
        
        var svgNum = bTree.length - 1;
        if (svgNum >= 0) {
          var bPaper = bTree[0];
          if (Array.isArray(bPaper) && bPaper.length >= 2) {
            var dPaper = bPaper[1];
            compObj.duals.offsetX = dPaper.offsetX || 0;
            compObj.duals.offsetY = dPaper.offsetY || 0;
          }
          
          var retEle = utils.loadElement(bTree);
          var bChild = React.Children.toArray(retEle.props.children);
          
          var bRmv = [], bComp = compObj.$gui.comps;
          bComp.forEach( function(child) {
            var sKey = utils.keyOfElement(child);
            if (sKey) bRmv.push('-' + sKey);
          });
          
          if (bRmv.length) {
            compObj.setChild(bRmv, function(changed2) {
              addNewItems(compObj,bChild,sPath);
            });
          }
          else addNewItems(compObj,bChild,sPath);
        }
        
        function addNewItems(compObj,bChild) {
          if (bChild.length) {
            bChild.push(afterApply);
            compObj.setChild.apply(compObj,bChild);
          }
          else afterApply();
          
          function afterApply() {
            if (W.__design__ && containNode_.notifyBackup) // notify backup current doc
              containNode_.notifyBackup(sPath,1000);
          }
        }
      },
    }];
  }
  
  if (window.Chart) {
    utils.setVendorLib('pinp', function(template) {
      if (!chartElement_) {
        chartElement_ = utils.loadElement( [['P',{key:'charts'}],
          makeChartEle_('line'),
          makeChartEle_('bar'),
          makeChartEle_('radar'),
          makeChartEle_('polarArea'),
          makeChartEle_('pie'),
          makeChartEle_('doughnut'),
          makeChartEle_('bubble'),
        ]);
      }
      if (!docInfoElement_) {
        docInfoElement_ = utils.loadElement( [['Div',{key:'doc_info'}],
          makeDocInfoEle_('title'),
          makeDocInfoEle_('desc'),
          makeDocInfoEle_('keyword'),
          makeDocInfoEle_('thumb'),
        ]);
      }
      
      template.setChild(chartElement_,docInfoElement_, function(changed) {
        callback();
      });
    });
  }
  else callback();
});

if (!W.__design__) {
  var overrideLinkProp_ = ['width','height','left','top'];
  
  main.$onLoad.push( function() {
    var pageCtrl = utils.pageCtrl;
    if (pageCtrl && pageCtrl.keys.length > 0) return; // exist visible page, ignore
    var topWdgt = creator.topmostWidget_;  // same to: W.W('.body')
    var topComp = topWdgt && topWdgt.component;
    if (!topComp) return;
    
    var lnkConfig = null;
    var b = topComp.$gui.comps || [], iLen = b.length;
    for (var i=0; i < iLen; i++) {
      var child = b[i];
      if (!child || !child.props['isScenePage.']) continue;
      
      var sKey = utils.keyOfElement(child), childComp = sKey && topWdgt[sKey];
      childComp = childComp && childComp.component;
      if (childComp) { // find first ScenePage
        if (childComp.props.noShow) {
          var lnkEle = childComp.elementOf('link_table');
          if (lnkEle) {
            try {
              lnkConfig = JSON.parse(lnkEle.props['html.'] || '{}');
            }
            catch(e) {
              console.log('fatal error: parse json of link_table failed');
            }
          }
        }
        break;
      }
    }
    
    if (lnkConfig) {
      var bRoot = lnkConfig.root;
      if (!Array.isArray(bRoot)) return;
      
      var bChild = [];
      bRoot.forEach( function(sPath) {
        var subEle = topComp.elementOf(sPath);
        if (subEle) {
          var d = lnkConfig[sPath];
          if (!d)
            bChild.push(subEle);
          else {
            var subEle2 = joinElement(sPath,subEle,d,'/' + sPath + '/',{});
            if (subEle2) bChild.push(subEle2);
          }
        }
        else logInvalid(sPath);
      });
      if (bChild.length) topComp.setChild.apply(topComp,bChild);
    }
    
    function joinElement(sBase,ele,dSub,sFlag,dCache) {
      var bPath = Object.keys(dSub).sort();
      if (!bPath.length) return ele;  // no need join
      
      var bNew = [];
      while (bPath.length) {
        var sRelPath = bPath.pop();   // relative path
        if (!sRelPath || sRelPath[0] == '.') continue;  // ignore
        
        var sPath2 = dSub[sRelPath];
        if (sFlag.indexOf('/' + sPath2 + '/') >= 0) {   // can not reference to any parent node
          logRecursive(sPath2);
          continue;
        }
        
        var sName2 = sRelPath.split('.').pop(), errName = false;
        var childEle = childOfEle(ele,sRelPath);
        if (!childEle || !sName2 || (sName2.search(/^[0-9]+$/) == 0 && (errName=true))) {
          if (errName) console.log('error: invalid name (' + sName + ')');
          logInvalid(sBase + '.' + sRelPath);
          continue;
        }
        
        var subEle = topComp.elementOf(sPath2);
        if (!subEle) {
          logInvalid(sPath2);
          continue;
        }
        
        var d = lnkConfig[sPath2];
        if (!d) {
          var subEle2 = React.cloneElement(subEle,joinProps(subEle.props,childEle.props,sName2));
          bNew.unshift([sRelPath,subEle2]); // bNew is sorted by sRelPath
        }
        else {
          var subEle2 = joinElement(sPath2,subEle,d,sFlag + sPath2 + '/',{});
          if (subEle2) {
            var subEle3 = React.cloneElement(subEle2,joinProps(subEle2.props,childEle.props,sName2));
            bNew.unshift([sRelPath,subEle3]);
          }
        }
      }
      if (!bNew.length) return ele;  // nothing to update
      
      var lastNew = null, sLastOwner = '/', bLast = [];
      while (bNew.length) {  // at least run one loop
        var item = bNew.pop(), sRel = item[0];
        var sOwner,sCurr, iTmp = sRel.lastIndexOf('.');
        if (iTmp >= 0) {
          sOwner = sRel.slice(0,iTmp);
          sCurr = sRel.slice(iTmp+1);
        }
        else {
          sOwner = '';
          sCurr = sRel;
        }
        if (sLastOwner == '/') sLastOwner = sOwner;
        
        if (sOwner != sLastOwner) {
          var tmpEle = updateEleSet(dCache,sBase,ele,sLastOwner,bLast,lastNew);
          if (!tmpEle) return null;
          
          lastNew = [sLastOwner,tmpEle];
          sLastOwner = sOwner;
          bLast = [];
        }
        bLast.unshift([sCurr,item[1]]);
      }
      
      var tmpEle = updateEleSet(dCache,sBase,ele,sLastOwner,bLast,lastNew); // bLast maybe []
      if (!tmpEle) return null;
      
      if (sLastOwner) {
        lastNew = [sLastOwner,tmpEle];
        return updateEleSet(dCache,sBase,ele,'',[],lastNew);
      }
      else return tmpEle;
    }
    
    function logInvalid(sPath) {
      console.log('warning: can not find element (' + sPath + ')');
    }
    
    function logRecursive(sPath) {
      console.log('warning: recursive link element (' + sPath + ')');
    }
    
    function joinProps(props,props2,sKey) {
      var dProp = {};
      if (props2.style)
        dProp.style = Object.assign({},props.style,props2.style);
      overrideLinkProp_.forEach( function(item) {
        if (props2.hasOwnProperty(item))
          dProp[item] = props2[item];
      });
      if (sKey) dProp.key = sKey;
      return dProp;
    }
    
    function childOfEle(ele,sRelPath) {
      var bPath = sRelPath.split('.');
      while (bPath.length) {
        var item = bPath.shift();
        
        var b = React.Children.toArray(ele.props.children);
        ele = b.find( function(item2) {
          return utils.keyOfElement(item2) == item; 
        });
        if (!ele) return null;
      }
      return ele;
    }
    
    function updateEleSet(dCache,sBase,ele,sOwner,bList,lastNew) {
      while (lastNew) {
        var sLastPath = lastNew[0], lastEle = lastNew[1];
        var sLastName, sUpPath = '', iPos = sLastPath.lastIndexOf('.');
        if (iPos < 0)
          sLastName = sLastPath;
        else {
          sLastName = sLastPath.slice(iPos+1);
          sUpPath = sLastPath.slice(0,iPos);
        }
        
        if (sUpPath == sOwner) {
          bList.push([sLastName,lastEle]);
          break;
        }
        else {
          if (!sUpPath) return null; // fatal error, impossible
        }
        
        // sUpPath != '', iPos >= 1
        var tmpEle = quickFindSub(dCache,sBase,ele,sUpPath);
        if (!tmpEle) return null;    // fatal error
        
        var b = React.Children.toArray(tmpEle.props.children);
        iPos = b.findIndex( function(item) {
          return utils.keyOfElement(item) == sLastName;
        });
        if (iPos < 0) {
          logInvalid(sLastPath);
          return null;
        }
        
        b.splice(iPos,1,lastEle);  // replace with new created one
        b.unshift(tmpEle,{});
        lastNew = [sUpPath,React.cloneElement.apply(null,b)];
      }
      
      var ownerEle = quickFindSub(dCache,sBase,ele,sOwner);
      if (!ownerEle) return null;
      if (!bList.length) return ownerEle;  // no need replace
      
      var bChild = React.Children.toArray(ownerEle.props.children);
      bList.forEach( function(item) {
        var sName = item[0];
        var iPos = bChild.findIndex( function(item2) {
          return utils.keyOfElement(item2) == sName;
        });
        if (iPos < 0)
          logInvalid(sLastPath);  // error, continue process
        else bChild.splice(iPos,1,item[1]);
      });
      
      if (!bChild.length) return ownerEle; // nothing changed
      bChild.unshift(ownerEle,{});
      return React.cloneElement.apply(null,bChild);
    }
    
    function quickFindSub(dCache,sBase,ele,sRelPath) {
      if (!sRelPath) return ele;  // topmost item
      
      var retEle = dCache[sRelPath];
      if (retEle) return retEle;
      
      var b = sRelPath.split('.'), sTail = '';
      while (b.length) {
        var sName = b.shift();
        if (sTail)
          sTail += '.' + sName;
        else sTail = sName;
        
        var bList, vExist = dCache[sTail];
        if (vExist) {
          ele = vExist;
          continue;
        }
        
        if (Array.isArray(bList=ele.props.children)) {
          vExist = bList.find( function(item) {
            return utils.keyOfElement(item) == sName;
          });
          if (vExist) {
            ele = dCache[sTail] = vExist;
            continue;
          }
        }
        
        logInvalid(sBase + '.' + sTail);
        return null;
      }
      
      return ele;
    }
  });
}

});
