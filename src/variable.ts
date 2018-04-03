/*
 * Copyright (c) 2018. Christoph Rodak  (https://reactivechart.com)
 */

import node, {IReactiveNode} from "./node";
import {extend} from "@reactivelib/core";

function stdComparator(oldObj: any, newObj: any){
    return oldObj === newObj;
}

function numericComparator(oldObj: number, newObj: number){
    if (isNaN(oldObj) && isNaN(newObj)) {
        return true;
    }
    return oldObj === newObj;
}


/**
 * Just an object with a mutable value.
 */
export interface IVariable<E>{
    value: E;
}

/**
 * A reactive variable is a an object that holds a value. When listeners of other reactive objects
 * read the value, they will be triggered whenever the value of this variable is changed.
 */
export interface IReactiveVariable<E> extends IVariable<E>{
    $r: IReactiveNode;

    /**
     * Installs a reactive listener that will execute whenever the value of the variable changes.
     * @param {(variable: "@reactivelib/reactive".variable.IVariable<E>) => void} listener The listener
     */
    listener(listener: (variable: IVariable<E>) => void);

    /**
     * Like "listener" function, but will not execute until the first the time "value" of this variable is read.
     * @param {(v: "@reactivelib/reactive".variable.IVariable<E>) => void} listener
     * @returns {"@reactivelib/reactive".variable.IVariable<E>}
     */
    lazy(listener: (v: IVariable<E>) => void): IVariable<E>;

    /**
     * Equivalent to calling "listener" with null. Will remove any listeners installed.
     */
    cancel();

    /**
     * Forces an reexecution of the variable listener
     */
    update();
}

class Variable<E> implements IReactiveVariable<E>{

    public $r = node();
    public objectComparator: (a: E, b: E) => boolean;

    constructor(private _value: E){

    }

    public comparator(comparator: (a: E, b: E) => boolean): Variable<E>{
        this.objectComparator = comparator;
        return this;
    }

    public numeric(){
        this.comparator(<any>numericComparator);
        return this;
    }

    public update(){
        this.$r.update();
    }

    public listener(listener: (v: Variable<E>) => void){
        this.$r.listener(() => listener(this));
        return this;
    }

    cancel(){
        this.$r.cancel();
    }

    public lazy(listener: (v: Variable<E>) => void){
        Object.defineProperty(this, "value", {
            get: function(){
                delete this.value;
                this.listener(listener);
                return this.value;
            },
            enumerable: true,
            configurable: true
        });
        return this;
    }

    get value(){
        this.$r.observed();
        return this._value;
    }

    set value(v){
        this.$r.changed();
        if (!this.objectComparator(this._value, v)) {
            this._value = v;
            this.$r.dirty();
        }
    }

    public valueOf(){
        return this.value;
    }

};

Variable.prototype.objectComparator = stdComparator;

/**
 *
 * @param val
 * @returns {any}
 */
export function transform(val: any) {
    if (val instanceof Variable) {
        return val;
    }
    return variable(val);
}

export function listener<E>(listener: (v: IReactiveVariable<E>) => void): IReactiveVariable<E> {
    return variable<E>(null).listener(listener);
}

/**
 * Creates a new reactive variable with a reactive listener that will set the value of the variable
 * to whatever is returned by the given function
 * @param {() => E} func The function calculating the value of the variable
 * @returns {IReactiveVariable<E>}
 */
export function fromFunction<E>(func: () => E): IReactiveVariable<E>{
    return listener<E>(function(variable){
        variable.value = func();
    });
}

var defaultPropertyOptions = {
    configurable: true,
    enumerable: true
};

/**
 * Creates a new reactive property for the given object with the given name.
 * @param object
 * @param {string} name
 * @param {IVariable<any>} variable
 * @param options
 */
export function defineProperty(object: any, name: string, variable: IVariable<any>, options?: any) {
    if (options === void 0) { options = {}; }
    var opts = extend({}, defaultPropertyOptions, options, {
        get: function () {
            return variable.value;
        },
        set: function (s: any) {
            variable.value = s;
        }
    });
    Object.defineProperty(object, name, opts);
}

/**
 * Transforms the given properties of the given object into "reactive properties". E.g.:
 *
 * ```javascript
 * var object = {
 *  a: 1
 * }
 * variable.transformProperties(object, ["a"])
 * ```
 *
 * Is equivalent to the following:
 *
 *
 * ```javascript
 * * var a = variable(1);
 * var object = {
 *  get a(){
 *      return a.value;
 *  },
 *  set a(v){
 *      a.value = v;
 *  }
 * }
 * ```
 *
 *
 *
 * @param object The object to transform
 * @param {string[]} names The property names to transform
 * @returns {any} The given object
 */
export function transformProperties(object: any, names: string[] = null) {
    if (!names){
        names = [];
        for (var name in object) {
            names.push(name);
        }
    }
    for (var i = 0; i < names.length; i++) {
        var name = names[i];
        var val = object[name];
        defineProperty(object, name, variable(val));
    }
    return object;
}

export function createJustInTimeProperty(create:() => any, object: any, name: string, customDefine: () => void = null): any{
    Object.defineProperty(object, name, {
        get: function(){
            var prop = create();
            if (customDefine){
                customDefine();
            }
            else {
                Object.defineProperty(this, name,{
                    value: prop
                });
            }
            return prop;
        },
        configurable: true
    });
    return object;
}


export function variable<E>(value: E): IReactiveVariable<E>{
    return new Variable<E>(value);
}

export default variable;