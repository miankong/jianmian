/*
 *  Copyright (c) 2011, Miankong.cc, RenYi.
 */

(function(){
    /* Global native java interface.
     *      jsi.N(json_param, str_cmd)
     */
    var DBNAME = "met.app.db";
    if (!window.jsi) {
        window.jsi = {
            metaBackCallback: null,

            // XXX: calls back jsi to initiate the actual command.
            // XXX: jsi cannot know whether the key is handled by javascript.
            metaBack: function() {
                if (jsi.metaBackCallback) {
                    jsi.metaBackCallback();
                }
            },

            bindMetaBack: function(fn) {
                if (jsi.metaBackCallback) {
                    console.log("XXXXXXXXXXXXXX bindBtnBack: already bound!");
                }
                jsi.metaBackCallback = fn;
            },

            unbindMetaBack: function(fn) {
                if (jsi.metaBackCallback != fn) {
                    console.log("XXXXXXXXXXXXXX unbindBtnBack: try to remove other's callback");
                }
                jsi.metaBackCallback = null;
            },

            metaMenu: function() {
            },

            metaSearch: function() {
            },

            startApp: function() {
            },

            N: function(json_param, str_cmd) {
                var js_res = prompt(json_param, str_cmd);
                //console.log("jsi.N:RAW RESULT: " + js_res);
                if (js_res) {
                    try {
                        js_res = JSON.parse(js_res);
                    } catch (e) {
                        console.log("" + e);
                        js_res = null;
                    }
                    //console.log("jsi.N:PARSED RESULT: " + (typeof js_res) + " " + js_res);
                } else {
                    js_res = null;
                }
                return js_res;
            },

            cameraCallback: function(success, dataUri) {
                $.delegate(jsi._camRequester, "cameraCallback", success, dataUri);
                jsi._camRequester = null;
            },
            _camRequester: null,    // XXX: non-re-entrant. Fix this.

            activityResultCallback: function(js_str) {
                var json = null;
                if (js_str) {
                    json = JSON.parse(js_str);
                }
                $.delegate(jsi._activityStarter, "activityResult", json);
                jsi._activityStarter = null;
            },
            _activityStarter:null, // XXX: non-re-entrant. Fix this.

			// Polling for the async result.
			
			_pollTimer: null,
			_pollParams: {},	// id -> { count: queried count, success, error: callbacks }
			
			_jsiPoller: function() {
				var done = [];
				$.each(this._pollParams, function(v, k) {
					// k is the id to query on, v is the js callbacks and stats.
                    var finished = false;
                    var res;
                    if ($.isFunction(v.jsiFinished)) {
                        console.log("_jsiPoller: using functor");
                        res = v.jsiFinished(k);
                    } else {
                        res = jsi.N("" + k, v.jsiFinished);
                    }
                    
                    if (res === null || res === true) {
                        finished = true;
                        done.push(k);
                    }
                    if (res === true ) {
                        if ($.isFunction(v.jsiResult))  res = v.jsiResult(k);
                        else    res = jsi.N("" + k, v.jsiResult);

                        if (res == null) {
                            if (v.error) {
                                try {
                                    v.error("bad request: " + res);
                                } catch(e) {
                                    console.log("exception JSI.error: " + e);
                                }
                            }
                        } else {
                            if (v.success) {
                                try {
                                    v.success(res);
                                } catch (e) {
                                    console.log("exception JSI.success: " + e);
                                }
                            }
                        }
                    }
                    if (!finished && ++v.count > 1000) {
                        if (v.error) {
                            v.error("timeout");
                        }
                        done.push(k);
                    }
				});
				for(var i=0; i < done.length; i++) {
					delete this._pollParams[done[i]];
				}
				if (!$.size(this._pollParams)) {
                    console.log("TIMER cleared!");
					clearInterval(this._pollTimer);
					this._pollTimer = 0;
				}
			},

            _setupSqlPoll: function(dbName, id, onFinished) {
                if (!id) {
                    if (onFinished) {
                        onFinished(-1);
                    }
                    return;
                }
                this._pollParams[id] = {
                    count: 0,
                    success: onFinished,
                    error: function(emsg) { console.log("SQL error: " + emsg); },
                    jsiFinished: function(id) { return jsi.N(JSON.stringify([dbName, "" + id]), "jsi:sqlFinished"); },
                    jsiResult: function(id) { return jsi.N(JSON.stringify([dbName, "" + id]), "jsi:sqlResult"); }
                };
                if (!this._pollTimer) {
                    console.log("TIMER setup!");
                    this._pollTimer = setInterval($.bind(this._jsiPoller, this), 50);
                }
            },

        // public methods

            sqlInsert: function(table, columnValues, onFinished, dbName) {
                var cmd = {
                    dbName: dbName ? dbName : DBNAME,
                    op: "insert",
                    args: [table, columnValues]
                };
                var id = jsi.N(JSON.stringify(cmd), "jsi:sql");
                this._setupSqlPoll(cmd.dbName, id, onFinished);
                return id;
            },

            sqlUpdate: function(table, columnValues, where, whereArgs, onFinished, dbName) {
                var cmd = {
                    dbName: dbName ? dbName : DBNAME,
                    op: "update",
                    args: [table, columnValues, where, whereArgs]
                };
                var id = jsi.N(JSON.stringify(cmd), "jsi:sql");
                this._setupSqlPoll(cmd.dbName, id, onFinished);
                return id;
            },

            sqlDelete: function(table, where, whereArgs, onFinished, dbName) {
                var cmd = {
                    dbName: dbName ? dbName : DBNAME,
                    op: "delete",
                    args: [table, where, whereArgs]
                };
                var id = jsi.N(JSON.stringify(cmd), "jsi:sql");
                this._setupSqlPoll(cmd.dbName, id, onFinished);
                return id;
            },

            sqlSelect: function(sql, args, onFinished, dbName) {
                var cmd = {
                    dbName: dbName ? dbName : DBNAME,
                    op: "select",
                    args: (args ? [sql, args] : [sql])
                };
                var id = jsi.N(JSON.stringify(cmd), "jsi:sql");
                this._setupSqlPoll(cmd.dbName, id, onFinished);
                return id;
            },

            getRequestTokenQ: function(url, data) {
                return jsi.N(JSON.stringify({
                    url: url,
                    data: data
                }), "jsi:ajaxGetRequestTokenQ");
            },

            // Start an async http request using oauth signing method.
            // type: "GET" | "POST"
            // url: base url (not including query string)
            // data:
            // success: function(response)
            // error: function(msg){}
            //
            // The native part cannot report the result directly through "loadUrl".
            // It will interrupt the foreground operations such as soft keyboard.

            ajax: function(type, url, data, success, error, accKey, accSecret) {
                type = type || "GET";
                type = type.toUpperCase();
                var desc = type + ": " + url;
                var params = {
                    type: type,
                    url:  url,
                    data: data
                };
                if (accKey && accSecret) {
                    params.accKey = accKey;
                    params.accSecret = accSecret;
                } else {
                    //params.accKey = "";
                    //params.accSecret = "";
                    params.accKey = window.ACC_KEY;
                    params.accSecret = window.ACC_SECRET;
                }
                var id = jsi.N(JSON.stringify(params), "jsi:ajax");
                if (id) {
                    this._pollParams[id] = {
                        count: 0,
                        success: success,
                        error: error,
                        jsiFinished: "jsi:ajaxFinished",
                        jsiResult: "jsi:ajaxResult"
                    };
                    if (!this._pollTimer) {
                        this._pollTimer = setInterval($.bind(this._jsiPoller, this), 50);
                    }
                } else {
                    if (error) {
                        error("error setup background worker.");
                    }
                }
                return id;
            },

            getImage: function(url, success, error) {
            	var id = jsi.N(url, "jsi:imgFetch");
            	if (id) {
            		this._pollParams[id] = {
            			count: 0,
            			success: success,
            			error: error,
            			jsiFinished: "jsi:imgFetchFinished",
            			jsiResult: "jsi:imgFetchResult"
            		}; 
                	if (!this._pollTimer) {
                		this._pollTimer = setInterval($.bind(this._jsiPoller, this), 50);
                	}
            	}
            	return id;
            },

            // callback(success, emsg_or_js_str)
            startActivityForResult: function(clsFullname, strParam, callbackDelegate) {
                jsi._activityStarter = callbackDelegate;
                jsi.N(JSON.stringify({
                    activityClassFullname: clsFullname,
                    activityParam: strParam,
                    onResult: "jsi.activityResultCallback"
                }), "jsi:startActivityForResult")
            },

            cameraSnap: function(obj) {
                jsi._camRequester = obj;
                //jsi.N("jsi.cameraCallback", "jsi:snap");
                jsi.N(JSON.stringify({
                    cbName: "jsi.cameraCallback",
                    width:1024, height:0, hint:"保存图片..."
                }), "jsi:snapIntent");
            },

            isDebug: function() {
                var t = jsi.N("", "jsi:debug");
                console.log("isDebug: " + t);
                return t;
                //return jsi.N("", "jsi:debug") || true;
            },

            getGeoLocation: function() {
                return jsi.N("", "jsi:getGeoLocation");
            },

            loadURL: function(url) {
                jsi.N(url, "jsi:loadURL");
            },

            hideSplash: function() {
                jsi.N("", "jsi:hideSplash");
            },

            hideInputManager: function() {
                jsi.N("", "jsi:hideInputManager");
            },

            finishActivity: function() {
                jsi.N(null, "jsi:finishActivity");
            },

            modalAlert: function(title, msg, noCancel) {
                return jsi.N(JSON.stringify({title:title, msg:msg, noCancel:noCancel ? true:false}), "jsi:modalAlert");
            },

            modalLoadingIndicator: function(msg) {
                jsi.N(msg, "jsi:modalLoadingIndicator");
            },

            closeModalLoadingIndicator: function() {
                jsi.N(null, "jsi:closeModalLoadingIndicator");
            }
        };
    }
    $.DEBUG = jsi.isDebug();


/*------------------------ Views ------------------------------*/

    // Template: holder div in "#templates"
    //      attributes:
    //          view:       a class name in "appNamespace" or empty (default $.View)
    //          delegate:   a class name in "appNamespace"

    // Given a template which has 2 DIVs of ID "tabbed-views" and "tabbar",
    // the view will find out all the tabs in the content of the "tabbar"
    // according to the labels inside it.
    // Then the view will retrieve the templates of its subviews by using
    // the naming convention.
    $.TabbarView = $.View.extend({
        dataMembers: function() {
            return {
                tabNames: null,
                activeTabName: null,
                tabbarHeight: -1,

                activeTabFragment: null,
                subviews: {},
                subviewTabDivs: {},
                $tabbar: null
        };},

        initDataMembers: function() {
            var d = this.dataMembers();
            for(var n in d) { this[n] = d[n]; }
        },

        init: function(tmplSel, appNamespace) {
            this.initDataMembers();
            if (!appNamespace)  appNamespace = theApp.appNamespace;

            this.render();
            var $tmpl = this.fragment;
            this.tabNames = $.map($("#tabbar>div>label", $tmpl), function(label){
                return $(label).attr("id");
            });
            if (!this.tabNames.length)
                throw new Error("TabbarView: empty tab");

            this.$tabbar = $tmpl.find("#tabbar");
            for(var i=0; i < this.tabNames.length; i++) {
                var n = this.tabNames[i],
                    id = this.subviewTmplID(n);
                this.subviewTabDivs[n] = $(this.$tabbar.find("div")[i]);
                this.subviews[n] = $.makeView(this, "#" + id, appNamespace);
            }

            this.changeTab(this.tabNames[0]);
        },

        render: function(force, by) {
            // xxx: you must know what you're doing.
            // xxx: 'force' will destroy the reference hold by 'fragment'
            // xxx: if this view is on stage (screen), you have to remove it manually.
            if ((force && by === this) || !this.fragment) {
                if (this.fragment) {
                    this.disconnect(this.fragment);
                }
                this.fragment = $(this.tmpl);   // skip template render (no need to use it)
                this.connect(this.fragment);
            }
            if (this.activeTabName &&
            (!this.activeTabFragment ||
            (force && (by === this.subviews[this.activeTabName]
            || by === this.subviews[this.activeTabName].delegate)))) {
                // XXX: do not re-render already rendered subview
                // XXX: release the resource of the inactive subview.
                this.activeTabFragment = this.subviews[this.activeTabName].render(force, by).fragment;
                var $t = this.fragment.find("#tabbed-views"),
                    _cls;
                if (_cls = this.subviews[this.activeTabName].cssClass) {
                    $t.addClass(_cls);
                } else {
                    $t.attr("class", "");
                }
                $t.empty().append(this.activeTabFragment);
            }
            return this;
        },

        destroy: function() {
            this._super_.destroy.call(this);
            $.each(this.subviews, function(view, k){
                view.destroy();
                this.subviews[k] = null;
            });
        },

        changeTab: function(tabName) {
            if (this.activeTabName == tabName) {
                //this.subviews[tabName].doDelegate("alreadySwitchedIn");
                return;
            }
            this.render();
            if (!this.activeTabName) {
                for(var i=0; i < this.tabNames.length; i++) {
                    if (this.tabNames[i] == tabName) {
                        this.subviewTabDivs[tabName].addClass("selected");
                    } else {
                        this.subviewTabDivs[this.tabNames[i]].removeClass("selected");
                    }
                }
            } else {
                this.activeTabFragment = null;
                this.subviewTabDivs[this.activeTabName].removeClass("selected");
                this.subviews[this.activeTabName].doDelegate("switchOut");
                this.subviewTabDivs[tabName].addClass("selected");
            }
            this.subviews[tabName].doDelegate("switchIn");
            this.activeTabName = tabName;
            this.render();
        },

        // app delegate msg
        softKeyboard: function(softKShown) {
            if (this.tabbarHeight <= 0) {
                this.computeTabbarHeight();
            }
            if (this.tabbarHeight <= 0) // not on screen yet
                return;

            if (softKShown) {   // hide the tabbar
                this.fragment.find("#tabbed-views").css("margin-bottom", 0);
                this.$tabbar.css("margin-bottom", -this.tabbarHeight);
            } else {
                this.fragment.find("#tabbed-views").css("margin-bottom", this.tabbarHeight);
                this.$tabbar.css("margin-bottom", 0);
            }
        },

        computeTabbarHeight: function() {
            this.tabbarHeight = this.$tabbar.offset().height;
        },

        subviewTmplID: function(tabName) {
            return "tmpl-view-" + tabName;
        }
    });

    $.NavView = $.View.extend({

        dataMembers: function() {
            return {
                TRANSITIONEND: "webkitTransitionEnd",
                viewCache: {},
                viewStack: [],
                elStack: [],
                scrollStack: [],

                $stage: null,
                $navbar: null,
                navbarHomeCls: null,
                navbarHomeHtml: null
            };
        },

        initDataMembers: function() {
            var d = this.dataMembers();
            for( var k in d) {
                this[k] = d[k];
            }
        },

        init: function(tmplSel, appNamespace) {
            this.initDataMembers();

            if (!appNamespace)  appNamespace = theApp.appNamespace;
            $.bindAll(this, "pushView", "popView", "pushTransitionEnd", "popTransitionEnd");
            this.render();
            this.$navbar = this.fragment.find(".navbar");
            this.navbarHomeCls = this.$navbar.klass();
            this.navbarHomeHtml = this.$navbar.html();
            this.$stage = this.fragment.find(".nav-views");
            var homeViewName = this.$stage.attr("data-view");
            this.pushView("#" + this.subviewTmplID(homeViewName), appNamespace);
        },

        render: function(force, by) {
            if ((force && by === this) || !this.fragment) {
                // cannot use the _super_.render, see #1 below.
                var ctx = $.delegate(this.delegate, "templateContext") || {};
                var tmpl = $(this.tmplFn(ctx));

                if (this.fragment) { //this.isInDOM()) {
                    this.disconnect(this.fragment);
                    // xxx: depends on the template having a <div> as the overall holder!
                    $(this.fragment[0]).html($(tmpl[0]).html());
                    this.connect(this.fragment);
                } else {
                    // XXX: #1, do not connect with the default delegate!
                    // XXX: this is mostly a bug! the process of connect/disconnect is messy!
                    this.fragment = tmpl;
                }
                this.doDelegate("viewRendered");
                // _super (View) will take care of disconnect/connect
                //this._super_.call(this);
            }
            if (this.viewStack.length) {
                var view = $.esp(this.viewStack, 0);
                if ((force && (by === view || by == view.delegate)) || !view.fragment) {
                    if (force && by == view) {
                        console.log("NavView.render: ");
                    }
                    // xxx: manipulate subview directly, it won't get connected.
                    var frag = view.render(force, by).fragment;
                    this.$stage.append(frag);
                    //this.elStack[this.elStack.length - 1] = frag;
                    // xxx: hack!
                    view.connect(frag);
                }
            }
            return this;
        },

        pushView: function(tmplSel, appNamespace) {
            var view;
            if (tmplSel instanceof $.View) {
                view = tmplSel;
            } else {
                if (!appNamespace)  appNamespace = theApp.appNamespace;
                if (!(view = this.viewCache[tmplSel])) {
                    view = this.viewCache[tmplSel] = $.makeView(this, tmplSel, appNamespace);
                }
            }

            this.scrollStack.push(0);
            this.viewStack.push(view);
            this.render();
            this.elStack.push(view.fragment);

            this.modifyNavbar();
            scrollTo(0, 0);
            var len = this.viewStack.length;
            if (len > 1) {
                $.esp(this.scrollStack, 1, scrollY);
                $.esp(this.elStack, 0).bind(this.TRANSITIONEND, this.pushTransitionEnd);
                $.defer(this.setTransform, this, len - 1);
            } else {
                this.setTransform(this, 0);
            }
        },

        pushTransitionEnd: function(e) {
            if (e.propertyName != "-webkit-transform")  return;
            $.esp(this.elStack, 0).unbind(this.TRANSITIONEND, this.pushTransitionEnd);
            // XXX: a bit of hack to destruct the rendered nodes.
            $.esp(this.viewStack, 1).disconnect($.esp(this.elStack, 1));
            $.esp(this.viewStack, 1).fragment = null;
            $.esp(this.elStack, 1).empty();
        },

        popToFirst: function() {
            if (this.viewStack.length <= 2) {
                this.popView();
                return;
            }
            for(; this.viewStack.length > 1;) {
                this.viewStack.pop().destroy();
                this.scrollStack.pop();
                this.elStack.pop().remove();
            }
            var view = $.esp(this.viewStack, 0),
                $el = $.esp(this.elStack, 0),
                frag = view.render().fragment;
            if ($el[0] && $el[0].parentNode)
                $el[0].parentNode.replaceChild(frag[0], $el[0]);
            scrollTo(0, $.esp(this.scrollStack, 0));
            $el[0] = frag[0];
            this.setTransform(this, 0);
            this.modifyNavbar();

            var children = this.$stage[0].childNodes;
            console.log("XXXX: children = " + children.length);
        },

        popView: function() {
            if (this.viewStack.length < 2) {
                if (jsi.modalAlert("见面", "确实需要退出？")) {
                    jsi.finishActivity();
                }
                return;
            }
            this.scrollStack.pop();
            var view = $.esp(this.viewStack, 1),
                $el = $.esp(this.elStack, 1);
            // xxx: hack! manipulate subview directly, it won't get connected.
            var frag = view.render().fragment;

            frag[0].style.cssText = "-webkit-transform: translate3d(-" +
                (this.viewStack.length - 1) + "00%,0,0)";
            // use this to protect against the edge case: empty timeline -> 1 item.
            // in which case the .fragment is cleared.
            if ($el[0] && $el[0].parentNode)
                $el[0].parentNode.replaceChild(frag[0], $el[0]);

            // xxx: hack around
            view.connect(frag);

            scrollTo(0, $.esp(this.scrollStack, 0));
            // XXX: hack around the limitation of the "$"
            $el[0] = view.fragment[0];

            view.fragment.bind(this.TRANSITIONEND, this.popTransitionEnd);
            $.defer(this.setTransform, this, this.viewStack.length - 2);
        },

        popTransitionEnd: function(e) {
            if (e.propertyName != "-webkit-transform")  return;
            $.esp(this.elStack, 1).unbind(this.TRANSITIONEND, this.popTransitionEnd);
            this.viewStack.pop().destroy();
            this.elStack.pop();
            this.modifyNavbar();
        },

        setTransform: function(self, n) {
            var children = self.$stage[0].childNodes,
                len = children.length;
            for(var i=0; i < len; i++) {
                var node = children.item(i);
                if (node.nodeType != 1) continue;
                var s = "-webkit-transform:translate3d(" + (n ? ("-" + n + "00%"): "0") + ",0,0)",
                    css = children.item(i).style.cssText;
                if (css) {
                    var t = css.replace(/-webkit-transform\s*:\s*[^;]*/ig, s);
                    if (t == css) {
                        css += ";" + s;
                    } else {
                        css = t;
                    }
                } else {
                    css = s;
                }
                children.item(i).style.cssText = css;
            }
        },

        modifyNavbar: function() {
            var len = this.viewStack.length,
                view = this.viewStack[len - 1],
                html, cls;
            if (len > 1) {
                var title = view.doDelegate("onGetTitle");
                //console.log("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX\n"+title);
                html = '<div class="btn left" data-touchable="popView"><label class="black">后退</label></div>'
                    + (title ? '<h1>' + title + '</h1>':"")
                    + '<div class="btn icon" data-touchable="popToFirst">'
                    +   '<label class="black nav-home"></label></div>';
                cls = "navbar";
            } else {
                html = this.navbarHomeHtml;
                cls = this.navbarHomeCls;
            }
            this.disconnect(this.$navbar, this);
            this.$navbar.klass(cls);
            this.$navbar.empty().html(html);
            this.connect(this.$navbar, this);
        },

        subviewTmplID: function(viewName) {
            return "tmpl-view-" + viewName;
        },

        switchIn: function() {
            jsi.bindMetaBack(this.popView);
        },

        switchOut: function() {
            jsi.unbindMetaBack(this.popView);
        }
    });

    var makeActionSheet = function(parentView, tmplSel, delegate) {
        var view = $.makeView(parentView, tmplSel, {}, true);
        view.delegate = delegate;
        return view;
    };

    //  :param config.rootView:     view instance as the root of the app
    //  :param config.stageSel:     optional, the dom selector for the views.
    var App = function(config){
        $.extend(this, config || {});
        this.init();
    };

    $.extend(App.prototype, {
        aboveAll: null,
        $aboveAll: null,
        actionView: null,

        rootView: null,
        stageSel: "#app",

        init: function() {
            if (!this.rootView) {
                throw new Error("App: no rootView!");
            }

            $.clicker.init();

            var el = this.$el = $(this.stageSel);
            el.empty();
            el.append(this.rootView.render().fragment);

            this.$aboveAll = $(this.aboveAll || "#above-all");

            $.bindAll(this, "resize", "actionSheetClose");

            this.prevSize.w = window.innerWidth;
            this.prevSize.h = window.innerHeight;
            $(window).bind("resize", this.resize);//, true);
        },

        actionSheet: function(tmplSel, delegate, loading) {
            var self = this;
            // hack around circular reference
            if (!delegate)
                delegate = this;
            delegate.cancel = this.actionSheetClose;

            this.actionView = makeActionSheet(null, tmplSel, delegate);
            this.actionView.render();

            $(document.body).css("overflow-y", "hidden");
            this.$aboveAll.height(scrollY + innerHeight);

            this.$aboveAll.find(".action-sheet")
                .append(this.actionView.fragment)
                .css("height", loading ? "100%":"auto")
                .addClass("show");
        },

        actionSheetClose: function() {
            if (!this.actionView)   return;

            this.actionView.disconnect(this.actionView.fragment);
            var $act = this.$aboveAll.find(".action-sheet");
            $act.empty()
                .removeClass("show");
            this.$aboveAll.height(0);
            $(document.body).css("overflow-y", "auto");
            this.actionView = null;
        },

        resize: function(){
            var w = window.innerWidth,
                h = window.innerHeight;
            if (this.prevSize.w == w) {
                var oh = this.prevSize.h;
                if (oh > h + 60) {
                    console.log("SoftKeyboard: possible shown.");
                    this.showedHideCount++;
                    $.delegate(this.rootView, "softKeyboard", true);
                } else if (oh + 60 < h) {
                    console.log("SoftKeyboard: possible hide.");
                    this.showedHideCount++;
                    $.delegate(this.rootView, "softKeyboard", false);
                }
            }
            this.prevSize.w = w;
            this.prevSize.h = h;
        },

        // cached references
        $el: null,
        // internal state keepers
        prevSize: {
            w: 0,
            h: 0
        },
        showedHideCount: 0
    });

    window.App = App;

})();