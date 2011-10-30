/*
 *  Copyright (c) 2011, Miankong.cc, RenYi.
 *  All rights reserved.
 *
 */

(function($){

    /*---------------------------------------------------------------------*/

    var TMetOnce = $.Model.extend({
        DELIMITER: /[\s,;，；]+/i,
        AT: /^[@]/ig,

        saving: false,
        delegate: null,

        defaults: {
            nameList: [],   // preserves the order.
            user_gid:null,
            met:    {},     // object, keys are people's screen_name, values are
                            // another object containing {profile_image_url, sinaProfileGid, metProfileGid}
            words:  "",     // words to be said
            file:   "",     // url (either content:// or http://)
            geo:    {lat:0,lon:0},
            created_at: function() { return $.Mepoch.time() / 1000; },
                            // seconds since epoch
            syncToWeibo: true
        },

        init: function() {
            this.set({
                nameList:[], user_gid:window.MY_GID,
                met: {}, words:"", file:null, geo:{lat:0, lon:0},
                created_at: $.Mepoch.time()/1000,
                syncToWeibo:true
            }, {silent:true});
        },

        canPost: function() {
            return $.keys(this.get('met')).length && this.get('file');
        },

        updateMetList: function(s, opts) {
            var met={}, nm = this.splitNames(s), names=[];
            for(var i=0; i < nm.length; i++) {
                if (met[nm[i]]) continue;
                names[names.length] = nm[i];
                met[nm[i]] = {};
            }
            this.set({met:met, nameList:names}, opts);
        },

        splitNames: function(s) {
            var sa = s.split(this.DELIMITER),
                res = [];
            for(var i=0, n=sa.length; i < n; i++) {
                if (!sa[i]) continue;
                res.push(sa[i].replace(this.AT, ''));
            }
            return res;
        },

        save: function(){
            if (this.saving)    return;
            this.saving = true;

            var url = theApp.appNamespace.HOST + "/api/met/create",
                data = {}, self = this;

            $.each(["nameList", "words", "file", "geo", "syncToWeibo"], function(k){
                data[k] = this.get(k);
            }, this);
            data.met = data.nameList;
            delete data.nameList;

            //console.log("POSTING: " + JSON.stringify(data));

            jsi.ajax("POST", url, data, function(metOnce){
                $.delegate(self.delegate, "onSaved", metOnce);
                self.saving = false;
            }, function(emsg){
                $.delegate(self.delegate, "onSaved", null, emsg);
                self.saving = false;
            });
        }
    },{
        saving: false,
        delegate: null
    });

    var SnapCtrl = function(view) {
        this.view = view;
        this.init();
    };
    $.extend(SnapCtrl.prototype, {
        step: 1,

        init: function() {
            this.model = new TMetOnce;
            this.model.delegate = this;
            $.bindAll(this, "quit");
        },

        viewCreated: function() {
            this.view.tmplFn = $.template(templates.tmplSnapWizard);
        },

        templateContext: function(){
            var m = this.model.asMap();
            m.nameList = m.nameList.join(",");
            m.oneTimeHintDisplayed = appNamespace.SNAP_HINT_DISPLAYED;
            m.step = this.step;
            return m;
        },

        updatePic: function() {
            var uri = this.model.get("file");
            if (!uri) {
                this.view.fragment.find(".attachment").empty();
                this.view.fragment.find("label.cam").text("添加照片");
            } else {
                //console.log("URI: " + uri);
                this.view.fragment.find(".attachment").html(
                    '<img src="' + uri + '" class="pic">'
                );
                this.view.fragment.find("label.cam").text("更改照片");
            }
        },

        optsSyncToWeibo: function() {
            var b = this.model.get("syncToWeibo");
            this.model.set({syncToWeibo:!b});
            this.view.fragment.find("#sync-to-weibo").removeClass(b ? "checked":"unchecked");
            this.view.fragment.find("#sync-to-weibo").addClass(b ? "unchecked":"checked");
        },

        camera: function() {
            // initiate the cam and get the result.
            jsi.cameraSnap(this);
        },

        // message from jsi native interface
        cameraCallback: function(success, data_uri) {
            if (success) {
                this.model.set({file: data_uri});
                this.updatePic();
            }
        },

        validateStep1: function() {
            if (this.view.fragment) {
                var val = this.view.fragment.find("#default-focus").attr("value");
                this.model.updateMetList(val);
                var nameList = this.model.get("nameList"),
                    sNameList = null;
                if (nameList) {
                    sNameList = nameList.join(", ");
                    this.view.fragment.find(".met-list").text(
                        "我见到了" + sNameList
                    );
                }
                return sNameList ? null:"请输入至少一个见到的、想见的或者想着的人的昵称";
            }
            return null;
        },
        validateStep2: function() {
            return this.model.canPost() ? null: "请照相留念";
        },

        nextStep: function() {
            if (this.step == 3) {
                var loc = jsi.getGeoLocation();
                if (loc) {
                    this.model.set({geo:loc}, {silent: true});
                }
                this.model.set({
                    words: this.view.fragment.find("textarea").val()
                }, {silent: true});
                $.defer(function(self){
                    //theApp.actionSheet("#tmpl-loading", null, true);
                    jsi.modalLoadingIndicator("正在发布...");
                    self.model.save();
                }, this);
                return;
            }
            var emsg = $.call(this, "validateStep" + this.step);
            if (!emsg) {
                this.view.fragment.find(".whole")
                .removeClass("step" + this.step)
                .addClass("step" + (this.step+1));
                this.step++;
            } else {
                jsi.modalAlert("", emsg, true);
            }
        },
        prevStep: function() {
            if (this.step == 1) return;
            this.view.fragment.find(".whole")
            .removeClass("step" + this.step)
            .addClass("step" + (this.step - 1));
            this.step--;
        },

        onSaved: function(metOnce, emsg) {
            //theApp.actionSheetClose();
            jsi.closeModalLoadingIndicator();
            if (emsg) {
                jsi.modalAlert("", emsg, true);
                return;
            }
            if (metOnce) {
                this.step = 1;
                this.model.init();
                this.view.render(true, this);
                appNamespace.TimelineCtrl.prepend(metOnce);
                $.delegate(theApp.rootView, "changeTab", "home");
            }
        },

        quit: function() {
            if (jsi.modalAlert("见面", "确实需要退出？")) {
                this.switchOut();
                jsi.finishActivity();
            }
        },

        switchIn: function() {
            jsi.bindMetaBack(this.quit);
        },

        switchOut: function() {
            jsi.unbindMetaBack(this.quit);
        }
    });

    var SnapInOneCtrl = function(view) {
        this.view = view;
        this.init();
    };
    $.extend(SnapInOneCtrl.prototype, {
        timerID: 0,

        init: function() {
            this.model = new TMetOnce;
            this.model.delegate = this;
            this.data = this.model; // XXX: don't have time to debug this
            $.bindAll(this, "onChange", "quit");
        },

        viewCreated: function() {
            this.view.tmplFn = $.template(templates.tmplSnap);
        },

        templateContext: function(){
            var m = this.model.asMap();
            m.nameList = m.nameList.join(",");
            m.oneTimeHintDisplayed = appNamespace.SNAP_HINT_DISPLAYED;
            return m;
        },

        updateNavbar: function() {
            if (!this.view.fragment)    return;

            var val = this.view.fragment.find("#default-focus").attr("value");
            this.model.updateMetList(val);

            if (this.model.canPost())
                this.view.fragment.find("#navbar-done-label").text("发布");
            else
                this.view.fragment.find("#navbar-done-label").text("照相");
        },

        onChange: function() {
            if (this.view.fragment) {
                var val = this.view.fragment.find("#default-focus").attr("value");
                this.model.updateMetList(val);
                this.updateNavbar();
            }
            var loc = jsi.getGeoLocation();
            if (loc) {
                this.model.set({geo:loc});
            }
        },

        updatePic: function() {
            var uri = this.model.get("file");
            if (!uri) {
                this.view.fragment.find(".attachment").empty();
            } else {
                console.log("URI: " + uri);
                this.view.fragment.find(".attachment").html(
                    '<img src="' + uri + '" class="pic">'
                );
            }
            this.updateNavbar();
        },

        optsSyncToWeibo: function() {
            var b = this.model.get("syncToWeibo");
            this.model.set({syncToWeibo:!b});
            this.view.fragment.find("#sync-to-weibo").removeClass(b ? "checked":"unchecked");
            this.view.fragment.find("#sync-to-weibo").addClass(b ? "unchecked":"checked");
        },

        cancel: function() {
            this.model.init();
            this.view.render(true, this);
        },

        onSaved: function(metOnce, emsg) {
            //theApp.actionSheetClose();
            jsi.closeModalLoadingIndicator();
            if (metOnce) {
                this.cancel();
                appNamespace.TimelineCtrl.prepend(metOnce);
                $.delegate(theApp.rootView, "changeTab", "home");
            }
        },

        done: function() {
            this.onChange();
            this.model.set({
                words: this.view.fragment.find("textarea").val()
            });

            if (!this.model.canPost()) {
                this.camera();
                return;
            }
            // XXX: adding & using jsi to hide the keyboard
            jsi.hideInputManager();

            $.defer(function(self){
                //theApp.actionSheet("#tmpl-loading", null, true);
                jsi.modalLoadingIndicator("正在发布...");
                self.model.save();
            }, this);
        },

        camera: function() {
            // initiate the cam and get the result.
            jsi.cameraSnap(this);
        },

        // message from jsi native interface
        cameraCallback: function(success, data_uri) {
            if (success) {
                this.model.set({file: data_uri});
                this.updatePic();
            }
        },

        quit: function() {
            if (jsi.modalAlert("见面", "确实需要退出？")) {
                this.switchOut();
                jsi.finishActivity();
            }
        },

        switchIn: function() {
            jsi.bindMetaBack(this.quit);
            if (this.view.fragment) {
                this.timerID = setInterval(this.onChange, 50);
                this.view.fragment.find("#default-focus").bind("keyup", this.onChange);
            }
        },

        switchOut: function() {
            jsi.unbindMetaBack(this.quit);
            if (this.view.fragment) {
                if (this.timerID > 0) {
                    clearInterval(this.timerID);
                    this.timerID = 0;
                }
                this.view.fragment.find("#default-focus").unbind("keyup", this.onChange);
            }
        },

        dismissHint: function() {
            appNamespace.SNAP_HINT_DISPLAYED = true;
            if (this.view.fragment) {
                var frag = this.view.fragment.find(".snap-one-time-hint");
                this.view.disconnect(frag);
                frag.remove();
            }
            jsi.sqlInsert("keyvalue", {
                key: appNamespace.SNAP_HINT_DISPLAYED_KEY,
                value: "1"
            }, function(lastRow){});
        }
    });


    /*---------------------------------------------------------------------*/
    var MetOnceDetail = $.Model.extend({
        lastRefresh: 0, // seconds since epoch of the last refreshing
        fetching: false,
        delegate: null,

        defaults: {
            x: {
                gid:0,
                userScreenName:"",
                user_gid:"", user: {}, file:"", words:"", met:{}, favored_by:[],
                created_at:function(){ return new Date(); }
            }
        },

        patch: function(detail) {
            if (detail == null) return;
            if (detail.created_at) {
                detail.created_at = new Date(detail.created_at * 1000);
            }
            if (detail._s_gid) {
                detail.gid = detail._s_gid;
                delete detail._s_gid;
            }
            if (detail._s_user_gid) {
                detail.user_gid = detail._s_user_gid;
                delete detail._s_user_gid;
            }
            var sender = '', pre=[];
            var x = detail.user, i;
            if (x._s_gid) { x.gid = x._s_gid; delete x._s_gid; }
            $.each(detail.met, function(v, k) {
                if (v._s_metProfileGid) {
                    v.metProfileGid = v._s_metProfileGid;
                    delete v._s_metProfileGid;

                    if (v.metProfileGid == detail.user_gid) {
                        detail.user_profile_image_url = v.profile_image_url;
                        sender = k;
                    } else {
                        pre[pre.length] = k;
                    }
                }
                if (v._s_sinaProfileGid) {
                    v.sinaProfileGid = v._s_sinaProfileGid;
                    delete v._s_sinaProfileGid;
                }
            });
            for(x=detail.favored_by, i=0; i < x.length; i++) {
                if (x[i]._s_gid) { x[i].gid = x[i]._s_gid; delete x[i]._s_gid; }
            }

            detail.userScreenName = sender;
            if (detail.user_gid == window.MY_GID)
                sender = "我";
            detail.pre = sender + "见到了" + pre.join("、") + "：";
            //console.log("MetOnceDetail: patched = \n" + JSON.stringify(detail));
        },

        refresh: function(force, post_gid, api_url) {
            var url = api_url || (appNamespace.HOST + "/api/met/get"),
                data = {id: post_gid};
            this.ajaxFetch(url, data, function(self, response){
                self.patch(response);
                self.set({x: response}, {silent: true});
            }, null);

        }
    }, {
        lastRefresh: 0,
        fetching: false,
        delegate: null
    });

    var MetOnceDetailCtrl = function(view, postGid, screenName) {
        this.postGid = postGid;
        this.screenName = screenName;
        this.view = view;
        this.init();
    };
    $.extend(MetOnceDetailCtrl.prototype, {
        postGid: 0,
        view:   null,
        model:  null,

        init:   function() {
            this.model = new MetOnceDetail;
            this.model.delegate = this;
        },

        viewCreated: function() {
            this.view.tmplFn = $.template(templates.tmplMetOnceDetail);
            $.defer(function(self){
                self.refresh();
            }, this);
        },

        onGetTitle: function() {
            //var title = this.model.get("pre");
            //console.log("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
            //console.log("MetOnceDetailCtrl.onGetTitle: " + this.screenName);
            return this.screenName ? this.screenName + "见到了...":"";
        },

        templateContext: function() {
            var x = this.model.get("x");
            x["HOST"] = this.view.appNamespace.HOST;
            return {x: x};
        },

        refresh: function() {
            this.model.refresh(false, this.postGid);
        },

        onRefreshed: function() {
            console.log("ON REFRESHED");
            // force a re-render if it is the current view in the nav.
            this.view.parent.render(true, this);
        },

        pushView: function(tmplSel) {
            this.view.parent.pushView(tmplSel);
        },

        pushProfileView: function(metProfileGid) {
            var appNamespace = this.view.appNamespace;
            var x = metProfileGid.split(":");
            appNamespace.ProfileCtrl = new ProfileCtrl(null, x[0], x[1] );
            var view = $.makeView(this.view.parent, "#tmpl-view-profile", appNamespace, true);
            this.view.parent.pushView(view);
        },

        pushFavoredBy: function(postGid) {
            pushListOfMetProfiles(this, "favored_by", postGid, undefined, undefined);
        },

        favorite: function(postGid) {
            //theApp.actionSheet("#tmpl-loading", null, true);
            jsi.modalLoadingIndicator("正在发布...");
            var url = theApp.appNamespace.HOST + "/api/rel/like";
            relOperation(this, url, postGid, function(self){
                var f = self.view.fragment.find(".sel-fav-op");
                self.view.disconnect(f, this);
                f.remove();
                self.view.appNamespace.myMetProfile.set({
                    favorite_count:self.view.appNamespace.myMetProfile.get("favorite_count") + 1
                }, {silent:true});
            });
        }
    });

    var relOperation = function(self, url, gid, fnSuccess) {
        //theApp.actionSheet("#tmpl-loading", null, true);
        var data = {id: gid};
        jsi.ajax("POST", url, data, function(response){
            if (response) {
                fnSuccess(self);
            }
            jsi.closeModalLoadingIndicator();
            //theApp.actionSheetClose();
        }, function(emsg){
            jsi.closeModalLoadingIndicator();
            //theApp.actionSheetClose();
        });
    };

    var pushListOfMetProfiles = function(self, relName, id, count, until) {
        var appNamespace = self.view.appNamespace;
        appNamespace.ListOfMetProfilesCtrl = new ListOfMetProfilesCtrl(
            null, relName, id, count, until
        );
        var view = $.makeView(self.view.parent, "#tmpl-view-profile-list", appNamespace, true);
        self.view.parent.pushView(view);
    };

    /*---------------------------------------------------------------------*/
    var TimelineModel = $.Model.extend({
        lastRefresh: 0, // seconds since epoch of the last refreshing
        fetching: false,
        delegate: null,

        defaults: {
            mets: [],       // in the order of insertion
            metGids: {}     // prevent duplicates
        },

        patch: function(metOnce) {
            //console.log("PATCHED");
            var sender = '', pre=[];
            if (metOnce._s_gid) {
                metOnce.gid = metOnce._s_gid;
                delete metOnce._s_gid;
            }
            if (metOnce._s_user_gid) {
                metOnce.user_gid = metOnce._s_user_gid;
                delete metOnce._s_user_gid;
            }
            $.each(metOnce.met, function(v, k) {
                if (v._s_metProfileGid) {
                    v.metProfileGid = v._s_metProfileGid;
                    delete v._s_metProfileGid;
                    if (v.metProfileGid == metOnce.user_gid) {
                        metOnce.user_profile_image_url = v.profile_image_url;
                        sender = k;
                    } else {
                        pre[pre.length] = k;
                    }
                }
                if (v._s_sinaProfileGid) {
                    v.sinaProfileGid = v._s_sinaProfileGid;
                    delete v._s_sinaProfileGid;
                }
            });
            metOnce.userScreenName = sender;
            if (metOnce.user_gid == window.MY_GID)
                sender = "我";
            metOnce.pre = sender + "见到了" + pre.join("、") + "：";
        },

        prepend: function(metOnce) {
            this.patch(metOnce);
            var metGids = this.get("metGids");
            if (!metOnce.gid || metGids[metOnce.gid])  return;
            metGids[metOnce.gid] = true;
            this.set({metGids: metGids}, {silent:true});

            if (!metOnce.created_at) {
                metOnce.created_at = $.Mepoch.time() / 1000;
            }
            var mets = this.get("mets"),
                anotherDay = false;
            if (mets && mets.length) {
                var n = new Date(metOnce.created_at * 1000),
                    t = new Date(mets[0].created_at * 1000);
                if (t.getDate() != n.getDate())
                    anotherDay = true;
            }
            mets = [metOnce].concat(mets);
            this.set({mets: mets});
            $.delegate(this.delegate, "onPrepend", metOnce, mets.length == 1, anotherDay);
        },

        _add: function(metOnce) {
            this.patch(metOnce);
            var metGids = this.get("metGids");
            if (!metOnce.gid || metGids[metOnce.gid])  return;
            metGids[metOnce.gid] = true;
            this.set({metGids: metGids}, {silent:true});

            var mets = this.get("mets");
            mets[mets.length] = metOnce;
            this.set({mets: mets}, {silent: true});
        },

        refresh: function(force, user_id, is_mine, api_url) {
            var url = api_url || (appNamespace.HOST + "/api/met/timeline"),
                data = {count:12};
            if (user_id)    data["user_id"] = user_id;
            if (is_mine)    data["is_mine"] = is_mine;
            this.ajaxFetch(url, data, function(self, response){
                self.set({
                    mets: [],
                    metGids: {}
                }, {silent:true});

                for(var i=0; i < response.length; i++) {
                    self._add(response[i]);
                }
            }, null, "正在读取最新信息...");

        },

        moreItems: function() {
            // get more MetOnce prior to the last one already had.
        }
    }, {
        lastRefresh: 0, // seconds since epoch of the last refreshing
        fetching: false,
        delegate: null
    });

    var TimelineCtrl = function(view) {
        this.view = view;
        this.init();
    };

    $.extend(TimelineCtrl.prototype, {
        rowTmpl: null,
        view:   null,
        model:  null,

        init:   function() {
            this.rowTmpl = $.template(templates.tmplTimelineItem);
            this.model = new TimelineModel;
            this.model.delegate = this;
            $.defer(function(self){
                self.refresh();
            }, this);
        },

        viewCreated: function() {
            this.view.tmplFn = $.template(templates.tmplTimeline);
        },

        switchIn: function(){
        },

        onGetTitle: function() {
            //console.log("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
            //console.log("TimelineCtrl.onGetTitle: " + this.screenName);
            return this.screenName ? this.screenName + "见过的":"";
        },

        templateContext: function() {
            var d = this.model.get("mets");
            return {data:d, person:null};
        },

        refresh: function() {
            this.model.refresh();
        },

        onRefreshed: function() {
            console.log("ON REFRESHED");
            // force a re-render if it is the current view in the nav.
            this.view.parent.render(true, this);
        },

        prepend: function(metOnce) {
            this.model.prepend(metOnce);
        },

        onPrepend: function(metOnce, firstOne, anotherDay) {
            // use a delegated msg to let model remove the duplicates.
            if (firstOne) {
                // XXX: it's okay to remove blindly. The empty content does not have listeners.
                this.view.fragment.remove();
                this.view.fragment = null;
                this.view.parent.render();
                return;
            }
            var $el = this.view.fragment;
            if (!$el)   return;

            console.log("XXXXXX: " + JSON.stringify(metOnce));
            
            metOnce["anotherDay"] = anotherDay;
            if (anotherDay) {
                console.log("ANOTHER DAY");
                $el.find(".sel-today").remove();
                $el.find("ul.table .sel-timeline").prepend(this.rowTmpl(metOnce));
            } else {
                console.log("SAME DAY");
                var t = $el.find(".sel-today")[0];
                if (t && t.parentNode) {
                    t = $(t.parentNode);
                    t.after(this.rowTmpl(metOnce));
                    t.remove();
                }
            }
            this.view.connect(this.view.fragment, this.view.delegate);
        },

        changeTab: function(tabName){
            this.view.parent.parent.changeTab(tabName);
        },

        pushProfileView: function(metProfileGid) {
            var appNamespace = this.view.appNamespace;
            var x = metProfileGid.split(":");
            appNamespace.ProfileCtrl = new ProfileCtrl(null, x[0], x[1]);
            var view = $.makeView(this.view.parent, "#tmpl-view-profile", appNamespace, true);
            this.view.parent.pushView(view);
        },

        pushDetailView: function(metGid) {
            //console.log("XXXXXXXXXXXXXXXXXXXX: pushDetailView: " + metGid);
            var appNamespace = this.view.appNamespace;
            var x = metGid.split(":");
            appNamespace.MetOnceDetailCtrl = new MetOnceDetailCtrl(null, x[0], x[1]);
            var view = $.makeView(this.view.parent, "#tmpl-view-detail", appNamespace, true);
            this.view.parent.pushView(view);
        }
    });

    /*---------------------------------------------------------------------*/
    var ListOfMetProfile = $.Model.extend({
        fetching: false,
        lastRefresh: 0,
        delegate: null,

        defaults: {
            count: 0,
            result: []
        },

        patch: function(v) {
            if (v && v.result) {
                for(var i=0; i < v.result.length; i++) {
                    $.each(["gid", "user_gid", "acc_key", "sinaProfileGid", "metProfileGid"], function(k){
                        if (v.result[i]["_s_" + k]) {
                            v.result[i][k] = v.result[i]["_s_" + k];
                            delete v.result[i]["_s_" + k];
                        }
                    });
                }
            }
        },

        relToHint: function(relName, screenName) {
            return relName == "following" ? (screenName ? screenName+"的":"") + "关注列表":(
                relName == "followers" ? (screenName ? screenName+"的":"") + "粉丝列表" : (
                relName == "met" ? (screenName ? screenName:"我") + "见过的": (
                relName == "been_met" ? (screenName ? "见过"+screenName+"的":"见过我的") : (
                relName == "favorites" ? (screenName ? screenName:"我") + "喜欢的" : (
                relName == "favored_by" ? "喜欢的人" : ""
                )))));
        },

        refresh: function(force, relName, id, count, until) {
            var url = appNamespace.HOST + "/api/rel/show/" + relName + ".json",
                data = {id: id};
            if (count)  data["count"] = count;
            // XXX: convert to seconds since epoch
            if (until)  data["until"] = until;
            this.ajaxFetch(url, data, function(self, response){
                self.patch(response);
                self.set(response);
            }, null, "正在读取...");

        }
    });

    var ListOfMetProfilesCtrl = function(view, relName, id, count, until) {
        this.view = view;
        this.relName = relName;
        this.count = count;
        this.until = until;
        var x = id.split(":");
        this.id = x[0];
        this.screenName = x[1];
        //if (!x[1]) {
            //throw new Error("ListOfMetProfileCtrl: no screen name attached!");
        //}
        this.init();
    };
    $.extend(ListOfMetProfilesCtrl.prototype, {
        init: function() {
            this.model = new ListOfMetProfile;
            this.model.delegate = this;
        },

        templateContext: function() {
            var m = this.model.asMap();
            return {
                x: m.result,
                count: m.count
            };
        },

        onGetTitle: function() {
            var t = this.model.relToHint(this.relName, this.screenName);
            //console.log("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
            //console.log("ListOfMetProfileCtrl.onGetTitle:" + t + " screenName = " + this.screenName);
            return t;
        },

        viewCreated: function() {
            this.view.tmplFn = $.template(templates.tmplListOfMetProfiles);
            $.defer(function(self){
                self.refresh();
            }, this);
        },

        refresh:function(){
            this.model.refresh(false, this.relName, this.id, this.count, this.until);
        },

        onRefreshed: function() {
            this.view.parent.render(true, this);
        },

        pushProfileView:function(metProfileGid) {
            var appNamespace = this.view.appNamespace;
            var x = metProfileGid.split(":");
            appNamespace.ProfileCtrl = new ProfileCtrl(null, x[0], x[1]);
            var view = $.makeView(this.view.parent, "#tmpl-view-profile", appNamespace, true);
            this.view.parent.pushView(view);
        }
    });

    /*---------------------------------------------------------------------*/
    var MetProfile = $.Model.extend({
        fetching: false,
        lastRefresh: 0,
        delegate: null,

        defaults: {
            screen_name: null,
            profile_image_url: null,
            gid: null,
            gender: null,
            description: null,
            //
            met_count:0,
            being_met_count:0,
            following_count:0,
            follower_count:0,
            favorite_count:0,
            recent_met:null,    // list MetOnce object
            am_i_following: false,
            num_of_met:0,
            last_time_of_met:0
        },

        _patch: function(values) {
            $.each(["gid", "user_gid", "acc_key", "sinaProfileGid", "metProfileGid"], function(k){
                if (values["_s_" + k]) {
                    values[k] = values["_s_" + k];
                    delete values["_s_" + k];
                }
            });
        },

        patch: function(metProfile) {
            this._patch(metProfile);
            for(var i=0; metProfile.recent_met && i < metProfile.recent_met.length; i++) {
                this._patch(metProfile.recent_met[i]);
                for(var j=0, met=$.values(metProfile.recent_met[i]["met"]); j < met.length; j++) {
                    this._patch(met[j]);
                }
            }
        },

        refresh: function(force, user_id) {
            var url = appNamespace.HOST + "/api/profile/get",
                data = {};
            if (user_id)    data["user_id"] = user_id;
            this.ajaxFetch(url, data, function(self, response){
                self.patch(response);
                self.set(response);
            }, null, "正在读取个人信息...");

        }
    }, {
        fetching: false,
        lastRefresh: 0,
        delegate: null
    });

    var OptsCtrl = function(view) {
    	this.view = view;
    	this.init();
    };
    $.extend(OptsCtrl.prototype, {
    	view: null,
        model: null,
    	
    	init: function() {
            this.model = this.view.appNamespace.myMetProfile;
            this.model.delegate = this;
    	},

        viewCreated: function() {
            this.view.tmplFn = $.template(templates.tmplOpts);
            $.defer(function(self){
                self.refresh();
            }, this);
        },

        switchIn: function() {
            //$.defer(function(self){
            //    self.model.refresh();
            //}, this);
            //this.model.refresh();
        },

        templateContext: function() {
            var m = this.model.asMap();
            return {
                myGID: m.gid,
                x: m
            };
        },

        viewRendered: function() {
            // connect clickers
        },

        refresh: function() {
            this.model.refresh();
        },

        onRefreshed: function() {
            console.log("Opts.onRefreshed");
            this.view.parent.render(true, this);
        },

        pushView: function(tmplSel) {
            this.view.parent.pushView(tmplSel);
        }
    });

    var MyTimelineCtrl = function(view, metProfileGid, screenName) {
        this.metProfileGid = metProfileGid;
        this.screenName = screenName;
        this.view = view;
        this.init();
    };
    $.extend(MyTimelineCtrl.prototype, TimelineCtrl.prototype);
    $.extend(MyTimelineCtrl.prototype, {
        init:   function() {
            this.rowTmpl = $.template(templates.tmplTimelineItem);
            this.model = new TimelineModel;
            this.model.delegate = this;
        },

        viewCreated: function() {
            this.view.tmplFn = $.template(templates.tmplTimeline);
            $.defer(function(self){
                self.model.refresh(false, self.metProfileGid, true);
            }, this);
        },

        refresh: function() {
            this.model.refresh(false, this.metProfileGid, true);
        }
    });

    var FavTimelineModel = TimelineModel.extend({
        refresh: function(force, metProfileGid, count, until) {
            var url = appNamespace.HOST + "/api/rel/show/favorites.json",
                data = {id: metProfileGid};
            if (count)  data["count"] = count;
            // XXX: convert to seconds since epoch
            if (until)  data["until"] = until;
            this.ajaxFetch(url, data, function(self, response){
                self.set({
                    mets: [],
                    metGids: {}
                }, {silent:true});

                for(var i=0; i < response.length; i++) {
                    self._add(response[i]);
                }
            }, null, "正在读取我喜欢的...");

        }
    });

    var FavTimelineCtrl = function(view, metProfileGid, screenName) {
        this.metProfileGid = metProfileGid;
        this.screenName = screenName;
        this.view = view;
        this.init();
    };
    $.extend(FavTimelineCtrl.prototype, MyTimelineCtrl.prototype);
    $.extend(FavTimelineCtrl.prototype, {
        init:   function() {
            this.rowTmpl = $.template(templates.tmplTimelineItem);
            this.model = new FavTimelineModel;
            this.model.delegate = this;
        },

        onGetTitle: function() {
            return this.screenName ? this.screenName + "喜欢的":"";
        },

        viewCreated: function() {
            this.view.tmplFn = $.template(templates.tmplTimeline);
            $.defer(function(self){
                self.model.refresh(false, self.metProfileGid);
            }, this);
        },

        refresh: function() {
            this.model.refresh(false, this.metProfileGid);
        }
    });


    var ProfileCtrl = function(view, metProfileGid, screenName) {
        this.metProfileGid = metProfileGid;
        this.screenName = screenName;
        //if (!screenName) {
        //    throw new Error("ProfileCtrl: no screenName!")
        //}
        this.view = view;
        this.init();
    };
    $.extend(ProfileCtrl.prototype, OptsCtrl.prototype);
    $.extend(ProfileCtrl.prototype, {
        init: function() {
            if (this.metProfileGid == window.MY_GID)
                this.model = appNamespace.myMetProfile;
            else
                this.model = new MetProfile;
            this.model.delegate = this;
        },

        onGetTitle: function() {
            //console.log("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
            //console.log("ProfileCtrl.onGetTitle: " + this.screenName);
            return this.screenName ? this.screenName + "的信息":"";
        },

        templateContext: function() {
            var m = this.model.asMap();
            return {
                myGID: this.metProfileGid,
                x: m
            };
        },

        viewCreated: function() {
            this.view.tmplFn = $.template(templates.tmplOpts);
            $.defer(function(self){
                self.model.refresh(false, self.metProfileGid);
            }, this);
        },

        refresh:function(){
            this.model.refresh(false, this.metProfileGid);
        },

        pushHisTimeline: function(metProfileGid) {
            var x = metProfileGid.split(":");
            var appNamespace = this.view.appNamespace;
            appNamespace.MyTimelineCtrl = new MyTimelineCtrl(null, x[0], x[1]);
            var view = $.makeView(this.view.parent, "#tmpl-view-my-timeline", appNamespace, true);
            this.view.parent.pushView(view);
        },

        pushProfileView: function(metProfileGid) {
            var appNamespace = this.view.appNamespace;
            var x = metProfileGid.split(":");
            appNamespace.ProfileCtrl = new ProfileCtrl(null, x[0], x[1]);
            var view = $.makeView(this.view.parent, "#tmpl-view-profile", appNamespace, true);
            this.view.parent.pushView(view);
        },

        metWithHim: function(screen_name) {
            this.view.parent.parent.subviews["snap"].delegate.model.updateMetList(screen_name);
            this.view.parent.parent.changeTab("snap");
        },

        follow: function(metProfileGid) {
            //theApp.actionSheet("#tmpl-loading", null, true);
            jsi.modalLoadingIndicator("正在保存...");
            var url = theApp.appNamespace.HOST + "/api/rel/follow";
            relOperation(this, url, metProfileGid, function(self){
                self.model.set(
                    {
                        am_i_following:true,
                        follower_count:self.model.get("follower_count") + 1
                    }, {silent:true}
                );
                self.view.appNamespace.myMetProfile.set({
                    following_count:self.view.appNamespace.myMetProfile.get("following_count") + 1
                }, {silent:true});
                self.view.parent.render(true, self);
            });
        },

        unfollow: function(metProfileGid) {
            //theApp.actionSheet("#tmpl-loading", null, true);
            jsi.modalLoadingIndicator("正在保存...");
            var url = theApp.appNamespace.HOST + "/api/rel/unfollow";
            relOperation(this, url, metProfileGid, function(self){
                self.model.set(
                    {
                        am_i_following:false,
                        follower_count:self.model.get("follower_count") - 1
                    }, {silent:true}
                );
                self.view.appNamespace.myMetProfile.set({
                    following_count:self.view.appNamespace.myMetProfile.get("following_count") - 1
                }, {silent:true});
                self.view.parent.render(true, self);
            });
        },

        pushListOfMet: function(byWhoseGid) {
            pushListOfMetProfiles(this, "met", byWhoseGid, undefined, undefined);
        },

        pushListOfFollowing: function(whoseGid) {
            pushListOfMetProfiles(this, "following", whoseGid, undefined, undefined);
        },

        pushListOfFollowers: function(whoseGid) {
            pushListOfMetProfiles(this, "followers", whoseGid, undefined, undefined);
        },

        pushHisFavorites: function(whoseGid) {
            var x = whoseGid.split(":");
            whoseGid = x[0];
            var appNamespace = this.view.appNamespace;
            appNamespace.FavTimelineCtrl = new FavTimelineCtrl(null, whoseGid, x[1]);
            var view = $.makeView(this.view.parent, "#tmpl-view-fav-timeline", appNamespace, true);
            this.view.parent.pushView(view);
        }
    });

    /*---------------------------------------------------------------------*/
    var SettingsCtrl = function(view) {
        this.view = view;
    };

    $.extend(SettingsCtrl.prototype, {
        view: null,

        pushView: function(tmplSel) {
            this.view.parent.pushView(tmplSel, appNamespace);
        }
    });

    /*---------------------------------------------------------------------*/
    var BrowsingLogin = function(view) {
        this.view = view;
        $.bindAll(this, "publicTimelineError");
    };

    $.extend(BrowsingLogin.prototype, {
        view: null,

        login: function() {
            jsi.startActivityForResult(null, "file:///android_asset/www/weibo-login.html", this);
        },

        activityResult: function(js) {
            console.log("ACTIVITY RESULT: " + js);

            if (!js) {
                // ignore, continue browsing. error has been reported.
                //console.log(js);
                return;
            }
            var sinaProfile = js.sina_profile,
                $s = this.view.fragment,
                $ld = $s.find("#browsing-loading"),
                $el = $s.find("#browsing");
            $el.show(false);
            $ld.show(true);

            // save the sina profile, and create the MetProfile
            var self = this;
            jsi.ajax("POST", appNamespace.HOST + "/api/profile/create", {
                id: sinaProfile.id
                //screen_name: sinaProfile.screen_name
            }, function(resp){
                if (resp && resp.MetProfile && resp.SinaProfile) {
                    if (!resp.MetProfile.gid || !resp.MetProfile.acc_key || !resp.MetProfile.acc_secret) {
                        console.log("MONROE is nuts!");
                    }
                } else {
                    console.log("MONROE is nuts!");
                }

                jsi.sqlSelect("select * from conf", null, function(rows){
                    console.log("JS: sqlSelect result: " + JSON.stringify(rows));
                    var row = {
                        gid:        resp.MetProfile._s_gid,
                        acc_key:    resp.MetProfile._s_acc_key,
                        acc_secret: resp.MetProfile.acc_secret,
                        json: {
                            metProfile: resp.MetProfile,
                            sinaProfile:resp.SinaProfile
                        }
                    };
                    if (rows && rows.length) {
                        jsi.sqlUpdate("conf", row, "id=?", [rows[0].id], function(lastRow){
                            console.log("JS: sqlUpdate: " + JSON.stringify(lastRow));
                            if (lastRow || lastRow > 0) {
                                console.log("Profile/Create: UPDATE conf, lastRow: " + lastRow);
                                jsi.loadURL("file:///android_asset/www/index.html");
                            } else {
                                self.publicTimelineError("保存用户数据的时候出错。手机没有存储空间了？")
                            }
                        });
                    } else {
                        jsi.sqlInsert("conf", row, function(lastRow){
                            console.log("JS: sqlInsert: " + JSON.stringify(lastRow));
                            if (lastRow || lastRow > 0) {
                                console.log("Profile/Create: INSERT conf, lastRow: " + lastRow);
                                jsi.loadURL("file:///android_asset/www/index.html");
                                //window.location = "index.html";
                            } else {
                                self.publicTimelineError("保存用户数据的时候出错。手机没有存储空间了？");
                            }
                        });
                    }
                });
            }, function(emsg){
                self.publicTimelineError("系统无法创建用户，登录失败。")
            }, sinaProfile.acc_key, sinaProfile.acc_secret);
        },

        publicTimelineError: function(emsg) {
            $("#tabbed-views").html('<div id="browsing-error"><div>' + (emsg ? emsg:"") + '</div></div>');

        }
    });

    var PublicTimeline = function(view) {
        this.view = view;
        this.init();
    };

    $.extend(PublicTimeline.prototype, {
        rowTmpl: null,
        model: null,
        view: null,

        init: function() {
            //console.log("PublicTimeline: init\n" + templates.tmplTimelineItem);
            this.rowTmpl = $.template(templates.tmplTimelineItem);
            this.model = new TimelineModel;
            this.model.delegate = this;
            $.defer(function(self){
                self.refresh();
            }, this);
        },

        viewCreated: function(view) {
            if (view != this.view)  return;
            //console.log("PublicTimeline: viewCreated\n" + templates.tmplTimeline);
            this.view.tmplFn = $.template(templates.tmplTimeline);
            var url = appNamespace.HOST + "/api/met/public";
            this.model.refresh(false, undefined, undefined, url);
        },

        templateContext: function() {
            var d = this.model.get("mets");
            return {data:d, person:null};
        },

        refresh: function() {
            var url = appNamespace.HOST + "/api/met/public";
            this.model.refresh(false, undefined, undefined, url);
        },

        onRefreshed: function() {
            console.log("ON REFRESHED");
            // force a re-render if it is the current view in the nav.
            this.view.render(true, this);
            //console.log(this.view.fragment.html());
        }

    });

    /*
     *  A tabbar is a <div> with an id of "tabbar". It contains up to 5
     *  tabs, which are an anchor wrapped by a div. The id of the anchor
     *  is the tab's name, which in turn must be a #view-<name> as a sub view.
     *
     */

    var appNamespace = {
        myMetProfile: null,

        TimelineCtrl: TimelineCtrl,
        SnapCtrl: SnapCtrl,
        OptsCtrl: OptsCtrl,
        ProfileCtrl: ProfileCtrl,
        MetOnceDetailCtrl: MetOnceDetailCtrl,

        SettingsCtrl: SettingsCtrl,
        BrowsingLogin: BrowsingLogin,
        PublicTimeline: PublicTimeline
    };
    appNamespace.myMetProfile = new MetProfile;

    if ($.DEBUG) {
        appNamespace.HOST = "http://10.0.2.2:4000";
    } else {
        appNamespace.HOST = "http://met.miankong.cc"
    }
    window.blobBaseUrl = appNamespace.HOST;

    //$.ready(function(){
    jsi.startApp = function() {
        appNamespace.MY_GID = window.MY_GID = null;
        jsi.sqlSelect("select acc_key, acc_secret from conf", null, function(rows){
            var s = "";
            window.MY_GID = window.ACC_KEY = window.ACC_SECRET = "";
            for(var y=0; y < rows.length; y++) {
                window.MY_GID = rows[y][0];     // XXX: quick dirty hack!
                window.ACC_KEY = rows[y][0] || "";
                window.ACC_SECRET = rows[y][1] || "";
                for(var x=0; x < rows[y].length; x++) {
                    s += rows[y][x] + ", "
                }
                s += "\n";
            }
            //console.log("CONF: " + s);

            appNamespace.SNAP_HINT_DISPLAYED = false;
            appNamespace.SNAP_HINT_DISPLAYED_KEY = "snap:hint:one-time";
            jsi.sqlSelect("select value from keyvalue where key = '" +
                appNamespace.SNAP_HINT_DISPLAYED_KEY + "'", null, function(rows){
                if (rows && rows.length) {
                    appNamespace.SNAP_HINT_DISPLAYED = true;
                }

                var app = window.theApp = new App({
                    appNamespace: appNamespace,
                    rootView: $.makeView(null, "#tmpl-tabbar", appNamespace)
                });

                jsi.hideSplash();
            });
        });
    };
    //});

})($);
