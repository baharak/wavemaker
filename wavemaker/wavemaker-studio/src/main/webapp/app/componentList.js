/*
 *  Copyright (C) 2012-2013 VMware, Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

dojo.provide("wm.studio.app.componentList");
dojo.require('wm.base.components.componentList');

/* Clobber the runtime wm.componentList, providing a design time only version */
wm.componentList = {
    "wm.LiveForm": ["studio.build.wm_livepanel"],
    "wm.SimpleForm":["studio.build.wm_livepanel"],
    "wm.LivePanel": ["studio.build.wm_livepanel"],
    "wm.RelatedEditor": ["studio.build.wm_livepanel"],
    "wm.EditPanel": ["studio.build.wm_livepanel"],
    "wm.DataNavigator": ["studio.build.wm_livepanel"],
    'wm.BreadcrumbLayers':['build.Gzipped.wm_breadcrumblayer'],


	/* GADGETS */
    "wm.FeedList": ["studio.build.wm_gadget"],
    "wm.gadget.GoogleMap": ["studio.build.wm_gadget"],
    "wm.gadget.Weather": ["studio.build.wm_gadget"],
    "wm.gadget.YouTube": ["studio.build.wm_gadget"],
    "wm.gadget.Facebook": ["studio.build.wm_gadget"],
    "wm.gadget.FacebookLikeButton": ["studio.build.wm_gadget"],
    "wm.gadget.FacebookActivityFeed": ["studio.build.wm_gadget"],
    "wm.gadget.TwitterFollowButton": ["studio.build.wm_gadget"],
    "wm.gadget.TwitterTweetButton": ["studio.build.wm_gadget"],
    "wm.gadget.TwitterList": ["studio.build.wm_gadget"],
    "wm.DojoFisheye": ["studio.build.wm_gadget"],
    "wm.Ticker": ["wm.base.widget.Ticker_design"],

    /* MISC EDITORS */
    "wm.OneToMany": ["studio.build.wm_editors"],
    "wm.dijit.Calendar": ["studio.build.wm_editors"],
    "wm.Date": ["studio.build.wm_editors"],
    "wm.Time": ["studio.build.wm_editors"],
    "wm.DateTime": ["studio.build.wm_editors"],
    "wm.Radiobutton": ["studio.build.wm_editors"],
    "wm.Slider": ["studio.build.wm_editors"],
    "wm.BusyButton": ["studio.build.wm_misc"],
    "wm.DojoLightbox": ["studio.build.wm_misc"],
    "wm.ListViewer": ["studio.build.wm_misc"],
    "wm.Dashboard": ["studio.build.wm_dashboard"],
    "wm.DojoChart": ["studio.build.wm_charts"],
    "wm.DojoGauge": ["studio.build.wm_charts"],
    "wm.PropertyTree": ["studio.build.wm_trees"],
    "wm.ObjectTree": ["studio.build.wm_trees"],
    "wm.DojoGrid": ["studio.build.wm_dojogrid"],
    "wm.DataGrid": ["studio.build.wm_datagrid"],
    "wm.DojoFileUpload": ["studio.build.wm_fileupload"],
    "wm.DojoFlashFileUpload": ["studio.build.wm_fileupload"],
    "wm.FileUpload": ["wm.base.widget.FileUpload"],

    /* OLD EDITORS */
    "wm.Editor": ["studio.build.wm_editors", "studio.build.wm_editors_old"],
    "wm.TextEditor": ["studio.build.wm_editors", "studio.build.wm_editors_old"],
    "wm._TextEditor": ["studio.build.wm_editors", "studio.build.wm_editors_old"],
    "wm.TextAreaEditor": ["studio.build.wm_editors", "studio.build.wm_editors_old"],
    "wm._TextAreaEditor": ["studio.build.wm_editors", "studio.build.wm_editors_old"],
    "wm._NumberEditor": ["studio.build.wm_editors", "studio.build.wm_editors_old"],
    "wm.NumberEditor": ["studio.build.wm_editors", "studio.build.wm_editors_old"],
    "wm._CurrencyEditor": ["studio.build.wm_editors", "studio.build.wm_editors_old"],/* Not used by studio */
    "wm.CurrencyEditor": ["studio.build.wm_editors", "studio.build.wm_editors_old"],/* Not used by studio */
    "wm.SliderEditor": ["studio.build.wm_editors_misc", "studio.build.wm_editors_old"],/* Not used by studio */
    "wm._SliderEditor": ["studio.build.wm_editors", "studio.build.wm_editors_old"],/* Not used by studio */
    "wm.SelectEditor": ["studio.build.wm_editors", "studio.build.wm_editors_old"],
    "wm._SelectEditor": ["studio.build.wm_editors", "studio.build.wm_editors_old"],
    "wm._LookupEditor": ["studio.build.wm_editors", "studio.build.wm_editors_old"],/* Not used by studio */
    "wm._DateEditor": ["studio.build.wm_editors", "studio.build.wm_editors_old"],
    "wm.DateEditor": ["studio.build.wm_editors", "studio.build.wm_editors_old"],
    "wm.CheckBoxEditor": ["studio.build.wm_editors", "studio.build.wm_editors_old"],
    "wm._CheckBoxEditor": ["studio.build.wm_editors", "studio.build.wm_editors_old"],
    "wm.RadioButtonEditor": ["studio.build.wm_editors_misc", "studio.build.wm_editors_old"],
    "wm._RadioButtonEditor": ["studio.build.wm_editors_misc", "studio.build.wm_editors_old"],
    "wm.TimeEditor": ["studio.build.wm_editors", "studio.build.wm_editors_old"],
    "wm._TimeEditor": ["studio.build.wm_editors", "studio.build.wm_editors_old"]
    

}
