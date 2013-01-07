var $proto = (function () {
    "use strict";
    /*****************************
 Rob Wagner 2012
******************************/
    // What we have here are functions that allow you to make prototypical inheritance without the new operator.  Not sure there is any advantage to this but it was a mental exercise.  

  // this is a utility function to clone an object.  Functions are the only things that will become a reference.
	function copyObject(prop) {
		if (Object.prototype.toString.call( prop )!=='[object Object]' && 
			Object.prototype.toString.call( prop )!=='[object Array]') {
				return prop;
		}
		var newprop,
			i,
			n; 
		if( Object.prototype.toString.call( prop ) === '[object Array]' ) {
			newprop=[];
			n=prop.length;
			for (i=0;i<n;i++) {
				if (typeof prop[i]==='object') { newprop[i]=copyObject(prop[i]); }
				else { newprop[i]=prop[i]; }
			}
		}
		else {
			newprop={};
			for (i in prop) {
				if (prop.hasOwnProperty(i)) {
					if (typeof prop[i]==='object') { newprop[i]=copyObject(prop[i]); }
					else { newprop[i]=prop[i]; }	
				}
			}
		}
	
		return newprop;
	}
    //	this is a utility function that returns an object of prototypes merged.  This way you don't end up having a long prototype chain.  If a function already exists it becomes a 'parent' property and a flag and string are set: childFunction.hasParent=1 and childFunction.explainParent=function() {...}.  Thus you can check if and what you might be overriding and call the parent version if needed: childFunction.parent() or childFunction.parent.parent() etc...

    //function extendProtoObject(child,parent,grandparent...)
    function extendProtoObject() {
        var o = arguments[0],
            n = arguments.length;
        for (var i = 1; i < n; i++) {
            var s = arguments[i];
            for (var k in s) {
                if (k !== 'prototype') {
                    switch (typeof o[k]) { 
                        case 'function':
                            o[k].hasParent = 1;
                            o[k].explainParent = s[k].toString();
                            o[k].parent = s[k];
                            break;
                        case 'undefined':
                            o[k] = s[k];
                            break;
                    }
                }
            }
        }
        return o;
    }


    // You can add traits (helper functions) using this function
    // objects maked automatically get an .addTrait method that points to this function i.e.
    //  mammal.addTrait(TraitActions);
    // similliarly to the extendProtoObject function above, if both the object and trait have object.getX=function then the trait function getX would be accessed through object.getX.trait.
    // Non function properties with the same name will retain the objects version.
    //  To avoid any name collision you could instead do the following
    //  mammal.action = makeObjectFromAbstract(TraitActions);
    //  now mammal can access action functions and properties through mammal.action.function

    function addTrait(trait) {
        if (typeof this === 'undefined') {
            return null;
        }
        var t = makeObjectFromAbstract(trait);
        for (var k in t) {
            if (k !== 'prototype') {
                switch (typeof this.prototype[k]) {
                    case 'function':
                        this.prototype[k].hasTrait = 1;
                        this.prototype[k].explainTrait = t[k].toString();
                        this.prototype[k].trait = t[k];
                        break;
                    case 'undefined':
                        this.prototype[k] = t[k];
                        break
                }
            }
        }
    }
    // This function returns a Proto Object from the abstract prototype function it is passed 

    function makeProtoObjectFromAbstract(func, makeParentObject, selfCalled) {
        var F = function () {
            func.call(this);
            return this;
        },
        newobj,
        obj = Object.create({});
        F.call(obj);
        if (obj.parent && makeParentObject) { // merge in the parent abstract
            obj = extendProtoObject(
            obj,
            makeProtoObjectFromAbstract(obj.parent, true, true));

        }
        return obj;

    }

    // This function returns a new Object ready to use makeChild and makeInstance methods below on
    function makeObjectFromAbstract(func, makeParentObject /* = true */ , selfCalled) {
        if (typeof makeParentObject === 'undefined') {
            makeParentObject = true;
        }
        var tmpobj = makeProtoObjectFromAbstract(func, makeParentObject, false),
            newobj;
        tmpobj.addTrait = addTrait; // give object a reference to addTrait function
        newobj = Object.create(tmpobj);
        newobj.prototype = tmpobj;
        return newobj;
    }

	
    return {


        // this function allows you to make a child object and add methods and properties - no added private variables possible through this function.  It merges the methods argument with the orignal objects prototype using extendProtoObject above and puts properties into the prototype as well.

        makeChild: function child(obj, methods, props) { // extend Proto Object 
            var m = extendProtoObject((methods || {}), obj);
            var o = Object.create(m);
            o.prototype = m;
            if (typeof props === 'object') {
                for (var p in props) {
                    if (props.hasOwnProperty(p)) {
                        o.prototype[p] = props[p];
                    }
                }
            }

            return o;
        },
        //  makes instances of your concrete object.  It clones the Proto Object and adds any properties supplied.  The end product is an object with all of it's inherited methods and properties in it's prototype and only properties unique to it assigned directly
        makeInstance: function instance(obj, props) {
			var p, proto={};
			for (p in obj.prototype) { 
				if (obj.prototype.hasOwnProperty(p)) {
					if (typeof obj.prototype[p]==='function') {
						proto[p]=obj.prototype[p];
					}
					else { 
						if (!props[p]) { props[p]=obj.prototype[p]}
					}
				}
			}
            var o = Object.create(proto);
            o.prototype = proto;
            if (typeof props === 'object') {
                for (var p in props) {
                    if (props.hasOwnProperty(p)) {							
                        o[p] = copyObject(props[p]);
                    }
                }
            }
            return o;
        },
        // this is a  function that takes two objects, merges their prototypes and returns the new object

        mergeProtoObjects: function mergeProtoObject(obj1, obj2) {
            var p = extendProtoObject(obj1, obj2),
                newobj = Object.create(p);
            newobj.prototype = p;
            return newobj;
        },
        // this is a function to add the trait to a property name of the Proto Objects prototype- i.e. obj.prototype.prop - avoid name collisions this way.
		addTraitToProperty:function addTraitToProperty(obj,trait,prop) {
			obj.prototype[prop]=makeProtoObjectFromAbstract(trait)
	},
        // This function will allow you to  merge 2 abstract prototypes as in:
        // var Human_proto = extendAbstract(AbstractMammal, AbstractHuman);
        // of note is that private variables remain private to each function but child properties will override parent properties with same name i.e. if they both had getX(){return x;} getX() would return child var x
        // Therefore it might be better to make them Proto Objects and then use above mergeProtoObjects

        extendAbstract: function extendAbstract(protoFunc, protoChildFunc) {
            return function () {
                protoFunc.call(this);
                protoChildFunc.call(this);
            };
        },
        makeProtoObjectFromAbstract: makeProtoObjectFromAbstract,
        makeObjectFromAbstract: makeObjectFromAbstract
    }
}());
