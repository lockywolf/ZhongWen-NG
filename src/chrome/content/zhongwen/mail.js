/**
* The contents of this file are subject to the Mozilla Public 
* License Version 1.1 (the "License"); you may not use this 
* file except in compliance with the License. You may obtain a
* copy of the License at http://www.mozilla.org/MPL/
*
* Software distributed under the License is distributed on an 
* "AS IS" basis, WITHOUT WARRANTY OF ANY KIND, either express 
* or implied. See the License for the specific language 
* governing rights and limitations under the License.
*
* The Original Code is this file as it was released on
* Feb 24, 2009.
*
* The Initial Developer of the Original Code is Terry Yuen. 
* Portions created by Terry Yuen are Copyright (C) 2009.
* All Rights Reserved.
**/

const ZhongWen = {
  dict: false,
  expire: 0,
  shown: 0,
  now: 0,
  timer: 0,

  $: function(s) {
    return document.getElementById(s);
  },

  init: function(d, t, i) {
    d = ZhongWen;
    (d.$("messagesBox") || d.$("messagepanebox") || d.$("browser"))
      .addEventListener("mousemove", d.move, false, true);

    t = d.tmpl = d.pref("tmpl").match(/(\d+|\D+)/g);
    for(i = 0; i < t.length; i++) t[i] = t[i]/1 || t[i];

    d.$("zhongwen").autoPosition = false;
    d.$("zhongwen").addEventListener("mouseover", d.hide, false);
    d.noExpire();
  },

  uninit: function(d) {
    d = ZhongWen;
    (d.$("messagesBox") || d.$("messagepanebox") || d.$("browser"))
      .removeEventListener("mousemove", d.move, false, true);
    d.$("zhongwen").removeEventListener("mouseover", d.hide, false);
  },

  event: {shiftKey:1, rangeOffset:1, screenX:1, screenY:1},

  later: function(e, d, f) {
    d = ZhongWen;

    if(e && e.type) {
      f = d.event;
      for(i in f) f[i] = e[i];
      f.nodeType = 3;
      f.nodeValue = e.rangeParent.nodeValue;
      f.rangeParent = f;

      if(!d.timer) setTimeout(d.later, 130);
      d.timer = 3;

    } else if(d.timer == 0) {
      d.event.nodeValue = "";

    } else if(d.timer == 1) {
      d.timer = d.now = 0;
      d.move(d.event);
      d.event.nodeValue = "";

    } else if(d.timer > 1) {
      d.timer--;
      setTimeout(d.later, 130);
    }
  },

  move: function(e, d, t, s, i, str, a, m, s2, s3, fit) {
    d = ZhongWen;
    t = e.rangeParent;

    if(e.shiftKey) return;

    //if not over a text node, hide panel
    if(!t || t.nodeType != 3) {
      d.timer = d.pos = null;
      return d.shown && d.hide();
    }

    //if ascii character, hide panel
    var s = t.nodeValue.charAt(e.rangeOffset);
    if(s < "\u00ff") {
      d.timer = 0;
      return d.shown && d.hide();
    }

    //if loitering in the same position, ignore
    if(d.chr == s && d.pos == e.rangeOffset) return;
    d.expire = 2;

    //whoa, slow down there
    if(d.timer || Date.now() - d.now < 150) {
      d.now = Date.now();
      if(d.shown) d.hide();
      return d.later(e);
    }

    //if last entry cached, show cache
    if(s == d.chr && d.last) {
      d.pos = e.rangeOffset;
      return d.show(e);
    }

    //if dict not loaded, load dict and hide panel
    if(typeof d.dict != "string") {
      if(!d.dict) d.getDict();
      return d.shown && d.hide();
    }

    str = d.dict;
    d.now = Date.now();
    d.chr = s;
    d.pos = e.rangeOffset;

    i = -1;
    a = [];
    m = 4;

    //find "ABCDEF" using "ABC-"
    fit = 0;
    s2 = "\n" + t.nodeValue.substr(d.pos, 4);
    while(s2.length > 2 && (i = str.indexOf(s2)) == -1) {
      s2 = s2.substring(0, s2.length - 1);
    }
    if(i >= 0) {
      while((i = str.indexOf(s2, i)) != -1 && m-- > 0) {
        a.push(str.substring(i, (i = str.indexOf("\n", i + 1))));
      }
    }

    s2 = " " + t.nodeValue.substr(d.pos, 4);
    while(s2.length > 2 && (i = str.indexOf(s2)) == -1) {
      s2 = s2.substring(0, s2.length - 1);
    }
    if(i >= 0) {
      while((i = str.indexOf(s2, i)) != -1 && m-- > 0) {
        s3 = str.substring(str.substring(0, i).lastIndexOf("\n"), (i = str.indexOf("\n", i)));

        //if simplified and traditional forms are same, skip
        if(s3.indexOf(s2.substring(1)) == 1) break;

        //if false alarm (ie. "_ _ [_] /_ A/"), next
        if(s3.indexOf(s2) > s3.indexOf("\/") && m++) continue;

        a.push(s3);
      }
    }

    if(a.length == 0) {
      //if not found then find "A****" using "A"
      fit = 1;

      s2 = "\n" + s;
      while((i = str.indexOf(s2, i)) != -1 && m-- > 0) {
        a.push(str.substring(i, (i = str.indexOf("\n", i + 1))));
      }

      //if not found, search simplified column
      s2 = " " + s;
      while((i = str.indexOf(s2, i)) != -1 && m-- > 0) {
        s3 = str.substring(str.substring(0, i).lastIndexOf("\n"), (i = str.indexOf("\n", i)));
        //if simplified and traditional are same, skip
        if(s3.indexOf(s3.substring(s3.indexOf(" ") + 1, s3.indexOf(" ["))) == 1) break;
        a.push(s3);
      }
    }

    //if haven't found anything then just find "**A**" using "A"
    if(a.length == 0) {
      fit = 2;
      m = 2;
      while((i = str.indexOf(s, i)) != -1 && m > 0) {
        s2 = str.substring(str.substring(0, i).lastIndexOf("\n"), (i = str.indexOf("\n", i)));
        if(s2.indexOf(s) < s2.indexOf("\/")) {
          m--;
          a.push(s2);
        }
      }
    }

    for(i = a.length - 1; i >= 0; --i) {
      s2 = a[i];
      a[i] = [
        s2.substring(1, (m = s2.indexOf(" "))).split(""),
        s2.substring(m + 1, (m = s2.indexOf("[", m)) - 1).split(""),
        s2.substring(m + 1, (m = s2.indexOf("]", m))),
        [s2.substring(m + 3, s2.lastIndexOf("\/")).replace("\/", " \/ ", "g")],
        fit //fitting score
      ];

      if(a[i][3][0].indexOf('"') >= 0) a[i][3][0] = a[i][3][0].replace('"', "'", "g");

      //add diacritics
      a[i][2] = a[i][2].toLowerCase()
        .replace(/:/g, "\u0308").replace(/v/g, "u\u0308")
        .replace(/1/g, "\u0304").replace(/2/g, "\u0301")
        .replace(/3/g, "\u030c").replace(/4/g, "\u0300")
        .replace(/5/g, "").split(" ");
    }

    d.last = a.length && a;
    if(a.length) {
      d.show(e);

    } else if(d.shown) {
      d.hide();
    }
  },

  pretty: function(d, a, t, s, i, j, v, k) {
    d = this;
    a = d.last;
    t = d.tmpl;
    s = ["<vbox>"];
    for(i = 0; i < a.length; ++i) {
      s.push('<hbox class="fit', a[i][4], '">');
      for(j = 0; j < t.length; ++j) {
        v = a[i][t[j]];
        if(!v) {
          s.push('<hbox><label value="', t[j], '" \/>');
        } else {
          s.push('<hbox class="col', t[j], '">');
          for(k = 0; k < v.length; ++k) {
            s.push('<label value="', v[k], '" crop="right" \/>');
          }
        }
        s.push('<\/hbox>');
      }
      s.push('<\/hbox>');
    }
    s.push('<\/vbox>');
    return s.join("");
  },

  show: function(e, d, n, r, y, p) {
    d = this;
    n = d.$("zhongwen");

    n.hidePopup();

    r = document.createRange();
    r.selectNode(n);
    n.replaceChild(r.createContextualFragment(d.pretty()), n.firstChild);

    y = n.zwy = e.screenY;
    n.showPopup(n, e.screenX + 2, y + 15, "tooltip");

    d.shown = 1;
  },

  hide: function(e, d) {
    d = ZhongWen;
    if(!d.shown || e && e.shiftKey || e && e.type != "mousemove") return;

    d.$("zhongwen").hidePopup();
    d.pos = null;
    d.shown = 0;
  },

  alignMenu: function(n, y, b) {
    y = n.zwy;
    if(y) {
      n.zwy = 0;
      b = n.boxObject;
      if(innerHeight - y < 80 || y + b.height > innerHeight) {
        n.showPopup(n, b.x, y - b.height - 15, "tooltip");
      }
    }
  },

  getDict: function(x) {
    this.dict = 1;
    x = new XMLHttpRequest();
    x.open("GET", this.pref("dict"), true);
    x.overrideMimeType(this.pref("mime"));
    x.onreadystatechange = (function(x) {
      return function() {
        if(x.readyState == 4) {
          ZhongWen.dict = x.responseText;
          x = 0;
        }
      };
    })(x);
    x.send(null);
    x = 0;
  },

  noExpire: function(d) {
    d = ZhongWen;
    if(d.expire == 0) d.dict = 0;
    if(d.expire > 0) d.expire--;
    setTimeout(d.noExpire, 15000);
  },

  pref: function(s, c) {
    return Components.classes["@mozilla.org/preferences-service;1"]
      .getService(Components.interfaces.nsIPrefBranch)
      .getCharPref("zhongwen." + s);
  }
};

window.addEventListener("load", ZhongWen.init, false);
window.addEventListener("unload", ZhongWen.uninit, false);