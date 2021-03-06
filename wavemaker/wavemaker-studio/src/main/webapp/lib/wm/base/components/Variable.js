/*
 *  Copyright (C) 2008-2013 VMware, Inc. All rights reserved.
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

dojo.provide("wm.base.components.Variable");
dojo.require("wm.base.Component");

// FIXME: because we cannot guarantee the global "app" is a component's application
// (because studio has an app) and the runtimeService must be local to a project
// get the app corresponding to the given component.
wm.getRuntimeService = function(inComponent) {
    var a = dojo.getObject("studio.wip.app") || app;

    return wm.fire(a, "getRuntimeService");
};

//The following lines are not being used now.  They may be used in the future to differenciate requests from Studio from
//requests deployed application.
wm.getRuntimeServiceDesignTime = function(inComponent) {
    var a = dojo.getObject("studio.wip.app") || app;
    return wm.fire(a, "getRuntimeServiceDesignTime");
};

/**
    Base class for all data handling components.
    @name wm.Variable
    @class
    @extends wm.Component
*/
dojo.declare("wm.Variable", wm.Component, {
    /** @lends wm.Variable.prototype */
    json: "",
    /**
        Type of data stored in the variable, or type of each item in the list.
        @type String
    */
    type: "",
    //primaryKeyFields: "",

    /**
        True if this variable contains a list (aka array).
        @type Boolean
    */
        saveInCookie: false,
        saveInPhonegap: false,
    isList: false,
    _updating: 0,
    _dataSchema: {},
    _greedyLoadProps: false,
    _allowLazyLoad: true,
    cursor: 0,
        _uniqueSubnardId: 1,
/*
    constructor: function(inProps) {
    },
    */
    init: function() {
        this.inherited(arguments);
        if (this._isDesignLoaded) {
            this._subscriptions.push(dojo.subscribe("wmtypes-changed", this, "wmTypesChanged"));
        }
    },
    postInit: function() {
        this.inherited(arguments);
        this._inPostInit = true;
        // optimization: we should never need bindings on subNards so not creating them
        if (!this._subNard && !this.$.binding) new wm.Binding({
            name: "binding",
            owner: this
        });
        this.setType(this.type, true);
        if (window["PhoneGap"] && this.saveInPhonegap) {
            var textdata = window.localStorage.getItem(this.getRuntimeId());
            if (textdata) this.json = textdata;
        } else if (this.saveInCookie) {
            var textdata = dojo.cookie(this.getRuntimeId());
            if (textdata) this.json = textdata;
        }
        if (this.json) this.setJson(this.json);
        else this._clearData();

        this._inPostInit = false;

        // need to reinitialize after type is set
        if (!this._updating && this.$.binding) this.$.binding.refresh();

        // widgets bound to this component won't have received any events/initial
        // data or properties if no data has yet been set
        if (this.isEmpty()) {
            this.notify();
        }
    },
    //===========================================================================
    // Type Information
    //===========================================================================
    canSetType: function(inType) {
        // type is locked to dataSet type if it is set
        if (this.dataSet && this.dataSet.type == this.type) {
            wm.logging && console.debug(this.name, "cannot set variable type because this variable has a dataSet");
            return;
        }
        return true;
    },
    setType: function(inType, noNotify) {
        this._hasChanged = false;
        if(inType == this.declaredClass || this.owner instanceof wm.Variable && inType == this.owner.declaredClass) inType = "";

        //this.unsubscribe("TypeChange-" + this.type);
        if(!this.canSetType(inType)) return;

        var t = inType;
        if(wm.isListType(t)) {
            this.isList = true;
            if(t.substring(t.length - 1) == "]") {
                t = t.slice(1, -1);
            }
            // don't reset isList if we have data; also don't reset isList if we're in postInit; the setType call in postInit should
            // not lose the user's isList setting
        } else if(!(this.data && this.data._list) && !this._inPostInit) this.isList = false;

        var hasChanged;
        if (this.type != t) {
            hasChanged = true;
        } else if (this._isDesignLoaded) {
            hasChanged = dojo.toJson(this._getSchemaForType(inType)) != dojo.toJson(this._dataSchema);
        }
        this._hasChanged = hasChanged;
        this.type = t;
        //

        if (this._proxy) {
            this._proxy.setType(this.type);
        }
        this.typeChanged(this.type);
        if (this._query && hasChanged) this._query.setType(this.type);
        if (this.json & hasChanged) {
            this.setJson(this.json);
        }
/*
            if (this._isDesignLoaded) {
                this.subscribe("TypeChange-" + inType, dojo.hitch(this, function() {
                    this.setType(inType); // reset the type if the type definition has changed
                    // Reevaluate the json for the new type
                    if (this.json)
                        this.setJson(this.json);
                }));
            }
        */
        if(!noNotify && hasChanged && inType && inType != "any") this.notify(); //  this will cause anyone bound to this object to treat a change of type as a change in its dataSet
    },
    /* Design time only */
    set_type: function(inType) {
        this.setType(inType);
        studio.reinspect();
        /*
    var oldType = this.type;
    this.setType(inType);
    if (oldType != inType) {
        var keys = wm.getPrimaryKeys(wm.typeManager.getType(inType));
        this.primaryKeyFields = keys.length ? keys.join(",") : "";
    }
    reinspect();
    */
    },
    typeChanged: function(inType) {
        var t = inType;
        var primitive = wm.typeManager.getPrimitiveType(t) || !t || t == "wm.Variable";
        this.isPrimitive = Boolean(primitive);
        var schema = this._getSchemaForType(t);
        if (schema)
            this.setDataSchema(schema);
    },
    _getSchemaForType: function(inType) {
        var p = wm.typeManager.getPrimitiveType(inType);
        if (this.isPrimitive) {
            // we're a string primitive by default
            return {dataValue:{type: p || 'String'/*, isList:this.isList*/}};
        } else {
            return wm.typeManager.getTypeSchema(inType) || {dataValue:{type: p || 'String', isList:this.isList}};
        }
    },
    setDataSchema: function(inSchema) {
        this._dataSchema = inSchema;
    },
    setJson: function(inJson) {
        this.json = inJson;
        try {
            var d = eval("(" + inJson + ")");
        } catch(e) {
          console.error("Json error in " + this.name + ": " + e);
        }
            this.setData(d);
    },
    hasList: function() {
        return this.data && ("list" in this.data);
    },
    getDataTypeInfo: function(inProp) {
        return this._dataSchema[inProp];
    },
    listDataProperties: function() {
        var list = this._listSchemaProperties({}, this._dataSchema, "getDataTypeInfo");
        for (var i in list) {
            list[i].bindable = true;
        };
        return list;
    },
    //===========================================================================
    // Update Buffering
    //===========================================================================
    beginUpdate: function() {
        this._updating++;
    },
    endUpdate: function() {
        this._updating--;
    },
    isUpdating: function() {
        return this._updating > 0;
    },
    //===========================================================================
    // Data API
    //===========================================================================
    /**
        Clear all data values.
    */
    clearData: function() {
        this._clearData();
            this.setType(this.type, true);
            if (this.type && this.type != this.declaredClass && !this._initializing)
            this.notify();
    },
    _clearData: function() {
        this._isNull = false;
        this._nostub = false;
        if (!this.data)
            this.data = {};
        if (this.isList)
            this.data = {_list: []};
        else {
            // maintain any subNards (to one depth anyways), but otherwise clear data
            var d;
            for (var i in this.data) {
                d = this.data[i];
                if (d instanceof wm.Variable && !wm.typeManager.getLiveService(d.type))
                    d._clearData();
                else
                    delete this.data[i];
            }
        }
    },
    _setNull: function(inNull) {
        this._isNull = inNull;
        // owner null can be unset but not set. consequence: all null values != null
        if (!inNull && this._subNard && this.owner) {
            this.owner._setNull(inNull);
        }
    },
    /**
        Copy data into this variable.<br/>
        <br/>
        Input data can be a primitive value, an array, a plain old JavaScript object (POJSO), or a wm.Variable.
        Success of setData requires that the type of the input is compatible with the type of this variable.
        @param {Any} inData Input data.
    */
    // NB: input can be a POJSO or a Variable
    setData: function(inData) {
        /* Don't try setting data to null if we're still initializing components for the page;
         * that just clobbers the cookie/permanent memory with data not yet set
         */
        if (window["PhoneGap"] && this.saveInPhonegap || this.saveInCookie) {
            var ownerPage = this.getParentPage();
            if (ownerPage && ownerPage._loadingPage && !inData) return;
        }

        if (inData instanceof wm.Variable) inData = inData.getData();

        this.onPrepareSetData(inData);

        if (dojo.isArray(inData)) {
            this._setArrayData(inData);
        } else if (this.isPrimitive) {
            this._setPrimitiveData(inData);
        } else {
            this._setObjectData(inData);
        }
        this.notify();
        this.onSetData();

    },

    onPrepareSetData: function(inData) {
    },
    onSetData: function() {},
    notify: function() {
        this.dataOwnerChanged();
        this.dataChanged();
        this.valueChanged("isEmpty", this.isEmpty());
        if (this.isList) {
            this.valueChanged("count", this.getCount());
        }
        if (!this.isUpdating() && this.queriedItems) {
            this.setQuery(this._query);
        }
        this.updatePermanentMemory();
    },
    _setPrimitiveData: function(inValue) {
        if (inValue !== null && typeof inValue == "object") {
            this.data = inValue;
        } else {
            this.data = {
                dataValue: inValue
            };
        }

        this.isList = false;
    },
/*
    _setVariableData: function(inVariable) {
        this.setData(inVariable.getData());
    },
    */
    /* WM-2500: Need a way for the user to change the isList property at design time (but not for subclasses of wm.Variable) */
    setIsList: function(isList) {
        if (isList && !this.isList) {
            this.isList = true;
            if (this.json && !this.data._list) this.setJson("[" + this.json + "]");
            else if (wm.isEmpty(this.data)) this._setArrayData([]);
            else {
                var data = [];
                data.push(this.getData());
                this.setData(data);
            }
        } else if (!isList && this.isList) {
            if (this.json) {
                this.setJson(dojo.toJson(this.getItem(0).getData()));
            } else if (wm.isEmpty(this.data._list)) {
                this.setData(null); // this should change isList automatically
            } else {
                this.setData(this.getItem(0)); // this should change isList automatically unless item(0) is itself a list
            }

        }
    },
    _setArrayData: function(inArray) {
        if (wm.defaultTypes[this.type] && inArray.length && typeof inArray[0] != "object") {
            inArray = dojo.map(inArray, function(v) {return {dataValue: v};});
        }
        this.data = { _list: inArray };
        this.isList = true;
        this._isNull = inArray.length == 0;
    },
    _setObjectData: function(inObject) {
        this.beginUpdate();
        this._clearData();
        this.isList = false;

        delete this.data._list;
        var d, v, nv, isNull = inObject === null, empty = wm.isEmpty(inObject);
        for (var i in this._dataSchema) {
            d = this.data[i];
            v = !empty ? inObject[i] : undefined;
            // nv is parent null or v, called null-checked value
            nv = isNull ? null : v;
            if (this._isVariableProp(i)) {
                // for existing variable props, set null-checked value iff it exists
                if (d instanceof wm.Variable) {
                    if (nv !== undefined) {
                        // we don't need to propagate messages from variable properties
                        // since this variable will propagete them
                        d.beginUpdate();
                        d.setData(nv);
                        d.endUpdate();
                    }
                // for non-existing variable props, set *value* iff it exists
                // (we do not set null values here because that can prompt infinite marshalling)
                } else if (v !== undefined) {
                    this._setDataValue(i, v);
                }
            // for non-variable props, set null-checked value iff it exists
            } else {
                if (nv !== undefined)
                    this._setDataValue(i, nv);
            }
        }
        this._setNull(isNull);
        this.endUpdate();
    },
    /**
        Export data from this variable into a plain old JavaScript object (POJSO).<br/>
        @returns Object
    */
    // NB: output is POJSO
    getData: function(flattenPrimitives) {
        if (!this.data || this.disabled) return;
        if (this._isNull) return null;
        else if (this.isList) {
            // if its a byte list merge it into a single string and change it to a nonlist
            if (this.type == "byte") {
                try {
                    if (this.data._list && this.data._list[0] instanceof wm.Variable) {
                        this.data._list[0] = this.data._list[0].data.dataValue;
                    }
                    this.data = {
                        dataValue: this.data._list.join("")
                    };
                } catch (e) {
                    this.data = null;
                }
                this.isList = false;

                return dojo.clone(this.data); // getData never returns pointers into the datastructure but only copies so that manipulating it doesn't corrupt the wm.Variable
            } else if (wm.Variable.convertToHashMaps && this.data._list && wm.isHashMapType(this.type)) {
                var data = {};
                for (var i = 0, l = this.getCount(), v; i < l; i++) {
                    v = (this.getItem(i) || 0).getData(flattenPrimitives);
                    data[v.name] = v.dataValue;
                }
                return data;
            } else {
                var data = [];
                for (var i = 0, l = this.getCount(), v; i < l; i++) {
                    v = (this.getItem(i) || 0).getData(flattenPrimitives);
                    if (v) data.push(v);
                }
                return data;
            }
        } else if (flattenPrimitives && this.isPrimitive && this.data["dataValue"] !== undefined) {
            return this.data.dataValue;
        } else if (this.isEmpty()) {
            return null;
        } else {
            var data = {};
            var props = this.listDataProperties();
            for (var i in props) {
                var v = this.data[i];
                if (wm.getDataConvertDates && v instanceof Date) {
                    v = v.getTime();
                } else if (props[i] && props[i].type == "Date" && typeof v === "string") {
                	v = this.data[i] = new Date(v).getTime();
                }

                // we may not always want all related junk
                if (v !== undefined) {
                    if (v instanceof wm.Variable) {
                        if (v.isEmpty()) v = null;
                        else v = v.getData(flattenPrimitives)
                    }
                    // don't return undefined or empty, non-null variables properties
                    if (v === undefined || (v !== null && typeof v == "object" && wm.isEmpty(v))) continue;
                    data[i] = v;
                }
            }
            if (!wm.isEmpty(data)) return data;
        }
    },

    //===========================================================================
    // Value API
    //===========================================================================
    _getDataValue: function(n, noMarshal) {
        if (!this.data)
                this.data = {};
        var d, f;
        if (this.isList) {
            f = this.getCursorItem();
            d = f && f.data;
        } else
            d = this.data;
        var v = d && d[n], typeInfo = this._dataSchema[n];
        // FIXME: Encountered a project where _isVariableProp(n) was true, but v was a string
        if (this._isVariableProp(n) && (!v || (v._isStub && v._isStub())) && !noMarshal) {
            v = d[n] = (f || this).marshallVariable(n, typeInfo, v);
        } else if (typeInfo && typeInfo.type == "Date") {
        	v = d[n];
        	if (typeof v == "string") {
				try {
	        		v = d[n] = new Date(v).getTime();
	        	} catch(e) {}
        	}
        }
        return v;
    },
    _setDataValue: function(n, v) {
        // NOTE: variable value is null iff it has been explicitly set to null
        // and no value has subsequently been set to any value, including null.
        if (this._isNull && v !== undefined) this._setNull(false);
        this.beginUpdate();
        var o;
        if (v === null || v === undefined) {
            o = this._getDataValue(n, true);
            if (o === v) {
                this.endUpdate();
                return;
            }
        } else {
            o = this._getDataValue(n);
            if (o === undefined && v instanceof wm.Variable) {
                o = this.data[n] = this.createVariable({type: v.type, _subNard: true, name: n});
            }
        }
        this.endUpdate();
        if (!o && v instanceof wm.Variable) {

        }
        if (o instanceof wm.Variable) {
            // if we are updating, o's listeners will be notified by us
            // o doesn't need to message them directly
            if (this._updating) o._updating++;
            if (this.isList && v instanceof wm.Variable && !v.isList) {
                this.setIsList(false);
            }
            o.setData(v);

            if (this._updating) o._updating--;
            return;
        }
        if (!(v instanceof wm.Variable)) {
            this.data[n] = v;
            this.dataValueChanged(n, v);
        }
    },
    setDisabled: function(inDisabled) {
        var valueWas = this.disabled;
        this.disabled = Boolean(inDisabled);
        if (valueWas != this.disabled) this.notify();
    },
    //===========================================================================
    // List API
    //===========================================================================
    /**
        Return the number of items in the list owned by this variable (only valid if <a href="#isList">isList</a> is true).
        @returns Number
    */
    getCount: function() {
      if (this._isNull) return 0;
      if (this.isList) return (this.data && this.data._list) ? this.data._list.length : 0;
      return 1;
    },

    /* Used by bindings to isEmpty */
    getIsEmpty: function() {
        return this.isEmpty();
    },
    isEmpty: function() {
        if (!this.data) return true;

        if (this.data._list) return !Boolean(this.data._list.length);

        for (var propName in this.data) {
            if (this.data[propName] instanceof wm.Variable) {
                if (!this.data[propName].isEmpty()) return false;
            } else if (this.data[propName] != null) { // covers undefined as well
                return false;
            }
        }
        return true;
    },

    _isEmpty: function(obj) {
        for (var prop in obj) {
            if(obj.hasOwnProperty(prop)) return false;
        }
        return true;
    },
    // Returns a Variable representing item inIndex
    // If the item is currently raw data, it's replaced
    // with a new Variable. Created Variable is initialized
    // with the raw list data unless inData is supplied.
    // If inData is supplied the Variable is populated with
    // inData.
    _needItem: function(inIndex, inData) {
        if (inIndex >= this.getCount() && inData === undefined) return null;
        // fetch the stored data object
        var item = this.data._list[inIndex];
        // optional raw data to initialize the object with
        var data = inData;
        if (!(item instanceof wm.Variable)) {
            // we want to populate with original raw data
            // unless override data iss provided
            data = inData || item;
            // create a new Variable to represent this data
            item = this.createVariable({/*name: "itemProxy",*/ type: this.type, _subNard: true, itemIndex: inIndex});
            this.data._list[inIndex] = item;
        }
        if (data !== undefined) {
            item.beginUpdate();
            item.setData(data);
            item.endUpdate();
        }
        return item;
    },
    /**
        Return an item by numeric index in the list owned by this variable (only valid if <a href="#isList">isList</a> is true).
        @param {Number} inIndex The numeric index of the item to fetch
        @returns Any
    */
    getItem: function(inIndex) {
        return this.isList && this._needItem(inIndex) || !this.isList && this;
    },
    getItemData: function(inIndex) {
        if  (!this.isList) return;
            var item = this.data._list[inIndex];
            if (item instanceof wm.Variable)
                return item.data;
            else
                return item;
    },
    _populateItems: function() {
        for (var i = 0, c = this.getCount(); i < c; i++)
        this.getItem(i);
    },
    forEach: function(inCallback) {
        var count = this.getCount();
        for (var i = 0; i < count; i++) {
            if (inCallback(this.getItem(i), i) === true) break;
        }
    },
    map: function(inCallback) {
        var result = [];
        var count = this.getCount();
        for (var i = 0; i < count; i++) {
            result.push(inCallback(this.getItem(i)));
        }
        return result;
    },
    filterItems: function(inCallback) {
        var result = [];
        this.forEach(function(item, index) {
            if (inCallback(item, index)) {
                result.push(item.getData());
            }
        });
        var v = new wm.Variable({
            type: this.type,
            owner: this
        });
        v.setData(result);
        return v;
    },
    // note: low level sort that requires a comparator function to be used.
    sort: function(inComparator) {
        this._populateItems();
        var l = this.isList && this.data && this.data._list;
        if (l) {
        if (typeof inComparator == "function") {
            l.sort(inComparator);
        } else {
            l.sort(function(a,b) {
            var v1 = a.getValue(inComparator);
            var v2 = b.getValue(inComparator);
            return wm.compareStrings(v1,v2);
            });
        }
            this.notify();
        }
    },

    /**
        Set the cursor by index. When data forms a list, the cursor indicates the item used in calls to getValue.
        @param {Number} inCursor The numeric index of the item to use as the Variable's
        @returns Any
    */
    setCursor: function(inCursor) {
        this.cursor = Math.max(0, Math.min(this.getCount()-1, inCursor));
        this.notify();
    },
    /**
        Increments the cursor.
        @returns Any
    */
    setNext: function() {
        this.setCursor(this.cursor+1);
    },
    /**
        Decrements the cursor.
        @returns Any
    */
    setPrevious: function() {
        this.setCursor(this.cursor-1);
    },
    /**
        Sets the cursor to the first item.
        @returns Any
    */
    setFirst: function() {
        this.setCursor(0);
    },
    /**
        Sets the cursor to the last item.
        @returns Any
    */
    setLast: function() {
        this.setCursor(this.getCount()-1);
    },
    getIndexInOwner: function() {
        if (this.owner instanceof wm.Variable && this.owner.data._list) {
            return dojo.indexOf(this.owner.data._list, this);
        }
        return -1;
    },
    /**
        Retrieves the data item at the current list cursor. If data is not a list, returns the Variable
        @returns wm.Variable
    */
    getCursorItem: function() {
        return this.getItem(this.cursor || 0) || this;
    },
    /**
        Set an item by numeric index in the list owned by this variable (only valid if <a href="#isList">isList</a> is true).
        @param {Number} inIndex The numeric index of the item to set
        @param {Any} inData The data to store
    */
    setItem: function(inIndex, inData) {
        this._setItem(inIndex, inData);
        this.cursor = inIndex;
        this.notify();
    },
    _setItem: function(inIndex, inData) {
        if (this.isList)
            this._needItem(inIndex, inData);
    },
    /**
        Adds an item to the list of data. Only functions if data forms a list.
        @param {wm.Variable or Object} inData The data to add, either a an Object or wm.Variable
        @param {Number} inIndex (Optional) The numeric index at which to insert the data.
        @returns Any
    */
    addItem: function(inData, inIndex) {
        this._addItem(inData, inIndex);
        this.cursor = inIndex;
        this.notify();
    },
    _addItem: function(inData, inIndex) {
        if (this.isList) {
            var c = this.getCount();
            if (inIndex >= 0 && inIndex < c)
                this.data._list.splice(inIndex, 0, {});
            else
                inIndex = this.getCount();
            this._setItem(inIndex, inData);
        }
    },
    /**
        Removes an item from the list of data. Only functions if data forms a list.
        @param {Number} inIndex The numeric index of the item to remove.
        @returns Any
    */
    removeItem: function(inIndex) {
        this._removeItem(inIndex);
        this.cursor = 0;
        this.notify();
    },
    _removeItem: function(inIndex) {
        if (this.isList)
            this.data._list.splice(inIndex, 1);
    },
    // should we store this for faster access? (items have itemIndex, but this is not maintained)
    getItemIndex: function(inVariable) {
        if (!this.isList)
            return -1;
        var list = (this.data || 0)._list || [];
        for (var i=0, l = list.length; i < l; i++) {
            if (inVariable == list[i])
                return i;
        }
        return -1;
    },
    getItemIndexByPrimaryKey: function(inVariable, pkList){
        if (!this.isList || !pkList || pkList.length < 1)
            return -1;
        var obj = inVariable;
        if (obj instanceof wm.Variable){
            obj = inVariable.getData();
        }

        var list = (this.data || 0)._list || [];
        for (var i=0, l = list.length; i < l; i++) {
            obj2 = list[i] instanceof wm.Variable ? list[i].getData() : list[i];
            var isEqual = true;
            for (var j = 0; j < pkList.length; j++){
                var f = pkList[j];
                if (obj[f] != obj2[f]){
                    isEqual = false;
                    break;
                }
            }

            if (isEqual)
                return i;
        }
            return -1;
    },
    getQueriedItems: function() {
        if (!this.queriedItems) {
            this.queriedItems = new wm.Variable({
                isList: true,
                type: this.type,
                name: "queriedItems"
            });
            this.queriedItems.setOwner(this, true);
            // queried items are ALL items until a query has been issued
            this.queriedItems.setDataSet(this);
        }
        return this.queriedItems;
    },
    createQueryVar: function() {
        if (this.owner instanceof wm.Variable == false) {
            this._query = new wm.Variable({type:this.type, isList:false, owner: this, name: "queryVar"});
        }
    },

    // property is named queryVar so getter and setter must be getQueryVar/setQueryVar.  Why not getQuery/setQuery?
    // Because in WM 6.5 we defined a setQuery method and query method, and getQuery/setQuery implies a query property
    // rather than a query method, and the query method is public.
    getQueryVar: function() {
        if (!this._query) this.createQueryVar();
        return this._query;
    },
    setQueryVar: function(query) {return this.setQuery(query);},
    setQuery: function(query) {
        if (!this._query) this.createQueryVar();
        this._query.setData(query);
        if (!this._query.isEmpty()) {
            return this.query(this._query.getData(), true);
        } else {
            this.getQueriedItems().setDataSet(this);
        }
    },
    query: function(inSample, updateQueriedItems) {
        if (!this.isList) return;
        if (!inSample) inSample = {};
        var maxResults = inSample._maxResults || 0;
        delete inSample._maxResults;

        var count = this.getCount();
        var result = [];
        if (inSample instanceof wm.Variable) {
            inSample = inSample.getData() || {};
        }

        for (var i = 0; i < count; i++) {
            var item = this.getItem(i);
            if (this._queryItem(item, inSample, i)) {
                result.push(item);
            }
            if (maxResults) {
                if (result.length >= maxResults) break;
            }
        }
        if (updateQueriedItems) {
            var v = this.getQueriedItems();
        } else {
            var v = new wm.Variable({
                type: this.type,
                isList: true,
                name: "QueryResults"
            });
            v.setOwner(this, true);
        }
        v.setData(result);
        if (maxResults) inSample._maxResults = maxResults; // undo our modifications to the user's structure so they can reuse it
        return v;
    },
/*
    _queryItem: function(inItem, inSample, inIndex) {
    var w = "*";
    var isMatch = true;
    wm.forEachProperty(inSample, function(value, key) {
        var matchStart = true;
        var valueA = inItem.getValue(key);

        var conditions = value;
        wm.forEachProperty(conditions, function(valueB, conditionKey) {
        switch(conditionValue) {
        case ">":
            if (valueB <= valueA)
        case ">=":

        case "<":


        case "<=":

        case: "=":

        case "!=":

        case "in":
        }

        });
        var b = inSample[key];



        var stringB = String(b);
        if (stringB.charAt(0) == w) {
        b = b.substring(1);
        matchStart = false;
        } else if (stringB.charAt(0) == ">") {
        var orEqual = false;
        if (stringB.charAt(1) == "=") {
            orEqual = true;
            b = b.substring(2);
        } else {
            b = b.substring(1);
        }
        if (typeof a == "number") {
            b = Number(b);
        } else if (typeof a == "string") {
            b = b.toLowerCase();
        }
        if (orEqual) {
            if (a < b) return false;
        } else {
            if (a <= b) return false;
        }
        continue;
        } else if (stringB.charAt(0) == "<") {
        var orEqual = false;
        if (stringB.charAt(1) == "=") {
            orEqual = true;
            b = b.substring(2);
        } else {
            b = b.substring(1);
        }
        if (typeof a == "number") {
            b = Number(b);
        } else if (typeof a == "string") {
            b = b.toLowerCase();
        }
        if (orEqual) {
            if (a > b) return false;
        } else {
            if (a >= b) return false;
        }
        continue;
        } else if (stringB.charAt(0) == "!") {
        b = b.substring(1);
        if (typeof a == "number") {
            b = Number(b);
        } else if (typeof a == "string") {
            b = b.toLowerCase();
        }
        var invert = true;
        }
        if (b == w) {
        if (invert) return false;
        else continue;
        }
        if (dojo.isString(a) && dojo.isString(b)) {
        if (b.charAt(b.length-1) == w)
            b = b.slice(0, -1);
        a = a.toLowerCase();
        b = b.toLowerCase();
        var matchIndex = a.indexOf(b);
        if (matchIndex == -1 ||
            matchIndex > 0 && matchStart) {
            if (!invert) return false;
        } else if (invert) {
            return false;
        }
        }
        else if (a !== b) {
        if (invert) continue;
        else return false;
        } else if (invert) {
        return false;
        }
    }
    return true;
    },
    */
    _queryItem: function(inItem, inSample, inIndex) {
        if (dojo.isArray(inSample)) {
            return dojo.some(inSample, function(inSampleElement) {
                return this._queryItem2(inItem, inSampleElement, inIndex);
            }, this);
        } else {
            return this._queryItem2(inItem, inSample, inIndex);
        }
    },
    _queryItem2: function(inItem, inSample, inIndex) {
        var w = "*";

        for (var key in inSample) {
            var matchStart = true;
            var matchEnd = true;
            var a = inItem.getValue(key);
            var b = inSample[key];
            if (typeof b == "function") {
                return b(a);
            } else if (b !== null && typeof b == "object" && wm.typeManager.isStructuredType(inItem._dataSchema[key].type)) {
                var aempty = (!a || a instanceof wm.Variable && a.isEmpty() || a instanceof wm.Variable === false && wm.isEmpty(a));
                var bempty = (!b || b instanceof wm.Variable && b.isEmpty() || b instanceof wm.Variable === false && wm.isEmpty(b));
                if (aempty != bempty) return false;
                if (aempty && bempty) continue;

                /* Don't even TRY to compare isList subvariables */
                if (a instanceof wm.Variable && a.isList) {
                    continue;
                }

                else {
                    var submatch = this._queryItem(a, b, 0);
                    if (!submatch) return false;
                    continue;
                }

            }

            /* NOTE: there is no "!true", rather, your query is either {a: true} or {a: false} to query on "truthiness" */
            else if (typeof b == "boolean") {
                if (Boolean(b) != Boolean(a)) return false;
                else continue; // all other tests beyond this if/else block are for strings
            } else {
                var stringB = String(b);
                if (stringB.charAt(0) == w) {
                    b = b.substring(1);
                    matchStart = false;
                } else if (stringB.charAt(0) == ">") {
                    var orEqual = false;
                    if (stringB.charAt(1) == "=") {
                        orEqual = true;
                        b = b.substring(2);
                    } else {
                        b = b.substring(1);
                    }
                    if (typeof a == "number") {
                        b = Number(b);
                    } else if (typeof a == "string") {
                        b = b.toLowerCase();
                    }
                    if (orEqual) {
                        if (a < b) return false;
                    } else {
                        if (a <= b) return false;
                    }
                    continue;
                } else if (stringB.charAt(0) == "<") {
                    var orEqual = false;
                    if (stringB.charAt(1) == "=") {
                        orEqual = true;
                        b = b.substring(2);
                    } else {
                        b = b.substring(1);
                    }
                    if (typeof a == "number") {
                        b = Number(b);
                    } else if (typeof a == "string") {
                        b = b.toLowerCase();
                    }
                    if (orEqual) {
                        if (a > b) return false;
                    } else {
                        if (a >= b) return false;
                    }
                    continue;
                } else if (stringB.charAt(0) == "!") {
                    b = b.substring(1);
                    if (typeof a == "number") {
                        b = Number(b);
                    } else if (typeof a == "string") {
                        b = b.toLowerCase();
                    }
                    var invert = true;
                }
            }
            if (b == w) {
                if (invert) return false;
                else continue;
            }
            if (dojo.isString(a) && dojo.isString(b)) {
                if (b.charAt(b.length - 1) == w) {
                    b = b.slice(0, -1);
                    matchEnd = false;
                }
                a = a.toLowerCase();
                b = b.toLowerCase();

                var matchIndex = a.indexOf(b);
                var isMatch = true;
                // No match at all
                if (matchIndex == -1) {
                    isMatch = false;
                }
                // Need to match both start and end, and the strings are not equal
                else if (matchStart && matchEnd && a != b) {
                    isMatch = false;
                }
                // Need to match the start, end is "*", and matchIndex starts is not zero then it fails
                else if (matchStart && !matchEnd && matchIndex > 0) {
                    isMatch = false;
                }
                // Need to match the end, but not the start, then matchIndex can be anything, but the
                // ends must be equivalent
                else if (!matchStart && matchEnd && a.lastIndexOf(b) + b.length != a.length) {
                    isMatch = false;
                }
                if (invert) isMatch = !isMatch;
                if (!isMatch) return false;
            } else if (a !== b) {
                if (invert) continue;
                else return false;
            } else if (invert) {
                return false;
            }
        }
        return true;
    },

    //===========================================================================
    // Update Messaging
    //===========================================================================
    dataRootChanged: function() {
        if (this._subNard || !this.owner) return;
        // find first owner after root and send change message on that.
        // this should trigger rule #3 for bindings.
        var o = this.owner,
            p, root = this.getRoot();
        while (o && o != root) {
            p = o;
            o = o && o.owner;
        }
        var n = p ? p.getRuntimeId() : this.getRuntimeId();
        var topic = n + "-rootChanged";
        wm.logging && console.group("<== ROOTCHANGED [", topic, "] published by Variable.dataRootChanged");
        dojo.publish(topic, [n]);

        var root = this.getRoot().getRuntimeId();
        if (root && root.indexOf(".") && n.indexOf(root) == 0) {
            var tmpn = n.substring(root.length);
            tmpn = root.substring(root.lastIndexOf(".") + 1) + tmpn;
            var topic2 = tmpn + "-rootChanged";
            if (topic2 != topic) {
                wm.logging && console.group("<== ROOTCHANGED [", topic2, "] published by Variable.dataRootChanged");
                dojo.publish(topic2, [n]);
            }
        }
        wm.logging && console.groupEnd();
    },
    dataOwnerChanged: function() {
        if (this._updating || !this.owner) return;
        var n = this.getRuntimeId();
        if (!n) return;
        var topic = n + "-ownerChanged";
        wm.logging && console.group("<== OWNERCHANGED [", topic, "] published by Variable.dataOwnerChanged");
        dojo.publish(topic, [n]);

        var root = this.getRoot();
        if (!root) return;
        var rootId = root.getRuntimeId();
        while(rootId && rootId.indexOf(".") && n.indexOf(rootId) == 0) {
            var tmpn = n.substring(rootId.length);
            tmpn = rootId.substring(rootId.lastIndexOf(".") + 1) + tmpn;
            var topic2 = tmpn + "-ownerChanged";
            if (topic2 != topic) {
                wm.logging && console.group("<== ROOTCHANGED [", topic2, "] published by Variable.dataRootChanged");
                dojo.publish(topic2, [n]);
                rootId = tmpn;
            } else {
                break;
            }
        }

        wm.logging && console.groupEnd();
        //
        // send root changed message
        if (this._allowLazyLoad) this.dataRootChanged();
        //
        var v = this.getCursorItem();
        for (var i in v.data) {
            wm.fire(v.data[i], "dataOwnerChanged");
        }
    },
    dataChanged: function() {
        if (this._updating || !this.owner) return;
        var id = this.getRuntimeId();
        if (!id) return;

        var topic = [id, "-changed"].join('');
        wm.logging && console.group("<== CHANGED [", topic, "] published by Variable.dataChanged");
        dojo.publish(topic, [this]);

        var root = this.getRoot();
        if (!root) return;
        var rootId = root.getRuntimeId();
        if (rootId && rootId.indexOf(".") && id.indexOf(rootId) == 0) {
            var tmpn = id.substring(rootId.length);
            tmpn = rootId.substring(rootId.lastIndexOf(".") + 1) + tmpn;
            var topic2 = tmpn + "-changed";
            if (topic2 != topic) {
                wm.logging && console.group("<== ROOTCHANGED [", topic2, "] published by Variable.dataRootChanged");
                dojo.publish(topic2, [this]);
            }
        }



        // Rule: change notification is propagated up through owners
        // propagate change up only if this is a subNard.
        if (this._subNard) wm.fire(this.owner, "dataChanged");
        wm.logging && console.groupEnd();
    },
    updatePermanentMemory: function() {
        /* Don't update permanent memory with values set while loading the page; these
         * are unlikely to be provided as a result of dynamic user or service based calls
         */
        var ownerPage = this.getParentPage();
        if (ownerPage && ownerPage._loadingPage) return;

        if (window["PhoneGap"] && this.saveInPhonegap) {
            var datatext = dojo.toJson(this.getData());
            window.localStorage.setItem(this.getRuntimeId(), datatext);
        } else if (this.saveInCookie) {
            var datatext = dojo.toJson(this.getData());
            dojo.cookie(this.getRuntimeId(), datatext);
        }
    },
    // id-based notification
    dataValueChanged: function(inProp, inValue) {
        if (!this._updating && this.owner) {
            // Can't simply call valueChanged; see note below.
            wm.Component.prototype.valueChanged.call(this, inProp, inValue);
            this.notify();
            this.updatePermanentMemory();
        }
    },
    // id-based notification
    valueChanged: function(inProp, inValue) {
        if (!this.type || this.type == this.declaredClass) return; // if it doesn't yet have any type information, then nobody wants to listen to changes to this component

        // Code exists to deal with collisions between component props and data props in this class.
        // However, the distinction is lost in change notifications. Likely, data props should have
        // special ids to distinguish them. Until then, we simply avoid sending change notification
        // for properties when there is a collision.
        if (!this.isDataProp(inProp))
            this.inherited(arguments);
    },
    //===========================================================================
    // Referencing
    //===========================================================================
    /*
    setDataSet: function(inDataSet) {
        this.dataSet = "";
        if (inDataSet instanceof wm.Variable) {
                this.setType(inDataSet ? inDataSet.type : "wm.Variable", true);
            this.dataSet = inDataSet;
            this.cursor = inDataSet.cursor;
        }
        this.setData(inDataSet);
    },
    */
        getDataSet: function() {
        return this.dataSet || this;
/*
        if (this.dataSet) return this.dataSet;
        else if (!this._isDesignLoaded)
        return this;
        */
    },
    //===========================================================================
    // Property API
    //===========================================================================
    _isVariableProp: function(inPropName) {
        var typeInfo = this._dataSchema[inPropName];
        return Boolean(typeInfo && (typeInfo.isList || wm.typeManager.isStructuredType(typeInfo.type)));
    },
    isDataProp: function(inProp) {
        return inProp in this._dataSchema;
    },
    _getValue: function(inProp) {
        return this.isDataProp(inProp) ? this._getDataValue(inProp) : this.inherited(arguments);
    },
    _setValue: function(n, v) {
        // if setting to default, then don't do data setting
        if ((this._isDesignLoaded && this.schema[n]||0).defaultBindTarget || !this.isDataProp(n))
            this.inherited(arguments);
        else
            this._setDataValue(n, v);
    },
    //===========================================================================
    // Data Marshalling / Lazy Loading
    //===========================================================================
    createVariable: function(inProps, inPropName) {
        if ((window["studio"] || djConfig.isDebug) && inProps.type && !wm.typeManager.getType(inProps.type)) {
        app.toastWarning("A variable of type " + inProps.type + " has been created, but that type does not exist");
        }
        inProps._temporaryComponent = 1;
        if (!inProps.name) {
        inProps.name = this._uniqueSubnardId;
        this._uniqueSubnardId++;
        }
        var v = new wm.Variable(inProps);
        v.owner = this;
        return v;
    },
    marshallVariable: function(inPropName, inTypeInfo, inVariable) {
        var
            p = inPropName, v = inVariable,
            t = inTypeInfo.isList ? '[' + inTypeInfo.type + ']' : inTypeInfo.type;
        if (!(v instanceof wm.Variable)) {
            v = this.createVariable({name: p, type: t, _subNard: true}, p);
            if (inVariable || inVariable === null) {
                v.beginUpdate();
                v.setData(inVariable);
                v.endUpdate();
            }
        }
        // lazy load!
        if (v._isStub() && this.canLazyLoad(inTypeInfo)) {
            this.beginUpdate();
                this.lazyLoadData(p, v);
            this.endUpdate();
        }
        return v;
    },
    _isStub: function() {
        if (!this._nostub && !this._isNull /*&& (!this.isList || !this.hasList())*/) {
            // stub if there is no data
            if (this.data === undefined)
                return true;
            // stub if we're a list and there's no list data
            if (this.isList || this.hasList())
                return !this.data._list || !this.data._list.length;
            // optionally treat as stub if there is any data v. if there is missing data
            // stub if dont' have data for any property not structured / list
            if (this._greedyLoadProps) {
                var schema = this._dataSchema, s;
                for (var i in schema) {
                    s = schema[i];
                    if (!s.isList && (this.data[i] === undefined)
                        && !wm.typeManager.isStructuredType(s.type))
                        return true;
                }
            // stub if we have no data
            } else if (wm.isEmpty(this.data))
                return true;
        }
        this._nostub = true;
        return false;
    },
    lazyLoadData: function(inPropName, inVariable) {
        var s = wm.getRuntimeService(this), v = inVariable;
        try{
            if (s.ready) {
                var d = this.getData();
                if (!wm.isEmpty(d)) {
                    var args = [null, this.type, d, {properties: [inPropName]}];
                    wm.logging && console.log("lazyLoad", inVariable.owner && inVariable.owner.getId(), args);
                    var f = function(r) {
                      var propData = r && r[inPropName];
                      if (propData) {
                        v.beginUpdate();
                        v.setData(propData);
                        v.endUpdate();
                      }
                    }

                    // NOTE: Default is that async doesn't have a value; this feature seems unreliable so far so don't use
                    var d;
                    if (this.async) {
                      d = s.requestAsync("read", args);
                    } else {
                        d = s.requestSync("read", args);
                    }
                    d.addCallback(dojo.hitch(this, function() {
                    f();
                    }));

                };
            }
        }catch(x){}
    },
    canLazyLoad: function(inTypeInfo) {
        if (this._updating || !wm.typeManager.getLiveService(inTypeInfo.type))
            return;
        // FIXME: prevent lazy loading if livelayout is not ready
        // reference to studio especially bad.
        if (this.isDesignLoaded() && !studio.isLiveLayoutReady())
            return false;
        var o = this;
        // if this variable or any owner does not allow lazy loading then cannot lazy load!
        while (o instanceof wm.Variable) {
            if (!o._allowLazyLoad || wm.disableLazyLoad)
                return false;
            o = o.owner;
        }
        // lazy load if the type is a list or we have required data to read.
        return inTypeInfo.isList || this._hasRequiredReadData();
    },
    // check our schema and data to see if
    // we have all necessary data that is required
    // for the lazy load "read" operation
    _hasRequiredReadData: function() {
        var ds = this._dataSchema, s, d;
        for (var i in ds) {
            s = ds[i];
            if (s.include && dojo.indexOf(s.include, "read") > -1) {
                d = this.data[i];
                if (d === undefined || d === null)
                    return false;
            }
        }
        return true;
    },

    toString: function(inText) {
    var t = inText || "";
    var isEmpty =  this.isEmpty();
    t += "; " + wm.getDictionaryItem("wm.Variable.toString_TYPE", {type: this.type}) + "; " + wm.getDictionaryItem("wm.Variable.toString_ISEMPTY", {isEmpty: isEmpty});
    return this.inherited(arguments, [t]);
    },
    _end: 0
});

// FIXME: variable should have a data loader which can optionally have a liveView.
// A difficulty is that liveView is responsible both for data to load and storing field info
// that can be used to create ui.
// The issue is made worse by the need to copy variables (and associated liveViews)
// extension to extend Variable to load data with a liveView
wm.Variable.extend({
    _includeListProps: false,
    createVariable: function(inProps, inPropName) {
        inProps = inProps || {};

        if ((window["studio"] && this.isDesignLoaded() || !window["studio"] && djConfig.isDebug) && inProps.type && !this._dataSchema) {
        app.alert(wm.getDictionaryItem("wm.Variable.TYPE_INVALID", {type: inProps.type.replace(/[\[\]]/g,""), name: this.getRuntimeId()}));
        }
        if (!inProps.name) {
        inProps.name = this._uniqueSubnardId;
        this._uniqueSubnardId++;
        }

            inProps._temporaryComponent = 1;
        inProps.liveView = this.liveView;
        var r = this._rootField, n = inPropName;
        inProps._rootField = r && inPropName ? r + "." + inPropName : (inPropName || "");
        var v = new wm.Variable(inProps);
        //v.owner = this;
            v.setOwner(this, true);
        return v;
    },
    setDataSet: function(inDataSet) {
        this.dataSet = "";
        if (inDataSet instanceof wm.Variable) {
            this._rootField = inDataSet._rootField || "";
                if (inDataSet.liveView) {
                this.setLiveView(inDataSet.liveView);
            }
                this.setType(inDataSet ? inDataSet.type : "wm.Variable", true);
            this.dataSet = inDataSet;
            this.cursor = inDataSet.cursor;
        }
        this.setData(inDataSet);
    },
    _getEagerProps: function(inVariable) {
        var
            v = inVariable,
            props = this.liveView ? this.liveView.getSubRelated(v._rootField) : [],
            schema = wm.typeManager.getTypeSchema(v.type);
        return this._includeListProps ? props :
            dojo.filter(props, function(r) {
                return !wm.typeManager.isPropInList(schema, r);
            });
    },
    _getLoadProps: function(inPropName, inVariable) {
        return [inPropName].concat(dojo.map(this._getEagerProps(inVariable), function(r) {
            return [inPropName, r].join(".");
        }));
    },
    // FIXME: avoid sync request
    lazyLoadData: function(inPropName, inVariable) {
        var s = wm.getRuntimeService(this), v = inVariable;
        try{
            if (s.ready) {
                var d = this.getData();
                if (!wm.isEmpty(d)) {
                    var
                        //props = this.liveView ? this._getLoadProps(inPropName, v) : inPropName,
                                props = this._getLoadProps(inPropName, v),
                        args = [null, this.type, d, {properties: props}];
                    //console.log("lazyLoad", this.getId(), args);
                    wm.logging && console.log("lazyLoad", inVariable.owner && inVariable.owner.getId(), args);

                    var f = function(r) {
                      var propData = r && r[inPropName];
                      if (propData) {
                        v.beginUpdate();
                        v.setData(propData);
                        v.endUpdate();
                      }
                    }

                    if (this.async) {
                      s.requestAsync("read", args, f);
                    } else {
                      s.requestSync("read", args);
                      f(s.result);
                    }


                    // FIXME: non-sync, need to protect against multiple requests?
                    // create a queue of requests?
                    /*if (!this._inflight) {
                        var def = s.requestAsync("read", args);
                        this._inflight = true;
                        def.addBoth(dojo.hitch(this, function(r) {
                            this._inflight = false;
                            return r;
                        }));
                        def.addCallback(dojo.hitch(this, function(r) {
                            var propData = r && r[inPropName];
                            if (propData) {
                                v.beginUpdate();
                                v.setData(propData);
                                v.endUpdate();
                                console.log("got data!", "notify!", this.getId(), this._updating);
                                this.owner.notify();
                            }
                            return r;
                        }));
                    }*/
                }
            }
        }catch(x){
            wm.logging && console.log("Failed to lazy load.", args);
        }
    },
    setLiveView: function(inLiveView) {
        this.liveView = inLiveView;
    },
    getViewType: function() {
        return this.liveView  && this.liveView.getSubType(this._rootField);
    },
    getViewFields: function() {
        return (this.liveView && this.liveView.getSubView(this._rootField)) || [];
    },
    getViewListFields: function() {
        return (this.liveView && this.liveView.getListView(this._rootField)) || [];
    },
    getViewRelated: function() {
        return (this.liveView && this.liveView.getSubRelated(this._rootField)) || [];
    }
});



/**#@- @design */

if (0) {
/******
 * this extends wm.Variable to implement the dojo.data.api.Read APIs
 ******/
wm.Variable.extend({
    /* http://dojotoolkit.org/reference-guide/dojo/data/api/Read.html#dojo-data-api-read */
    getFeatures: function() {
    return {
        "dojo.data.api.Read": true
    };
    },

    /*
     * this getValue violates the dojo.data API by not throwin exceptions if inItem is not an item or inAttribute is not a string.
     * Violation is because getValue calls this.inherited in if its not an item
     */
    getValue: function(inItem, inAttribute, defaultValue) {
    if (this.isItem(inItem)) {
        /* This works, but as soon as we get a new dataset from the server, or if the user sorts the variable,
         * all IDs change, so really this is bad
         */
        if (inAttribute == "_id") {
        return inItem.getIndexInOwner();
        }
        console.log(inItem);
        console.log(inAttribute);
        var result = inItem.getValue(inAttribute);
        if (result === undefined)
        result = defaultValue;
        return result;
    } else {
        return this.inherited(arguments);
    }
    },
    getValues: function(inItem, inAttribute) {
    if (this.isItem(inItem) && typeof inAttribute == "string") {
        var result = this.getValue(inItem, inAttribute);
        return [result];
    } else {
        throw "getValues must have a wm.Variable as input; and inAttribute must be a String; perhaps you want getValue?";
    }
    },
    getAttributes: function(inItem) {
    if (this.isItem(inItem)) {
        var type = wm.typeManager.getType(inItem.type);
        var result = [];
        if (type && type.fields) {
        for (var field in type.fields) {
            result.push(field);
        }
        }
        if (!this.identity) {
        result.push("_id");
        }
        return result;
    } else {
        throw "getAttribute must have a wm.Variable as an input";
    }
    },

    hasAttribute: function(inItem, inAttribute) {
    if (this.isItem(inItem) && typeof inAttribute == "string") {
        var value = inItem.getValue(inItem, inAttribute);
        return !(value === undefined || value === null);
    } else {
        throw "getValues must have a wm.Variable as input; and inAttribute must be a String.";
    }
    },

    containsValue: function(inItem, inAttribute, inValue) {
    var values = this.getValues(inItem, inAttribute);
    return dojo.indexOf(values, inValue) != -1;
    },


    isItem: function(inItem) {
    return inItem instanceof wm.Variable;
    },

    /* This is just a placeholder and is not yet implemented */
    isItemLoaded: function(inSomething) {
    return false;
    },

    /* This is just a placeholder and is not yet implemented */
    loadItem: function(keywordArgs) {
    return null;
    },


    /* This method was copied from the basic parts of ItemFileReadStore.js _fetchItems method;
     * I've stripped out the regex stuff which while very cool, would not typically be used and slow things down
     */
    _fetchItems: function(  /* Object */ requestArgs,
    /* Function */ findCallback,
    /* Function */ errorCallback){
    //  summary:
    //      See dojo.data.util.simpleFetch.fetch()

    var opts = requestArgs.queryOptions;
    var items = [];
    var i, key;
    if(requestArgs.query){
        /* Uncomment out the regex stuff if we ever have a need for it; this is dojo's code, probably good, but
         * not needed, and therefore just slows things down
        var value,
        ignoreCase = requestArgs.queryOptions ? requestArgs.queryOptions.ignoreCase : true;
        //See if there are any string values that can be regexp parsed first to avoid multiple regexp gens on the
        //same value for each item examined.  Much more efficient.
        var regexpList = {};
        for(key in requestArgs.query){
        value = requestArgs.query[key];
        if(typeof value === "string"){
            regexpList[key] = dojo.data.util.filter.patternToRegExp(value, ignoreCase);
        }else if(value instanceof RegExp){
            regexpList[key] = value;
        }
        }
        */
        var count = this.getCount();
        for(i = 0; i < count; ++i){
        var match = true;
        var candidateItem = this.getItem(i);
        if(candidateItem instanceof wm.Variable == false){
            match = false;
        }else{
            for(key in requestArgs.query){
            value = requestArgs.query[key];
            if(value != "*" && !this._containsValue(candidateItem, key, value, opts)){
                match = false;
            }
            }
        }
        if(match){
            items.push(candidateItem);
        }
        }
        findCallback(items, requestArgs);
    } else {
        // We want a copy to pass back in case the parent wishes to sort the array.
        // We shouldn't allow resort of the internal list, so that multiple callers
        // can get lists and sort without affecting each other.  We also need to
        // filter out any null values that have been left as a result of deleteItem()
        // calls in ItemFileWriteStore.
        var count = this.getCount();
        for(i = 0; i < count; ++i){
        var item = this.getItem(i);
        if(item !== null){
            items.push(item);
        }
        }
        findCallback(items, requestArgs);
    }
    },

    /* This method was copied from the basic parts of ItemFileReadStore.js _fetchItems method;
     * I've stripped out the regex stuff which while very cool, would not typically be used and slow things down
     */
    _containsValue: function(
        /* item */ item,
        /* attribute-name-string */ attribute,
        /* anything */ value,
    /* Hash with queryOptions */ opts){
        //  summary:
        //      Internal function for looking at the values contained by the item.
        //  description:
        //      Internal function for looking at the values contained by the item.  This
        //      function allows for denoting if the comparison should be case sensitive for
        //      strings or not (for handling filtering cases where string case should not matter)
        //
        //  item:
        //      The data item to examine for attribute values.
        //  attribute:
        //      The attribute to inspect.
        //  value:
        //      The value to match.
        //  opts
        //      The query options; supports exactMatch, ignoreCase; later on should have startsWith, contains and endsWith
        var svalue = String(value);
        var itemvalue = item.getValue(attribute);
        var sitemvalue = String(itemvalue);
        if (value === itemvalue) return true; // quick test...

        if (opts.ignoreCase) {
        if (svalue.toLowerCase() === sitemvalue.toLowerCase())
            return true;
        }

        if (!opts.exactMatch) {
        if (svalue.indexOf(sitemvalue) != -1)
            return true;
        }
        return false;
    },


    // no-op
    close: function(inRequestToClose) {},

    // Before getLabel does more than return undefined, we'll need to decide users should get displayField/displayExpression properties
    getLabel: function(inItem) {
    if (this.displayField) {
        return inItem.getValue(this.displayField);
    } else if (this.displayExpression) {
        return wm.expression.getValue(this.displayExpression, inItem, this.getRoot());
    } else {
        return undefined;
    }
    },


    getLabelAttributes: function(inItem) {
    if (this.displayField) {
        return [this.displayField];
    } else if (this.displayExpression) {
        var results = this.displayExpression.match(wm.expression._getSourceRegEx);
        for (var i = 0; i < results.length; i++) {
        results[i] = results[i].substring(2, results[i].length-1);
        }
        return results;
    } else {
        return this.getAttributes();
    }
    },
    _end: 0
});
// uncomment this when ready to use wm.Variable as a dojo.store: dojo.extend(wm.Variable,dojo.data.util.simpleFetch); // adds in the fetch call


/******
 * this extends wm.Variable to implement the dojo.data.api.Identity APIs
 ******/
wm.Variable.extend({
    getFeatures: function() {
    return {
        "dojo.data.api.Read": true,
        "dojo.data.api.Identity": true
    };
    },
    getIdentity: function(inItem) {
    if (this.identity)
        return inItem.getValue(this.identity);
    else
        return inItem.getIndexInOwner();
    },

    getIdentityAttributes: function(inItem) {
    if (this.identity) {
        return [this.identity];
    } else {
        return ["_id"];
    }
    },

    fetchItemByIdentity: function(/* object */ keywordArgs){
    var item = this.getItem(keywordArgs.identity);
    if (item) {
        keywordArgs.onItem.call(keywordArgs.scope || dojo.global, item, keywordArgs);
    } else {
        keywordArgs.onError.call(keywordArgs.scope || dojo.global, keywordArgs);
    }
    },
    _end: 0
});





wm.Variable.extend({
    forEachItem: function(callback, options) {
    if (!options)
        option = {count: 0,
              stopOnTrue: false};
    var stopOnTrue = options.stopOnTrue;
    var count = this.getCount();
    for (var i = options.start || 0; i < count; i++) {
        var item = this.getItem(i);
        if (callback(item) && stopOnTrue) {
        return;
        }
    }
    },
    get: function(id) {
    var keys = this.primaryKeyFields.split(/\s*,\s*/);
    var query = {};
    if (keys.length == 0)
        return null;
    for (var i = 0; i < keys.length; i++) {
        if (id instanceof wm.Variable) {
        query[keys[i]] = id.getValue(keys[i]);
        } else if (id !== null && typeof id == "object") {
        query[keys[i]] = id[keys[i]];
        } else {
        query[keys[i]] = id;
        }
    }
    return this.query(query, {limit: 1}).matches[0];
    },

    query: function(query, options){
    var results = [];

    var compareFields = function(val1, val2, options) {
        if (options.ignoreCase) {
        val1 = val1.toLowerCase();
        val2 = val2.toLowerCase();
        }
        if (val1 == val2)
        return true;
        else if (!options.exactMatch && typeof val1 == "string" && val1.indexOf(val2) == 0)
        return true;
        return false;
    };

    this.forEachItem(
        function(item) {
        for (key in query) {
            var value = query[key];
            if (value instanceof wm.Variable) {
            value = value.getValue(query[key]);
            } else if (value != null && typeof value == "object") {
            value = value[query[key]];
            }
            if (!compareFields(value, item.getValue(query[key]), options))
            return false;
        }
        result.push(item);
        return options.count ? result.length < options.count : false;
        },
        {stopOnTrue: true, start: options.start || 0}
    );
    return {total: result.length,
        matches: result,
        forEach: function(callback, thisobj) {
            return dojo.forEach(results, callback, thisobj);
        },
        filter: function(callback, thisobj) {
            return dojo.filter(results, callback, thisobj);
        },
        map: function(callback, thisobj) {
            return dojo.map(results, callback, thisobj);
        }
           };
    },
    put: function(data, options) {
    this.addItem(data);
    },
    remove: function(id) {
    var item = this.get(id);
    if (item) {
        var index = this.getItemIndex(item);
        if (index != -1)
        this.removeItem(index);
    }
    },
    getIdentity: function(item) {
    var keys = this.primaryKeyFields.split(/\s*,\s*/);
    var result = "";
    for (var i = 0; i < keys.length; i++) {
        if (result) result += "|";
        result += item.getValue(keys[i]);
    }
    return result;
    },
    getChildren: function(item) {
    var result = [];
    var schema = this._dataSchema;
    for (var i in schema) {
        var s = schema[i];
        if (s.isList || wm.typeManager.isStructuredType(s.type)) {
        result.push(item.getValue(i));
        }
    }
    return {total: result.length,
        matches: result,
        forEach: function(callback, thisobj) {
            return dojo.forEach(results, callback, thisobj);
        },
        filter: function(callback, thisobj) {
            return dojo.filter(results, callback, thisobj);
        },
        map: function(callback, thisobj) {
            return dojo.map(results, callback, thisobj);
        }
           };
    }

});
}