/*
 *  Copyright (c) 2011, Miankong.cc, RenYi.
 *  All rights reserved.
 *
 */

(function(){
    // pushFavoredBy: only gid no screen name attached.

    var tmplListOfMetProfiles =
        '<div>' +
        '<ul class="table">' +
            '{% for(var i=0; i < x.length; i++) { %}' +
            '<li data-touchable="pushProfileView" data-user="{{ x[i].gid }}:{{ x[i].screen_name }}">' +
                '{% if (x[i].profile_image_url) { %}' +
                '<img src="{{ x[i].profile_image_url }}">' +
                '{% } %}' +
                '<div>' +
                    '<label>{{ x[i].screen_name }}</label>' +
                    '{% if (x[i].recent_met && x[i].recent_met.length) { %}' +
                    '<p class="footer">{{ x[i].recent_met[0].words}}</p>' +
                    '{% } %}' +
                '</div>' +
                '<span class="more"></span>' +
            '</li>' +
            '{% } %}' +
        '</ul>' +
        '</div>';

    var tmplMetOnceDetail = 
    '<div>' +
    '<ul class="table">' +
        '<li {% if (!x.user.met_no_one) { %}data-touchable="pushProfileView" data-user="{{ x.user.gid }}:{{ x.user.screen_name }}" class={% if (window.MY_GID==x.user.gid) { %}"my-info"{% } else { %}"other-info"{% }} %}>' +
            '{% if (x.user.profile_image_url) { %}' +
            '<img src="{{ x.user.profile_image_url }}">' +
            '{% } %}' +
            '<div>' +
                '<label>{{ x.user.screen_name }}</label>' +
                '{% if (x.user.recent_met && x.user.recent_met.length) { %}' +
                '<p class="footer">{{ x.user.recent_met[0].words}}</p>' +
                '{% } %}' +
            '</div>' +
            '{% if (!x.user.met_no_one) { %}<span class="more"></span>{% } %}' +
        '</li>' +
        '<li class="whole">{% var imgID = "img"+x.gid; window.__displayBlock =function(){document.getElementById(imgID).style.cssText="display:block;";}; %}' +
        '<img src="{{ (x.HOST + x.file) }}" id="{{ imgID }}" style="display:none;" onload="javascript:__displayBlock();">' +
        '</li>' +
        '{% if (x.words && x.words.length) { %}' +
        '<li class="plain-text"><p>{{ x.words }}</p></li>' +
        '{% } %}' +
        '{% var dispTime = $.Mepoch.toDisplayString(x.created_at); if (dispTime) { %}<li class="header-time"><p>' +
        '{{ dispTime }}' +
        '</p></li>{% } %}' +
        '{% if (!x.my_favorite) { %}' +
            '<div class="sel-fav-op">' +
                '<li class="chrome">' +
                '<div></div>' +
                '<div class="pack-right" data-touchable="favorite" data-user="{{ x.gid }}">' +
                    '<p class="operate-with-him like-it"></p>' +
                    '<p>我喜欢</p>' +
                '</div>' +
                '</li>' +
            '</div>' +
        '{% } if (x.favored_by && x.favored_by.length) { var fav = x.favored_by;  %}' +
            '<li class="line-of-avatars" data-touchable="pushFavoredBy" data-user="{{ x.gid }}">' +
                '<div class="header">' +
                    '<div>' +
                        '<label>喜欢({{ fav.length }})</label>' +
                    '</div>' +
                    '<span class="more"></span>' +
                '</div>' +
                '<div class="avatars">' +
                    '<div class="line">' +
                    '{% for(i=0, total=0; i < fav.length && i < 4; i++) { %}' +
                        '<img src="{{ fav[i].profile_image_url }}" data-touchable="pushProfileView" data-user="{{ fav[i].gid }}:{{ fav[i].screen_name }}">' +
                    '{% } %}' +
                    '</div>' +
                '</div>' +
            '</li>' +
        '{% } var i, keys; for(i=0, keys=$.keys(x.met); i < keys.length; i++) { var m = x.met[keys[i]]; %}' +
            '<li data-touchable="pushProfileView" data-user="{{ m.metProfileGid }}:{{ keys[i] }}">' +
                '{% if (m.profile_image_url) { %}' +
                '<img src="{{ m.profile_image_url }}">' +
                '{% } %}' +
                '<div>' +
                    '<label>{{ keys[i] }}</label>' +
                '</div>' +
                '<span class="more"></span>' +
            '</li>' +
        '{% } %}' +
    '</ul>' +
    '</div>';
    
    var tmplTimelineItem =
    '{% if (anotherDay) { var today = new Date(created_at * 1000); %}' +
    '<li class="date black">' +
        '<p class="time">{{ ((today.getMonth() + 1) + "." + today.getDate()) }}</p>' +
        '<p class="sel-today">今天</p>' +
    '</li>' +
    '{% } %}' +
    '<li class="met-synopsis black" data-touchable="pushDetailView" data-user="{{ gid }}:{{ userScreenName }}">' +
        '{% if (file) { var url = blobBaseUrl + file; %}' +
        '<img src="{{ url }}"  class="fill-parent">' +
        '{% } else { %}' +
        '<img src="img/e.gif"  class="fill-parent">' +
        '{% } var w = pre ? pre + words : words; %}' +
        '<div class="met-info">' +
            '<div class="header">' +
                '<p class="words">{{ w }}</p>' +
                '<p class="time">{{ $.Mepoch.toLocalTimeString(created_at * 1000) }}</p>' +
            '</div>' +
            '<div class="avatars">' +
            '{% var n=0; if (user_profile_image_url) { n=1; %}' +
                '<img src="{{ user_profile_image_url }}" data-touchable="pushProfileView" data-user="{{ user_gid }}:{{ userScreenName }}">{% } %}' +
                '{% var x = $.keys(met); for(var k=0; k < x.length && n < 4; k++) {' +
                'var d = met[x[k]]; if (d.profile_image_url && (!user_profile_image_url || d.metProfileGid!=user_gid)) { n++; %}' +
                '<img src="{{ d.profile_image_url }}" data-touchable="pushProfileView" data-user="{{ d.metProfileGid }}:{{ d.screen_name }}">' +
                '{% }} %}' +
                '<div class="met-more-info">' +
                    '<span class="more"></span>' +
                '</div>' +
            '</div>' +
        '</div>' +
    '</li>';

    var tmplTimeline =
    '<div>' +
        '{% if (data.length) { var today = new Date(), startDate=null; %}' +
        '<ul class="table">' +
            '{% if (person) { %}' +
                '<li data-touchable="pushProfileView" data-user="{{ person.gid }}:{{ person.screen_name }}" class={% if (window.MY_GID==person.gid) { %}"my-info"{% } else { %}"other-info"{% } %}>' +
                    '{% if (person.profile_image_url) { %}' +
                    '<img src="{{ person.profile_image_url }}">' +
                    '{% } %}' +
                    '<div>' +
                        '<label>{{ person.screen_name }}</label>' +
                        '{% if (person.recent_met && person.recent_met.length) { %}' +
                        '<p class="footer">{{ person.recent_met[0].words}}</p>' +
                        '{% } %}' +
                    '</div>' +
                    '<span class="more"></span>' +
                '</li>' +
            '{% } %}' +

            '<div class="sel-timeline">' +
            
            '{% for(var i=0; i < data.length; i++) { %}' +
            '{% var thisTime = new Date(data[i].created_at * 1000);' +
            'if (!startDate || thisTime.getMonth() != startDate.getMonth() || thisTime.getDate() != startDate.getDate()) {' +
            'startDate = thisTime;' +
            '%}' +
            '<li class="date black">' +
                '<p class="time">{{ ((thisTime.getMonth() + 1) + "." + thisTime.getDate()) }}</p>' +
                '{% if ($.Mepoch.daysToToday(thisTime) == 0) { %}' +
                '<p class="sel-today">今天</p>' +
                '{% } %}' +
                '{% if ($.Mepoch.daysToToday(thisTime) == -1) { %}' +
                '<p class="sel-today">昨天</p>' +
                '{% } %}' +
                '{% if ($.Mepoch.daysToToday(thisTime) == -2) { %}' +
                '<p class="sel-today">前天</p>' +
                '{% } %}' +
            '</li>' +
            '{% } %}' +
            '<li class="met-synopsis black" {% if (window.MY_GID) { %}data-touchable="pushDetailView" data-user="{{ data[i].gid }}:{{ data[i].userScreenName }}"{% } %}>' +
                '{% if (data[i].file) { var url = blobBaseUrl + data[i].file; %}' +
                '<img src="{{ url }}"  class="fill-parent">' +
                '{% } else { %}' +
                '<img src="img/e.gif"  class="fill-parent">' +
                '{% } var w = data[i].pre ? data[i].pre + data[i].words : data[i].words; %}' +
                '<div class="met-info">' +
                    '<div class="header">' +
                        '<p class="words">{{ w }}</p>' +
                        '<p class="time">{{ $.Mepoch.toLocalTimeString(data[i].created_at * 1000) }}</p>' +
                    '</div>' +
                    '<div class="avatars">' +
                        '{% var n = 0; ' +
                        'if (data[i].user_profile_image_url) { n=1; %}<img src="{{ data[i].user_profile_image_url }}" ' +
                            '{% if (window.MY_GID) { %}data-touchable="pushProfileView" data-user="{{ data[i].user_gid }}:{{ data[i].userScreenName }}"' +
                            '{% } %}>{% } %}' +
                        '{% var mets = $.keys(data[i].met); for(var k=0; n < 4 && k < mets.length; k++) {' +
                        'var d = data[i].met[mets[k]];' +
                        'if (d.profile_image_url && (!data[i].user_profile_image_url || d.metProfileGid!=data[i].user_gid)) { n++;' +
                        '%}' +
                        '<img src="{% print(d.profile_image_url); %}" ' +
                            '{% if (window.MY_GID) { %}data-touchable="pushProfileView" data-user="{{ d.metProfileGid }}:{{ mets[k] }}"{% } %}>' +
                        '{% }} if (window.MY_GID) { %}' +
                        '<div class="met-more-info">' +
                            '<span class="more"></span>' +
                        '</div>{% } %}' +
                    '</div>' +
                '</div>' +
            '</li>' +
            '{% } %}' +
            
            '</div>' +
        '</ul>' +
        '{% } else { %}' +
        '<div style="display:-webkit-box;-webkit-box-orient:vertical;-webkit-box-pack:center;height:500px;background-color:#000;">' +
            '<div style="font:36px Helvetica, sans-serif;font-weight:bold;text-align:center;color:#fff;">见面</div>' +
        '</div>' +
        '{% } %}' +
    '</div>';

    var tmplOpts =
    '<div>' +
        '<ul class="table">' +
            '<li {% if(x.met_count) { %}data-touchable="pushHisTimeline" data-user="{{ x.gid }}:{{ x.screen_name }}" class={% if (x.gid == window.MY_GID) { %}"my-info"{% }else{ %}"other-info{% }} %}">' +
                '{% if (x.profile_image_url) { %}' +
                '<img src="{{ x.profile_image_url }}">' +
                '{% } %}' +
                '<div>' +
                    '<label>{{ x.screen_name }}</label>' +
                    '{% if (x.recent_met && x.recent_met.length) { %}' +
                    '<p class="footer">{{ x.recent_met[0].words}}</p>' +
                    '{% } %}' +
                '</div>' +
                '{% if(x.met_count) { %}<span class="more"></span>{% } %}' +
            '</li>' +
            '{% if (x.num_of_met || x.num_of_being_met) { %}' +
            '<li class="plain-text">' +
                '<p>我们见过{{ ((x.num_of_met ? x.num_of_met:0) + (x.num_of_being_met ? x.num_of_being_met:0)) }}次。</p>' +
            '</li>{% } %}' +
            
            '{% if (x.gid != window.MY_GID) { %}' +
            '<li class="chrome">' +
            '<div data-touchable="metWithHim" data-user="{{ x.screen_name }}">' +
                '<p class="operate-with-him met-with-him"></p><p>和他见面</p>' +
            '</div>' +
            '<div data-touchable="{% if (x.am_i_following){ %}unfollow{% }else{ %}follow{% } %}" data-user="{{ x.gid }}">' +
                '<p class="operate-with-him {% if (!x.am_i_following) { %}follow-him{% }else{ %}unfollow-him{% } %}"></p>' +
                '<p>{% if (!x.am_i_following) { %}添加关注{% } else { %}取消关注{% } %}</p>' +
            '</div>' +
            '</li>' +
            '{% } %}' +
            
            '{% if (x.recent_met && x.recent_met.length) { var mets = x.recent_met; %}' +
            '<li class="line-of-avatars" data-touchable="pushListOfMet" data-user="{{ x.gid }}:{{ x.screen_name }}">' +
                '<div class="header">' +
                    '<div>' +
                        '<label>见过的人({{ x.met_count }})</label>' +
                    '</div>' +
                    '<span class="more"></span>' +
                '</div>' +

                '<div class="avatars">' +
                    '{% ' +
                    'var has={}, imgs=[], i, j; has[x.gid]=true;' +
                    'for(i=0; i < mets.length; i++) {' +
                        'var mm=mets[i].met, keys=$.keys(mm);' +
                        'for(j=0; j < keys.length; j++){' +
                            'var _met=mm[keys[j]];' +
                            'if (!has[_met.metProfileGid]) {' +
                                'has[_met.metProfileGid] = true;' +
                                'imgs[imgs.length] = {' +
                                    'url:_met.profile_image_url, data:_met.metProfileGid+":"+keys[j]' +
                                '};' +
                            '}' +
                        '}' +
                    '}' +
                    'for(i=0; i < imgs.length; i++){' +
                        'if ((i % 5) == 0) { %}' +
                            '<div class="line">' +
                        '{% } %}' +
                            '<img src="{{ imgs[i].url }}" data-touchable="pushProfileView" data-user="{{ imgs[i].data }}">' +
                        '{% if (((i+1) % 5) == 0) { %}' +
                            '</div>' +
                        '{% }' +
                    '}' +
                    'if ((i % 5) != 0) { %}' +
                        '</div>' +
                    '{% }' +
                    ' %}' +
                '</div>' +
        /*
                '<div class="avatars">' +
                    '<div class="line">' +
                    '{% var has={}; has[x.gid]=true; for(var i=0, total=0; i < mets.length; i++) { var mm = mets[i].met, keys=$.keys(mm); %}' +
                    '{% for(var j=0; j < keys.length; j++) {' +
                    'var _met = mm[keys[j]]; if (!has[_met.metProfileGid]) { has[_met.metProfileGid]=true; %}' +
                        '<img src="{{ _met.profile_image_url }}" data-touchable="pushProfileView" data-user="{{ _met.metProfileGid }}:{{ keys[j] }}">' +
                    '{% total++; } if ((total % 5) == 0) { %}' +
                    '</div>' +
                    '{% } } %}' +
                    '</div>{% } %}' +
                '</div>' +*/
            '</li>' +
            '{% } %}' +
            '<li class="shorter"{% if (x.following_count) { %} data-touchable="pushListOfFollowing" data-user="{{ x.gid }}:{{ x.screen_name }}"{% } %}>' +
                '<div>' +
                    '<label>关注({{ x.following_count }})</label>' +
                '</div>' +
                '{% if(x.following_count){ %}<span class="more"></span>{% } %}' +
            '</li>' +
            '<li class="shorter"{% if(x.follower_count) { %} data-touchable="pushListOfFollowers" data-user="{{ x.gid }}:{{ x.screen_name }}"{% } %}>' +
                '<div>' +
                    '<label>粉丝({{ x.follower_count }})</label>' +
                '</div>' +
                '{% if(x.follower_count){ %}<span class="more"></span>{% } %}' +
            '</li>' +
            '<li class="shorter"{% if(x.favorite_count){ %} data-touchable="pushHisFavorites" data-user="{{ x.gid }}:{{ x.screen_name }}"{% } %}>' +
                '<div>' +
                    '<label>喜欢({{ x.favorite_count }})</label>' +
                '</div>' +
                '{% if(x.favorite_count){ %}<span class="more"></span>{% } %}' +
            '</li>' +
        '</ul>' +
    '</div>';

    var tmplSnapWizard =
        '<div id="view-snap">' +
            '<div class="snap-hint"><img src="img/snap-hint.png"/></div>' +

            '<div class="whole step{{ step }}">' +
                '<div class="step1">' +
                    '<div class="input" style="margin-top:18px;">' +
                        '<p>我和：</p>' +
                        '<p class="flex"><input id="default-focus" name="recipient" class="recipient" ' +
                                                'placeholder="输入用逗号分隔的昵称" ' +
                                                'value="{{ nameList }}"></p>' +
                    '</div>' +
                    '<div class="wizard-actions">' +
                        '<div class="btn" data-touchable="nextStep"><label class="black">下一步</label></div>' +
                    '</div>' +
                '</div>' +

                '<div class="optional step2">' +
                    '<div class="attach" data-touchable="camera">' +
                        '<div class="btn">' +
                            '<label class="cam">' +
                                '{% if (file && file.length) { %}更改{% }else{ %}添加{% } %}' +
                            '照片' +
                            '</label>' +
                        '</div>' +
                    '</div>' +
                    '<div class="wizard-actions">' +
                        '<div class="btn" data-touchable="prevStep"><label class="black">上一步</label></div>' +
                        '<div class="btn" data-touchable="nextStep"><label class="black">下一步</label></div>' +
                    '</div>' +
                    '<div class="input" style="border-top:1px solid #ccc;border-bottom:none;"><p class="flex met-list">我见到了</p></div>' +
                    '<div class="attachment" style="border-top:none;margin-top:0;">' +
                        '{% if (file && file.length) { %}<img class="pic" src="{{ file }}">{% } %}' +
                    '</div>' +
                '</div>' +

                '<div class="optional step3">' +
                    '<div class="block">' +
                        '<textarea name="words" class="words" placeholder="说两句见面的事儿...">{{ words }}</textarea>' +
                    '</div>' +
                    '<div class="wizard-actions">' +
                        '<div class="btn" data-touchable="prevStep"><label class="black">上一步</label></div>' +
                        '<div class="btn" data-touchable="nextStep"><label class="black">发布</label></div>' +
                    '</div>' +
                    '<div class="input" style="border-top:1px solid #ccc;border-bottom:none;"><p class="flex met-list">我见到了</p></div>' +
                    '<div class="attachment" style="border-top:none;margin-top:0;">' +
                        '{% if (file && file.length) { %}<img class="pic" src="{{ file }}">{% } %}' +
                    '</div>' +
                    '<div class="checker-option" data-touchable="optsSyncToWeibo">' +
                        '<p class="checker-option">同步到新浪微博</p>' +
                        '<p id="sync-to-weibo" class="checker {% if (syncToWeibo) { %}checked{% }else{ %}unchecked{% } %}"></p>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';

    var tmplSnap =
        '<div id="view-snap" class="has-navbar">' +
            '{% if (!oneTimeHintDisplayed){ %}' +
            '<div class="snap-one-time-hint" data-touchable="dismissHint"></div>' +
            '{% } %}' +
            '<div class="navbar">' +
                '<div class="btn left" data-touchable="cancel">' +
                    '<label class="black prev">清除</label>' +
                '</div>' +
                '<h1>见面</h1>' +
                '<div class="btn" data-touchable="done">' +
                    '<label class="black next" id="navbar-done-label">照相</label>' +
                '</div>' +
            '</div>' +
            
            '<div class="whole">' +
                '<div class="input">' +
                    '<p>我和：</p>' +
                    '<p class="flex"><input id="default-focus" name="recipient" class="recipient" ' +
                                            'placeholder="输入用逗号分隔的昵称" ' +
                                            'value="{{ nameList }}"></p>' +
                '</div>' +
                '<div class="name-hint"></div>' +
                '<div class="optional">' +
                    '<div class="block">' +
                        '<textarea name="words" class="words" placeholder="说两句见面的事儿...">{{ words }}</textarea>' +
                    '</div>' +
                    '<div class="attachment" data-touchable="camera">' +
                        '{% if (file && file.length) { %}<img class="pic" src="{{ file }}">{% } %}' +
                    '</div>' +
                '</div>' +
            '</div>' +

            '<div class="snap-hint"><img src="img/snap-hint.png"/></div>' +

            '<div class="checker-option" data-touchable="optsSyncToWeibo">' +
                '<p class="checker-option">同步到新浪微博</p>' +
                '<p id="sync-to-weibo" class="checker {% if (syncToWeibo) { %}checked{% }else{ %}unchecked{% } %}"></p>' +
            '</div>' +
        '</div>';

    window.templates = {
        tmplSnap: tmplSnap,
        tmplSnapWizard: tmplSnapWizard,
        tmplTimelineItem: tmplTimelineItem,
        tmplTimeline: tmplTimeline,
        tmplOpts: tmplOpts,
        tmplMetOnceDetail: tmplMetOnceDetail,
        tmplListOfMetProfiles: tmplListOfMetProfiles
    };

})();